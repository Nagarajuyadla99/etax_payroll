from __future__ import annotations

import csv
import os
from pathlib import Path

from fastapi.responses import StreamingResponse
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_async_db
from models.reconciliation_models import BankReconciliationEntry, BankStatementImport
from models.reconciliation_v2_models import BankTransaction, ReconciliationException, ReconciliationMatch
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.rbac import require_roles
from services.reconciliation_ops_service import finance_exception_dashboard


router = APIRouter(prefix="/reconciliation", tags=["Reconciliation"])

STATEMENT_DIR = Path(os.getenv("BANK_STATEMENT_STORAGE_DIR", "storage/bank_statements"))


@router.post("/bank-statements/upload", status_code=status.HTTP_201_CREATED)
async def upload_bank_statement(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV bank statements are supported in Phase 1.5")

    STATEMENT_DIR.mkdir(parents=True, exist_ok=True)
    storage_path = STATEMENT_DIR / f"{org_id}_{file.filename}"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    storage_path.write_bytes(content)

    text = content.decode("utf-8", errors="replace")
    rows = list(csv.DictReader(text.splitlines()))

    async with db.begin():
        imp = BankStatementImport(
            organisation_id=org_id,
            uploaded_by=getattr(auth.principal, "user_id", None),
            source="csv",
            original_filename=file.filename,
            storage_path=str(storage_path.as_posix()),
            status="parsed",
            meta={"rows": len(rows)},
        )
        db.add(imp)
        await db.flush()

        for idx, r in enumerate(rows):
            db.add(
                BankReconciliationEntry(
                    organisation_id=org_id,
                    import_id=imp.import_id,
                    row_index=str(idx + 1),
                    txn_date=r.get("date") or r.get("txn_date") or "",
                    description=r.get("description") or r.get("narration") or "",
                    amount=r.get("amount") or r.get("txn_amount") or "",
                    reference=r.get("reference") or r.get("utr") or r.get("ref") or "",
                    recon_status="unmatched",
                    meta={"raw": r},
                )
            )

    return {"import_id": str(imp.import_id), "rows": len(rows), "status": imp.status}


@router.get("/imports")
async def list_imports(
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    res = await db.execute(
        select(BankStatementImport)
        .where(BankStatementImport.organisation_id == org_id)
        .order_by(BankStatementImport.created_at.desc())
    )
    return [
        {
            "import_id": str(i.import_id),
            "source": i.source,
            "original_filename": i.original_filename,
            "status": i.status,
            "meta": i.meta,
            "created_at": i.created_at,
        }
        for i in res.scalars().all()
    ]


@router.get("/imports/{import_id}/transactions")
async def list_transactions(
    import_id: str,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    res = await db.execute(
        select(BankTransaction)
        .where(BankTransaction.organisation_id == org_id, BankTransaction.import_id == import_id)
        .order_by(BankTransaction.row_index.asc())
    )
    return [
        {
            "transaction_id": str(t.transaction_id),
            "row_index": t.row_index,
            "txn_date": t.txn_date,
            "txn_type": t.txn_type,
            "amount": str(t.amount),
            "reference": t.reference,
            "utr": t.utr,
            "description": t.description,
        }
        for t in res.scalars().all()
    ]


@router.get("/imports/{import_id}/exceptions")
async def list_exceptions(
    import_id: str,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    res = await db.execute(
        select(ReconciliationException)
        .where(ReconciliationException.organisation_id == org_id, ReconciliationException.import_id == import_id)
        .order_by(ReconciliationException.created_at.desc())
    )
    return [
        {
            "exception_id": str(e.exception_id),
            "kind": e.kind,
            "severity": e.severity,
            "status": e.status,
            "summary": e.summary,
            "details": e.details,
            "created_at": e.created_at,
        }
        for e in res.scalars().all()
    ]


@router.get("/imports/{import_id}/matches")
async def list_matches(
    import_id: str,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    res = await db.execute(
        select(ReconciliationMatch).where(
            ReconciliationMatch.organisation_id == org_id,
            ReconciliationMatch.transaction_id.in_(
                select(BankTransaction.transaction_id).where(
                    BankTransaction.organisation_id == org_id,
                    BankTransaction.import_id == import_id,
                )
            ),
        )
    )
    return [
        {
            "match_id": str(m.match_id),
            "transaction_id": str(m.transaction_id),
            "provider_payout_id": str(m.provider_payout_id) if m.provider_payout_id else None,
            "salary_batch_item_id": str(m.salary_batch_item_id) if m.salary_batch_item_id else None,
            "match_type": m.match_type,
            "confidence": str(m.confidence),
            "status": m.status,
            "notes": m.notes,
            "meta": m.meta,
            "created_at": m.created_at,
        }
        for m in res.scalars().all()
    ]

@router.get("/imports/{import_id}/summary")
async def import_summary(
    import_id: str,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    imp = await db.get(BankStatementImport, import_id)
    if not imp or str(imp.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Import not found")

    tx_count = await db.execute(select(BankTransaction.transaction_id).where(BankTransaction.import_id == import_id, BankTransaction.organisation_id == org_id))
    ex_count = await db.execute(select(ReconciliationException.exception_id).where(ReconciliationException.import_id == import_id, ReconciliationException.organisation_id == org_id))

    return {
        "import_id": str(import_id),
        "status": imp.status,
        "meta": imp.meta,
        "transactions": len(tx_count.all()),
        "exceptions": len(ex_count.all()),
    }


@router.get("/imports/{import_id}/export.csv")
async def export_import_csv(
    import_id: str,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    imp = await db.get(BankStatementImport, import_id)
    if not imp or str(imp.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Import not found")

    res = await db.execute(
        select(BankTransaction).where(
            BankTransaction.organisation_id == org_id,
            BankTransaction.import_id == import_id,
        )
    )
    txns = list(res.scalars().all())

    def _iter():
        yield "row_index,txn_date,txn_type,amount,utr,reference,description\n"
        for t in txns:
            desc = (t.description or "").replace("\n", " ").replace("\r", " ")
            yield f"{t.row_index},{t.txn_date},{t.txn_type},{t.amount},{t.utr or ''},{t.reference or ''},\"{desc}\"\n"

    return StreamingResponse(_iter(), media_type="text/csv")


@router.post("/imports/{import_id}/process", status_code=status.HTTP_202_ACCEPTED)
async def queue_import_processing(
    import_id: str,
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    from celery_app import celery_app

    celery_app.send_task("reconciliation.process_import", args=[import_id])
    return {"ok": True, "message": "Import processing queued"}


@router.post("/exceptions/{exception_id}/ack", status_code=status.HTTP_200_OK)
async def ack_exception(
    exception_id: str,
    note: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    ex = await db.get(ReconciliationException, exception_id)
    if not ex or str(ex.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Exception not found")
    async with db.begin():
        ex.status = "ack"
        if note:
            ex.resolution_note = note
    return {"ok": True}


@router.post("/exceptions/{exception_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_exception(
    exception_id: str,
    note: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    ex = await db.get(ReconciliationException, exception_id)
    if not ex or str(ex.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Exception not found")
    async with db.begin():
        ex.status = "resolved"
        ex.resolved_at = datetime.now(tz=timezone.utc)
        ex.resolved_by = getattr(auth.principal, "user_id", None)
        if note:
            ex.resolution_note = note
    return {"ok": True}


@router.get("/finance/dashboard")
async def reconciliation_finance_dashboard(
    limit: int = 50,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    return await finance_exception_dashboard(db, organisation_id=org_id, limit=limit)

