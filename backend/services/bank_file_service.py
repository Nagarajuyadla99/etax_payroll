from __future__ import annotations

import hashlib
import logging
import os
import re
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
import tempfile
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.banking_models import BankBranch, BankFileFormat
from models.disbursement_models import PaymentArtifact, SalaryBatch
from models.employee_banking_models import EmployeeBankAccount
from services.disbursement_batch_items import ensure_batch_items_from_payroll
from services.bank_file_plugins.base import BankFileRow
from services.bank_file_plugins.registry import get_bank_file_plugin
from utils.encryption import decrypt_text


ARTIFACT_DIR = Path(os.getenv("BANK_FILE_STORAGE_DIR", "storage/bank_files"))
logger = logging.getLogger("payroll.disbursement")

DEFAULT_CSV_HEADER = "employee_id,account_number,ifsc,amount,account_holder_name"
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")


async def ensure_default_bank_file_format(
    db: AsyncSession,
    *,
    organisation_id: UUID,
) -> BankFileFormat:
    """Create a standard CSV export format when none is configured (dev / first-use)."""
    fmt = BankFileFormat(
        organisation_id=organisation_id,
        bank_code="DEFAULT",
        bank_name="Default",
        name="Standard CSV Export",
        file_type="CSV",
        header_line=DEFAULT_CSV_HEADER,
        is_active=True,
    )
    db.add(fmt)
    await db.flush()
    logger.info("bank_file_format auto_created org_id=%s format_id=%s", organisation_id, fmt.format_id)
    return fmt


