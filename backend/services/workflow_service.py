from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import Approval, SalaryBatch
from models.workflow_models import ApprovalDelegation, ApprovalWorkflow, ApprovalWorkflowStep


@dataclass(frozen=True)
class WorkflowSelection:
    workflow_code: str
    workflow_id: UUID | None


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


async def select_workflow_for_salary_batch(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    total_amount: Decimal | None,
) -> WorkflowSelection:
    """
    Picks the first active workflow whose routing_rule matches.
    Minimal baseline routing: min_amount/max_amount.
    If none found, returns DEFAULT.
    """
    res = await db.execute(
        select(ApprovalWorkflow)
        .where(
            ApprovalWorkflow.organisation_id == organisation_id,
            ApprovalWorkflow.entity_type == "salary_batch",
            ApprovalWorkflow.is_active.is_(True),
        )
        .order_by(ApprovalWorkflow.code.asc())
    )
    workflows = list(res.scalars().all())
    amt = total_amount or Decimal("0")

    for wf in workflows:
        rule = wf.routing_rule or {}
        min_amt = rule.get("min_amount")
        max_amt = rule.get("max_amount")
        if min_amt is not None and amt < Decimal(str(min_amt)):
            continue
        if max_amt is not None and amt > Decimal(str(max_amt)):
            continue
        return WorkflowSelection(workflow_code=wf.code, workflow_id=wf.workflow_id)

    return WorkflowSelection(workflow_code="DEFAULT", workflow_id=None)


async def get_steps_for_workflow(
    db: AsyncSession,
    *,
    workflow_id: UUID | None,
    organisation_id: UUID,
) -> list[ApprovalWorkflowStep]:
    if workflow_id is None:
        # Default 2-step baseline (back-compat)
        return [
            ApprovalWorkflowStep(order_index=1, step_code="HR", role="hr", require_all=True, sla_hours=24),  # type: ignore[call-arg]
            ApprovalWorkflowStep(order_index=2, step_code="FINANCE", role="finance", require_all=True, sla_hours=24),  # type: ignore[call-arg]
        ]

    res = await db.execute(
        select(ApprovalWorkflowStep)
        .where(ApprovalWorkflowStep.workflow_id == workflow_id, ApprovalWorkflowStep.is_active.is_(True))
        .order_by(ApprovalWorkflowStep.order_index.asc(), ApprovalWorkflowStep.step_code.asc())
    )
    return list(res.scalars().all())


def _parallel_group(code: str, order_index: int) -> str:
    return f"{code}:{order_index}"


async def create_approvals_for_batch(
    db: AsyncSession,
    *,
    batch: SalaryBatch,
    workflow_code: str,
    workflow_id: UUID | None,
) -> list[Approval]:
    steps = await get_steps_for_workflow(db, workflow_id=workflow_id, organisation_id=batch.organisation_id)
    created: list[Approval] = []

    now = _now()
    for st in steps:
        due = now + timedelta(hours=int(getattr(st, "sla_hours", 24) or 24))
        ap = Approval(
            organisation_id=batch.organisation_id,
            entity_type="salary_batch",
            entity_id=batch.batch_id,
            step=st.step_code,
            status="pending",
            batch_id=batch.batch_id,
            workflow_code=workflow_code,
            order_index=int(st.order_index),
            parallel_group=_parallel_group(workflow_code, int(st.order_index)),
            due_at=due,
            decision_token=secrets.token_urlsafe(32),
        )
        db.add(ap)
        created.append(ap)

    await db.flush()
    return created


async def resolve_delegation(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    actor_user_id: UUID,
    entity_type: str,
    step_code: str,
) -> ApprovalDelegation | None:
    """
    Returns delegation record if actor is an active delegate for some delegator.
    (We store delegation on approval for auditability.)
    """
    now = _now()
    res = await db.execute(
        select(ApprovalDelegation)
        .where(
            ApprovalDelegation.organisation_id == organisation_id,
            ApprovalDelegation.delegate_user_id == actor_user_id,
            ApprovalDelegation.is_active.is_(True),
            ApprovalDelegation.entity_type == entity_type,
        )
        .order_by(ApprovalDelegation.created_at.desc())
    )
    for d in res.scalars().all():
        if d.ends_at and d.ends_at < now:
            continue
        if d.step_code and d.step_code != step_code:
            continue
        return d
    return None


async def can_decide_step(
    db: AsyncSession,
    *,
    batch: SalaryBatch,
    ap: Approval,
) -> bool:
    """
    Sequential enforcement with parallel groups:
    - All approvals with order_index < ap.order_index must be approved
    """
    res = await db.execute(
        select(Approval.status, Approval.order_index).where(
            Approval.entity_type == "salary_batch",
            Approval.entity_id == batch.batch_id,
            Approval.organisation_id == batch.organisation_id,
        )
    )
    rows = res.all()
    for status_s, idx in rows:
        if int(idx or 1) < int(ap.order_index or 1) and status_s != "approved":
            return False
    return True


async def recompute_batch_status_from_approvals(db: AsyncSession, *, batch: SalaryBatch) -> None:
    res = await db.execute(
        select(Approval.status).where(
            Approval.entity_type == "salary_batch",
            Approval.entity_id == batch.batch_id,
            Approval.organisation_id == batch.organisation_id,
        )
    )
    statuses = [r[0] for r in res.all()]
    if statuses and all(s == "approved" for s in statuses):
        batch.status = "approved"
        return
    # pending
    # keep existing states if already moved forward; else use generic pending
    if batch.status not in {"finance_pending", "approved"}:
        batch.status = "hr_pending"

