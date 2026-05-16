"""Banking operational tasks: stuck payout detection, recovery, consistency checks."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from uuid import UUID

from celery.utils.log import get_task_logger
from sqlalchemy import select

from celery_app import celery_app
from database import AsyncSessionLocal
from models.disbursement_models import SalaryBatch, SalaryBatchItem
from models.provider_models import ProviderPayout
from providers.registry import resolve_provider
from services.payout_sync_service import sync_provider_payout_to_batch
from services.banking_metrics import STUCK_PAYOUT_GAUGE
from utils.celery_dedup import acquire_task_slot, release_task_slot
from utils.banking_log import log_banking, new_correlation_id


log = get_task_logger(__name__)


@celery_app.task(name="banking.detect_stuck_payouts")
def detect_stuck_payouts(max_age_minutes: int = 60):
    async def _go():
        cutoff = datetime.now(tz=timezone.utc) - timedelta(minutes=max_age_minutes)
        async with AsyncSessionLocal() as db:
            async with db.begin():
                res = await db.execute(
                    select(SalaryBatch).where(
                        SalaryBatch.status == "payout_in_progress",
                        SalaryBatch.updated_at < cutoff,
                    )
                )
                stuck = list(res.scalars().all())
                for batch in stuck:
                    log_banking(
                        log,
                        "payout.stuck_detected",
                        batch_id=str(batch.batch_id),
                        batch_ref=batch.batch_ref,
                        organisation_id=str(batch.organisation_id),
                    )
                if stuck:
                    STUCK_PAYOUT_GAUGE.inc(len(stuck))
                return {"stuck_count": len(stuck), "batch_ids": [str(b.batch_id) for b in stuck]}

    return asyncio.run(_go())


@celery_app.task(name="banking.recover_stuck_batch")
def recover_stuck_batch(batch_id: str):
    """Poll provider status for pending items and sync batch state."""
    dedup_key = f"recover:{batch_id}"
    if not acquire_task_slot(dedup_key, ttl_seconds=1800):
        return {"skipped": True, "reason": "dedup"}
    new_correlation_id()

    async def _go():
        async with AsyncSessionLocal() as db:
            async with db.begin():
                batch = await db.get(SalaryBatch, UUID(batch_id))
                if not batch:
                    return {"error": "batch_not_found"}
                provider = await resolve_provider(db, batch.organisation_id)
                items_res = await db.execute(
                    select(SalaryBatchItem).where(SalaryBatchItem.batch_id == batch.batch_id)
                )
                recovered = 0
                for item in items_res.scalars().all():
                    pp_res = await db.execute(
                        select(ProviderPayout).where(
                            ProviderPayout.salary_batch_item_id == item.item_id
                        )
                    )
                    pp = pp_res.scalar_one_or_none()
                    if not pp or not pp.provider_payout_ref:
                        continue
                    try:
                        status_resp = await provider.get_payout_status(pp.provider_payout_ref)
                        await sync_provider_payout_to_batch(
                            db,
                            provider_payout=pp,
                            provider_status=status_resp.status,
                            utr=status_resp.utr,
                            raw=status_resp.raw,
                        )
                        recovered += 1
                    except Exception as e:
                        log_banking(
                            log,
                            "payout.recover_item_failed",
                            level=40,
                            item_id=str(item.item_id),
                            error=str(e),
                        )
                log_banking(
                    log,
                    "payout.recover_batch_done",
                    batch_id=batch_id,
                    recovered=recovered,
                )
                return {"batch_id": batch_id, "recovered_items": recovered, "status": batch.status}

    try:
        return asyncio.run(_go())
    finally:
        release_task_slot(dedup_key)


@celery_app.task(name="banking.verify_payout_consistency")
def verify_payout_consistency(batch_id: str):
    async def _go():
        async with AsyncSessionLocal() as db:
            items_res = await db.execute(
                select(SalaryBatchItem).where(SalaryBatchItem.batch_id == UUID(batch_id))
            )
            issues = []
            for item in items_res.scalars().all():
                pp_res = await db.execute(
                    select(ProviderPayout).where(
                        ProviderPayout.salary_batch_item_id == item.item_id
                    )
                )
                pp = pp_res.scalar_one_or_none()
                if item.status == "success" and not pp:
                    issues.append({"item_id": str(item.item_id), "issue": "success_without_provider_payout"})
                if pp and item.payout_ref != pp.provider_payout_ref:
                    issues.append({"item_id": str(item.item_id), "issue": "payout_ref_mismatch"})
            return {"batch_id": batch_id, "issue_count": len(issues), "issues": issues[:100]}

    return asyncio.run(_go())