async def generate_bank_file_for_batch(
    db: AsyncSession,
    *,
    batch_id: UUID,
    organisation_id: UUID,
    format_id: UUID | None = None,
) -> PaymentArtifact:
    batch_res = await db.execute(
        select(SalaryBatch)
        .options(selectinload(SalaryBatch.items))
        .where(SalaryBatch.batch_id == batch_id, SalaryBatch.organisation_id == organisation_id)
    )
    batch = batch_res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    item_count = await ensure_batch_items_from_payroll(db, batch)
    await db.refresh(batch, attribute_names=["items", "total_employees", "total_amount"])
    logger.info(
        "bank_file batch_prepared batch_id=%s items=%s employees=%s amount=%s",
        batch.batch_id,
        len(batch.items),
        batch.total_employees,
        batch.total_amount,
    )

    if batch.status != "approved":
        logger.warning(
            "bank_file rejected batch_id=%s status=%s (requires approved)",
            batch.batch_id,
            batch.status,
        )
        raise HTTPException(
            status_code=409,
            detail=f"Batch must be fully approved before bank file generation (status={batch.status})",
        )

    if format_id:
        fmt = await db.get(BankFileFormat, format_id)
    else:
        fmt_res = await db.execute(
            select(BankFileFormat)
            .where(BankFileFormat.organisation_id == organisation_id, BankFileFormat.is_active.is_(True))
            .order_by(BankFileFormat.created_at.desc())
        )
        fmt = fmt_res.scalars().first()

    if not fmt:
        fmt = await ensure_default_bank_file_format(db, organisation_id=organisation_id)
    if (fmt.file_type or "").upper() != "CSV":
        raise HTTPException(status_code=400, detail="Only CSV bank file generation is supported in Phase 1")

    payable_items = [i for i in batch.items if i.status in {"pending", "success"} and Decimal(str(i.amount)) > 0]
    if not payable_items:
        raise HTTPException(status_code=400, detail="No payable salary lines for bank file export")

    validation_errors: list[str] = []
    plugin_rows: list[BankFileRow] = []
    file_total = Decimal("0")

    for item in payable_items:
        if not item.employee_bank_account_id:
            validation_errors.append(f"employee {item.employee_id}: missing bank account")
            continue
        acct = await db.get(EmployeeBankAccount, item.employee_bank_account_id)
        if not acct:
            validation_errors.append(f"employee {item.employee_id}: bank account not found")
            continue
        branch = await db.get(BankBranch, acct.bank_branch_id)
        ifsc = ((branch.ifsc_code if branch else "") or "").strip().upper()
        if not ifsc or not IFSC_RE.match(ifsc):
            validation_errors.append(f"employee {item.employee_id}: invalid or missing IFSC ({ifsc or 'empty'})")
            continue

        account_number = decrypt_text(
            acct.account_number_nonce_b64,
            acct.account_number_ciphertext_b64,
            aad=str(acct.employee_id),
            key_version=int(getattr(acct, "key_version", "1") or "1"),
        )
        if not account_number or len(account_number) < 4:
            validation_errors.append(f"employee {item.employee_id}: invalid account number")
            continue

        amt = Decimal(str(item.amount))
        file_total += amt
        plugin_rows.append(
            BankFileRow(
                employee_id=str(item.employee_id),
                account_number=account_number,
                ifsc=ifsc,
                amount=amt,
                account_holder_name=acct.account_holder_name,
                extra={"payment_ref": f"{batch.batch_ref}:{item.employee_id}"},
            )
        )

    if validation_errors:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Bank file validation failed; fix employee banking before export",
                "errors": validation_errors[:50],
                "error_count": len(validation_errors),
            },
        )

    expected_total = sum(Decimal(str(i.amount)) for i in payable_items)
    if file_total != expected_total:
        raise HTTPException(status_code=500, detail="Bank file total mismatch during generation")

    plugin = get_bank_file_plugin(fmt.bank_code)
    build = plugin.build(
        plugin_rows,
        config={
            "header_line": fmt.header_line,
            **(fmt.data_line_config or {}),
        },
    )
    lines = [build.header.rstrip("\n"), *build.lines]
    data_lines = len(build.lines)
    validation_report = build.validation_report
    if data_lines == 0:
        failed = sum(1 for i in batch.items if i.status == "failed")
        pending_no_bank = sum(
            1 for i in batch.items if i.status == "pending" and not i.employee_bank_account_id
        )
        logger.warning(
            "bank_file rejected batch_id=%s reason=no_payable_items total_items=%s failed=%s no_bank=%s payroll_items_built=%s",
            batch.batch_id,
            len(batch.items),
            failed,
            pending_no_bank,
            item_count,
        )
        if len(batch.items) == 0:
            detail = (
                "No salary lines found for this payroll run. "
                "Ensure the payroll run has calculated entries before generating a bank file."
            )
        elif failed or pending_no_bank:
            detail = (
                "No employees with verified primary bank accounts. "
                f"{failed} failed and {pending_no_bank} missing bank details — fix employee banking setup, then retry."
            )
        else:
            detail = "No payable lines available for bank file export."
        raise HTTPException(status_code=400, detail=detail)

    content = "\n".join(lines) + "\n"
    sha256 = hashlib.sha256(content.encode("utf-8")).hexdigest()
    logger.info(
        "bank_file generating batch_id=%s lines=%s path_pending=true",
        batch.batch_id,
        data_lines,
    )

    ver_res = await db.execute(
        select(func.coalesce(func.max(PaymentArtifact.version), 0)).where(
            PaymentArtifact.batch_id == batch.batch_id,
            PaymentArtifact.kind == "bank_file",
        )
    )
    next_version = int(ver_res.scalar_one() or 0) + 1

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"salary_batch_{batch.batch_ref}_{batch.batch_id}_v{next_version}.csv"
    final_path = ARTIFACT_DIR / filename

    # Write to a temp file first; only create DB record if file exists.
    tmp_fd, tmp_path_str = tempfile.mkstemp(prefix="bankfile_", suffix=".tmp", dir=str(ARTIFACT_DIR))
    tmp_path = Path(tmp_path_str)
    try:
        os.close(tmp_fd)
        tmp_path.write_text(content, encoding="utf-8")
        tmp_path.replace(final_path)

        artifact = PaymentArtifact(
            batch_id=batch.batch_id,
            kind="bank_file",
            format="csv",
            version=next_version,
            storage_path=str(final_path.as_posix()),
            sha256=sha256,
            created_at=datetime.now(tz=timezone.utc),
        )
        db.add(artifact)
        await db.flush()
        report_path = final_path.with_suffix(".validation.json")
        report_path.write_text(
            __import__("json").dumps(
                {
                    "batch_id": str(batch.batch_id),
                    "sha256": sha256,
                    "validation_report": validation_report,
                    "row_count": data_lines,
                    "bank_code": fmt.bank_code,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        return artifact
    except Exception:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass
        raise

