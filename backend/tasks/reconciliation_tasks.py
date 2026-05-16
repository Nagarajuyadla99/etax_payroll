from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import UUID

from celery.utils.log import get_task_logger
from sqlalchemy import select

from celery_app import celery_app
from database import AsyncSessionLocal
from models.reconciliation_models import BankStatementImport
from models.reconciliation_v2_models import BankTransaction
from services.reconciliation_matching_service import match_transactions_for_import
from services.reconciliation_parsers import parse_csv_statement, parse_mt940
from services.event_bus import publish_event


log = get_task_logger(__name__)


@celery_app.task(
    name="reconciliation.process_import",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=5,
    soft_time_limit=120,
    time_limit=180,
)
def process_import(import_id: str):
    async def _go():
        async with AsyncSessionLocal() as db:
            async with db.begin():
                imp = await db.get(BankStatementImport, UUID(import_id))
                if not imp:
                    raise ValueError("Import not found")

                raw = (open(imp.storage_path, "rb").read()).decode("utf-8", errors="replace")
                if imp.source == "mt940":
                    parsed = parse_mt940(raw)
                else:
                    parsed = parse_csv_statement(raw)

                # upsert transactions (idempotent by org+import+row_index)
                for idx, t in enumerate(parsed):
                    db.add(
                        BankTransaction(
                            organisation_id=imp.organisation_id,
                            import_id=imp.import_id,
                            row_index=str(idx + 1),
                            txn_date=t.txn_date,
                            txn_type=t.txn_type,
                            amount=t.amount,
                            description=t.description,
                            reference=t.reference,
                            utr=t.utr,
                            normalized={"raw": t.raw or {}},
                        )
                    )

                imp.status = "parsed"
                imp.meta = {**(imp.meta or {}), "transactions": len(parsed)}

            async with db.begin():
                stats = await match_transactions_for_import(
                    db,
                    organisation_id=imp.organisation_id,
                    import_id=imp.import_id,
                    amount_tolerance=Decimal("0.00"),
                )
                imp = await db.get(BankStatementImport, UUID(import_id))
                if imp:
                    imp.meta = {**(imp.meta or {}), "match_stats": stats}
                    await publish_event(
                        db,
                        organisation_id=imp.organisation_id,
                        event_type="reconciliation.completed",
                        dedupe_key=f"reconciliation.completed:{imp.import_id}",
                        payload={"import_id": str(imp.import_id), "stats": stats},
                    )

    log.info("Processing reconciliation import %s", import_id)
    return asyncio.run(_go())


@celery_app.task(name="reconciliation.daily_exception_scan")
def daily_exception_scan(lookback_hours: int = 24):
    from services.reconciliation_ops_service import daily_reconciliation_exception_scan

    async def _go():
        async with AsyncSessionLocal() as db:
            async with db.begin():
                return await daily_reconciliation_exception_scan(db, lookback_hours=lookback_hours)

    return asyncio.run(_go())

