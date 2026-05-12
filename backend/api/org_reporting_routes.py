from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.disbursement_models import SalaryBatch, SalaryBatchItem
from models.fraud_models import FraudAlert
from models.provider_models import ProviderPayout
from models.reconciliation_v2_models import ReconciliationException
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.rbac import require_roles


router = APIRouter(prefix="/reports", tags=["Org Reports"])


@router.get("/org-kpis")
async def org_kpis(
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    payout_counts = await db.execute(
        select(
            func.count(ProviderPayout.provider_payout_id),
            func.sum(case((ProviderPayout.status.in_(["processed", "success"]), 1), else_=0)),
            func.sum(case((ProviderPayout.status.in_(["failed", "reversed"]), 1), else_=0)),
        ).where(ProviderPayout.organisation_id == org_id)
    )
    total_payouts, payouts_success, payouts_failed = payout_counts.one()
    total_payouts = int(total_payouts or 0)
    payouts_success = int(payouts_success or 0)
    payouts_failed = int(payouts_failed or 0)

    exc_counts = await db.execute(
        select(func.count(ReconciliationException.exception_id)).where(
            ReconciliationException.organisation_id == org_id,
            ReconciliationException.status.in_(["open", "ack"]),
        )
    )
    open_exceptions = int(exc_counts.scalar() or 0)

    fraud_counts = await db.execute(
        select(func.count(FraudAlert.alert_id)).where(
            FraudAlert.organisation_id == org_id,
            FraudAlert.status.in_(["open", "ack"]),
        )
    )
    open_fraud_alerts = int(fraud_counts.scalar() or 0)

    held_items = await db.execute(
        select(func.count(SalaryBatchItem.item_id))
        .select_from(SalaryBatchItem)
        .join(SalaryBatch, SalaryBatch.batch_id == SalaryBatchItem.batch_id)
        .where(SalaryBatch.organisation_id == org_id, SalaryBatchItem.status == "held")
    )
    held_batch_items = int(held_items.scalar() or 0)

    success_rate = (payouts_success / total_payouts) if total_payouts else 0.0

    return {
        "organisation_id": str(org_id),
        "payouts": {
            "total": total_payouts,
            "success": payouts_success,
            "failed": payouts_failed,
            "success_rate": round(success_rate, 4),
        },
        "reconciliation": {"open_exceptions": open_exceptions},
        "fraud": {"open_alerts": open_fraud_alerts, "held_batch_items": held_batch_items},
    }

