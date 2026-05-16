from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import Approval, PaymentArtifact, SalaryBatch
from services.workflow_service import recompute_batch_status_from_approvals

logger = logging.getLogger("payroll.disbursement")


async def load_approval_snapshot(
    db: AsyncSession,
    *,
    batch: SalaryBatch,
) -> dict[str, Any]:
    res = await db.execute(
        select(Approval.step, Approval.status, Approval.order_index, Approval.actor_user_id, Approval.decided_at)
        .where(
            Approval.entity_type == "salary_batch",
            Approval.entity_id == batch.batch_id,
            Approval.organisation_id == batch.organisation_id,
        )
        .order_by(Approval.order_index.asc(), Approval.step.asc())
    )
    rows = res.all()
    hr = next((r for r in rows if r[0] == "HR"), None)
    finance = next((r for r in rows if r[0] == "FINANCE"), None)

    art = await db.execute(
        select(PaymentArtifact.artifact_id)
        .where(PaymentArtifact.batch_id == batch.batch_id, PaymentArtifact.kind == "bank_file")
        .limit(1)
    )
    bank_file_generated = art.scalar_one_or_none() is not None

    return {
        "batch_id": str(batch.batch_id),
        "batch_status": batch.status,
        "hr_approved": hr is not None and hr[1] == "approved",
        "finance_approved": finance is not None and finance[1] == "approved",
        "hr_status": hr[1] if hr else None,
        "finance_status": finance[1] if finance else None,
        "bank_file_generated": bank_file_generated,
        "approvals": [
            {
                "step": step,
                "status": status,
                "order_index": order_index,
                "actor_user_id": str(actor) if actor else None,
                "decided_at": decided_at.isoformat() if decided_at else None,
            }
            for step, status, order_index, actor, decided_at in rows
        ],
    }


def log_workflow_state(
    *,
    event: str,
    snapshot: dict[str, Any],
    extra: dict[str, Any] | None = None,
) -> None:
    payload = {**snapshot, **(extra or {})}
    logger.info("disbursement.workflow %s %s", event, payload)


async def reconcile_batch_status(
    db: AsyncSession,
    *,
    batch: SalaryBatch,
    commit: bool = False,
) -> str:
    """
    Align salary_batches.status with approval rows (repairs stale reads / partial updates).
    Returns previous status.
    """
    previous = batch.status
    await recompute_batch_status_from_approvals(db, batch=batch)
    if batch.status != previous:
        log_workflow_state(
            event="status_reconciled",
            snapshot=await load_approval_snapshot(db, batch=batch),
            extra={"previous_status": previous, "new_status": batch.status},
        )
        if commit and db.in_transaction():
            await db.commit()
    return previous


def finance_step_done(snapshot: dict[str, Any]) -> bool:
    return bool(snapshot.get("finance_approved"))


def hr_step_done(snapshot: dict[str, Any]) -> bool:
    return bool(snapshot.get("hr_approved"))


def finance_approval_allowed(batch: SalaryBatch, snapshot: dict[str, Any]) -> bool:
    """Gate for POST /approve/finance — HR must be done; finance not yet done (or idempotent)."""
    if finance_step_done(snapshot):
        return True
    if hr_step_done(snapshot) and not finance_step_done(snapshot):
        return True
    if batch.status in {"finance_pending", "approved"}:
        return True
    return False


def batch_ready_for_bank_file(batch: SalaryBatch, snapshot: dict[str, Any]) -> tuple[bool, str | None]:
    if not finance_step_done(snapshot):
        return False, "Finance approval is required before generating a bank file"
    if batch.status != "approved":
        return False, f"Batch must be fully approved (current status: {batch.status})"
    return True, None
