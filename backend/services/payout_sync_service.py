"""
Centralized sync: provider_payouts → salary_batch_items → salary_batches.
Used by Celery payout tasks and payment webhooks.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import SalaryBatch, SalaryBatchItem
from models.provider_models import ProviderPayout

_PROVIDER_SUCCESS = frozenset({"processed", "success"})
_PROVIDER_FAILED = frozenset({"failed", "reversed", "cancelled", "rejected"})
_PROVIDER_PENDING = frozenset({"queued", "pending", "processing", "submitted"})

def map_provider_status_to_item_status(provider_status: str) -> str:
    s = (provider_status or "").strip().lower()
    if s in _PROVIDER_SUCCESS:
        return "success"
    if s in _PROVIDER_FAILED:
        return "failed"
    if s in _PROVIDER_PENDING:
        return "pending"
    return "pending"


async def sync_provider_payout_to_batch(
    db: AsyncSession,
    *,
    provider_payout: ProviderPayout,
    provider_status: str,
    utr: str | None = None,
    failure_reason: str | None = None,
    raw: dict[str, Any] | None = None,
) -> None:
    """Idempotent status propagation for one provider payout row."""
    status_s = (provider_status or provider_payout.status or "").strip().lower()
    provider_payout.status = status_s or provider_payout.status
    if utr:
        provider_payout.utr = utr
    if failure_reason:
        provider_payout.failure_reason = failure_reason
    if raw is not None:
        provider_payout.raw = raw
    provider_payout.updated_at = datetime.now(tz=timezone.utc)

    item = await db.get(SalaryBatchItem, provider_payout.salary_batch_item_id)
    if item:
        item.status = map_provider_status_to_item_status(status_s)
        item.payout_ref = provider_payout.provider_payout_ref
        if item.status == "failed":
            item.failure_reason = failure_reason or f"Provider status: {status_s}"
        elif item.status == "success":
            item.failure_reason = None

    batch = await db.get(SalaryBatch, provider_payout.salary_batch_id)
    if batch:
        await recompute_batch_status_from_items(db, batch)


async def recompute_batch_status_from_items(db: AsyncSession, batch: SalaryBatch) -> None:
    """Derive batch status from line items after payout activity."""
    if batch.status in {"cancelled"}:
        return

    res = await db.execute(
        select(SalaryBatchItem.status).where(SalaryBatchItem.batch_id == batch.batch_id)
    )
    statuses = [r[0] for r in res.all()]
    if not statuses:
        return

    if batch.status in {"approved", "hr_pending", "finance_pending", "draft"}:
        # Not yet in payout lifecycle — leave approval state intact
        return

    if all(s == "success" for s in statuses):
        batch.status = "paid"
    elif any(s == "success" for s in statuses) and any(s == "failed" for s in statuses):
        if not any(s in ("pending", "held") for s in statuses):
            batch.status = "failed"
        else:
            batch.status = "payout_in_progress"
    elif any(s == "failed" for s in statuses) and not any(
        s in ("pending", "held", "success") for s in statuses
    ):
        batch.status = "failed"
    elif any(s in ("pending", "held") for s in statuses) or any(s == "success" for s in statuses):
        batch.status = "payout_in_progress"
    await db.flush()
