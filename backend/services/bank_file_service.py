from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path
import tempfile
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.banking_models import BankFileFormat
from models.disbursement_models import PaymentArtifact, SalaryBatch, SalaryBatchItem
from models.employee_banking_models import EmployeeBankAccount
from models.banking_models import BankBranch
from utils.encryption import decrypt_text


ARTIFACT_DIR = Path(os.getenv("BANK_FILE_STORAGE_DIR", "storage/bank_files"))


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
        raise HTTPException(status_code=400, detail="No active bank file format configured")
    if (fmt.file_type or "").upper() != "CSV":
        raise HTTPException(status_code=400, detail="Only CSV bank file generation is supported in Phase 1")

    lines: list[str] = []
    if fmt.header_line:
        lines.append(fmt.header_line.rstrip("\n"))
    else:
        # sensible default header
        lines.append("employee_id,account_number,ifsc,amount,account_holder_name")

    # build item lines
    for item in batch.items:
        if item.status not in {"pending", "success"}:
            continue
        if not item.employee_bank_account_id:
            continue
        acct = await db.get(EmployeeBankAccount, item.employee_bank_account_id)
        if not acct:
            continue
        branch = await db.get(BankBranch, acct.bank_branch_id)
        ifsc = (branch.ifsc_code if branch else "") or ""

        account_number = decrypt_text(
            acct.account_number_nonce_b64,
            acct.account_number_ciphertext_b64,
            aad=str(acct.employee_id),
            key_version=int(getattr(acct, "key_version", "1") or "1"),
        )

        lines.append(
            f"{item.employee_id},{account_number},{ifsc},{item.amount},{acct.account_holder_name}"
        )

    content = "\n".join(lines) + "\n"
    sha256 = hashlib.sha256(content.encode("utf-8")).hexdigest()

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"salary_batch_{batch.batch_ref}_{batch.batch_id}.csv"
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
            storage_path=str(final_path.as_posix()),
            sha256=sha256,
            created_at=datetime.now(tz=timezone.utc),
        )
        db.add(artifact)
        await db.flush()
        return artifact
    except Exception:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass
        raise

