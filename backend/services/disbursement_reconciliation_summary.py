"""Per-batch reconciliation summary (additive; uses reconciliation v2 + provider_payouts)."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import SalaryBatch, SalaryBatchItem
from models.provider_models import ProviderPayout
from models.reconciliation_v2_models import ReconciliationException, ReconciliationMatch


async def build_batch_reconciliation_summary(
    db: AsyncSession,
    *,
    batch_id: UUID,
    organisation_id: UUID,
) -> dict:
    batch = await db.get(SalaryBatch, batch_id)
    if not batch or str(batch.organisation_id) != str(organisation_id):
        return {"error": "not_found"}

    items_res = await db.execute(
        select(SalaryBatchItem.status, func.count())
        .where(SalaryBatchItem.batch_id == batch_id)
        .group_by(SalaryBatchItem.status)
    )
    item_counts = {row[0]: row[1] for row in items_res.all()}

    pp_res = await db.execute(
        select(ProviderPayout.status, func.count(), func.coalesce(func.sum(SalaryBatchItem.amount), 0))
        .join(SalaryBatchItem, SalaryBatchItem.item_id == ProviderPayout.salary_batch_item_id)
        .where(ProviderPayout.salary_batch_id == batch_id)
        .group_by(ProviderPayout.status)
    )
    payout_by_status = [
        {"status": s, "count": c, "amount": str(a)} for s, c, a in pp_res.all()
    ]

    utr_dup = await db.execute(
        select(ProviderPayout.utr, func.count())
        .where(
            ProviderPayout.salary_batch_id == batch_id,
            ProviderPayout.utr.isnot(None),
        )
        .group_by(ProviderPayout.utr)
        .having(func.count() > 1)
    )
    duplicate_utrs = [{"utr": u, "count": c} for u, c in utr_dup.all()]

    unmatched_pp = await db.execute(
        select(func.count())
        .select_from(ProviderPayout)
        .where(
            ProviderPayout.salary_batch_id == batch_id,
            ProviderPayout.status.notin_(["processed", "success"]),
        )
    )
    unmatched_items = await db.execute(
        select(func.count())
        .select_from(SalaryBatchItem)
        .where(
            SalaryBatchItem.batch_id == batch_id,
            SalaryBatchItem.status.in_(["pending", "failed"]),
        )
    )

    match_res = await db.execute(
        select(func.count())
        .select_from(ReconciliationMatch)
        .join(ProviderPayout, ProviderPayout.provider_payout_id == ReconciliationMatch.provider_payout_id)
        .where(ProviderPayout.salary_batch_id == batch_id)
    )
    open_exceptions = await db.execute(
        select(func.count())
        .select_from(ReconciliationException)
        .where(
            ReconciliationException.organisation_id == organisation_id,
            ReconciliationException.status == "open",
        )
    )

    total_items = sum(item_counts.values())
    success_items = item_counts.get("success", 0)
    failed_items = item_counts.get("failed", 0)

    return {
        "batch_id": str(batch_id),
        "batch_ref": batch.batch_ref,
        "batch_status": batch.status,
        "disbursement_mode": batch.disbursement_mode,
        "item_counts": item_counts,
        "payout_by_status": payout_by_status,
        "duplicate_utrs": duplicate_utrs,
        "unmatched_provider_payouts": int(unmatched_pp.scalar_one() or 0),
        "unmatched_or_pending_items": int(unmatched_items.scalar_one() or 0),
        "reconciliation_matches": int(match_res.scalar_one() or 0),
        "open_exceptions_org_wide": int(open_exceptions.scalar_one() or 0),
        "totals": {
            "batch_amount": str(batch.total_amount),
            "items": total_items,
            "success_items": success_items,
            "failed_items": failed_items,
            "success_rate": str(
                (Decimal(success_items) / Decimal(total_items) * 100).quantize(Decimal("0.01"))
                if total_items
                else Decimal("0")
            ),
        },
    }
