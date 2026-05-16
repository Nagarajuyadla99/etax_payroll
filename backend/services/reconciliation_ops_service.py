"""Reconciliation operations — extends v2 matching without rewrite."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.provider_models import ProviderPayout
from models.reconciliation_v2_models import ReconciliationException


async def finance_exception_dashboard(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    limit: int = 50,
) -> dict:
    exc_res = await db.execute(
        select(ReconciliationException)
        .where(
            ReconciliationException.organisation_id == organisation_id,
            ReconciliationException.status == "open",
        )
        .order_by(ReconciliationException.created_at.desc())
        .limit(limit)
    )
    exceptions = [
        {
            "exception_id": str(e.exception_id),
            "kind": e.kind,
            "severity": e.severity,
            "summary": e.summary,
            "status": e.status,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in exc_res.scalars().all()
    ]

    utr_dup = await db.execute(
        select(ProviderPayout.utr, func.count())
        .where(
            ProviderPayout.organisation_id == organisation_id,
            ProviderPayout.utr.isnot(None),
        )
        .group_by(ProviderPayout.utr)
        .having(func.count() > 1)
    )

    unmatched_payouts = await db.execute(
        select(func.count())
        .select_from(ProviderPayout)
        .where(
            ProviderPayout.organisation_id == organisation_id,
            ProviderPayout.status.notin_(["processed", "success"]),
            ProviderPayout.created_at >= datetime.now(tz=timezone.utc) - timedelta(days=7),
        )
    )

    return {
        "open_exceptions": exceptions,
        "duplicate_utr_count": len(utr_dup.all()),
        "unmatched_recent_payouts": int(unmatched_payouts.scalar_one() or 0),
    }


async def daily_reconciliation_exception_scan(
    db: AsyncSession,
    *,
    lookback_hours: int = 24,
) -> dict:
    """Report provider payouts still not terminal after lookback (no import row required)."""
    cutoff = datetime.now(tz=timezone.utc) - timedelta(hours=lookback_hours)
    res = await db.execute(
        select(ProviderPayout).where(
            ProviderPayout.created_at < cutoff,
            ProviderPayout.status.in_(["queued", "pending", "processing", "submitted"]),
        )
    )
    stale = [
        {
            "provider_payout_id": str(pp.provider_payout_id),
            "provider_payout_ref": pp.provider_payout_ref,
            "organisation_id": str(pp.organisation_id),
            "status": pp.status,
            "created_at": pp.created_at.isoformat() if pp.created_at else None,
        }
        for pp in res.scalars().all()
    ]
    return {"stale_payout_count": len(stale), "stale_payouts": stale[:200]}
