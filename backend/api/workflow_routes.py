from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.disbursement_models import Approval, SalaryBatch
from models.workflow_models import ApprovalDelegation, ApprovalWorkflow, ApprovalWorkflowStep
from schemas.workflow_schemas import (
    ApprovalDecisionIn,
    DelegationCreate,
    DelegationOut,
    WorkflowOut,
    WorkflowStepOut,
    WorkflowStepUpsert,
    WorkflowUpsert,
)
from services.audit_service import audit_log
from services.workflow_service import can_decide_step, recompute_batch_status_from_approvals, resolve_delegation
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.rbac import require_roles
from utils.tenant_guard import require_same_org


router = APIRouter(prefix="/workflows", tags=["Workflow Engine"])


@router.get("/approval-workflows", response_model=list[WorkflowOut])
async def list_workflows(
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    res = await db.execute(
        select(ApprovalWorkflow)
        .where(ApprovalWorkflow.organisation_id == org_id)
        .order_by(ApprovalWorkflow.entity_type.asc(), ApprovalWorkflow.code.asc())
    )
    return list(res.scalars().all())


@router.post("/approval-workflows", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowUpsert,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    async with db.begin():
        existing = await db.execute(
            select(ApprovalWorkflow).where(
                ApprovalWorkflow.organisation_id == org_id,
                ApprovalWorkflow.entity_type == data.entity_type,
                ApprovalWorkflow.code == data.code,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Workflow code already exists")
        wf = ApprovalWorkflow(
            organisation_id=org_id,
            entity_type=data.entity_type,
            code=data.code,
            name=data.name,
            description=data.description,
            routing_rule=data.routing_rule,
            is_active=data.is_active,
        )
        db.add(wf)
        await db.flush()
        await db.refresh(wf)
        return wf


@router.get("/approval-workflows/{workflow_id}/steps", response_model=list[WorkflowStepOut])
async def list_steps(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    wf = await db.get(ApprovalWorkflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    require_same_org(org_id=org_id, resource_org_id=wf.organisation_id, not_found_msg="Workflow not found")

    res = await db.execute(
        select(ApprovalWorkflowStep)
        .where(ApprovalWorkflowStep.workflow_id == workflow_id)
        .order_by(ApprovalWorkflowStep.order_index.asc(), ApprovalWorkflowStep.step_code.asc())
    )
    return list(res.scalars().all())


@router.post("/approval-workflows/{workflow_id}/steps", response_model=WorkflowStepOut, status_code=status.HTTP_201_CREATED)
async def create_step(
    workflow_id: UUID,
    data: WorkflowStepUpsert,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    wf = await db.get(ApprovalWorkflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    require_same_org(org_id=org_id, resource_org_id=wf.organisation_id, not_found_msg="Workflow not found")

    async with db.begin():
        st = ApprovalWorkflowStep(
            workflow_id=workflow_id,
            order_index=data.order_index,
            step_code=data.step_code,
            role=data.role,
            require_all=data.require_all,
            sla_hours=data.sla_hours,
            min_amount=data.min_amount,
            max_amount=data.max_amount,
            config=data.config,
            is_active=data.is_active,
        )
        db.add(st)
        await db.flush()
        await db.refresh(st)
        return st


@router.post("/delegations", response_model=DelegationOut, status_code=status.HTTP_201_CREATED)
async def create_delegation(
    data: DelegationCreate,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    async with db.begin():
        d = ApprovalDelegation(
            organisation_id=org_id,
            delegator_user_id=data.delegator_user_id,
            delegate_user_id=data.delegate_user_id,
            entity_type=data.entity_type,
            step_code=data.step_code,
            reason=data.reason,
            ends_at=data.ends_at,
            is_active=data.is_active,
        )
        db.add(d)
        await db.flush()
        await db.refresh(d)
        return d


@router.post("/salary-batches/{batch_id}/decide/{step_code}")
async def decide_salary_batch_step(
    batch_id: UUID,
    step_code: str,
    data: ApprovalDecisionIn,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
):
    """
    Generic decision endpoint:
    - Enforces sequential ordering (supports parallel via same order_index)
    - Prevents replay via decision_token (token must match and is nulled after decision)
    - Supports delegation (records delegation_id)
    """
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    batch = await db.get(SalaryBatch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    require_same_org(org_id=org_id, resource_org_id=batch.organisation_id, not_found_msg="Batch not found")

    res = await db.execute(
        select(Approval).where(
            Approval.organisation_id == org_id,
            Approval.entity_type == "salary_batch",
            Approval.entity_id == batch_id,
            Approval.step == step_code,
        )
    )
    ap = res.scalar_one_or_none()
    if not ap:
        raise HTTPException(status_code=404, detail="Approval step not found")
    if ap.status in {"approved", "rejected"}:
        raise HTTPException(status_code=409, detail="Already decided")
    if not ap.decision_token or ap.decision_token != data.decision_token:
        raise HTTPException(status_code=409, detail="Stale/replayed approval token")

    if batch.created_by and getattr(auth.principal, "user_id", None) and str(batch.created_by) == str(getattr(auth.principal, "user_id", None)):
        raise HTTPException(status_code=403, detail="Self-approval is not allowed")

    ok = await can_decide_step(db, batch=batch, ap=ap)
    if not ok:
        raise HTTPException(status_code=409, detail="Previous approval steps are not complete")

    from datetime import datetime, timezone

    async with db.begin():
        ap.actor_user_id = getattr(auth.principal, "user_id", None)
        ap.decided_at = datetime.now(tz=timezone.utc)
        ap.comment = data.comment
        ap.decision_token = None

        d = None
        if ap.actor_user_id:
            d = await resolve_delegation(
                db,
                organisation_id=org_id,
                actor_user_id=ap.actor_user_id,
                entity_type="salary_batch",
                step_code=step_code,
            )
        if d:
            ap.decided_by_delegation_id = d.delegation_id

        if data.decision not in {"approve", "reject"}:
            raise HTTPException(status_code=400, detail="Invalid decision")
        ap.status = "approved" if data.decision == "approve" else "rejected"

        if ap.status == "rejected":
            batch.status = "failed"
        else:
            await recompute_batch_status_from_approvals(db, batch=batch)

        await audit_log(
            db,
            organisation_id=org_id,
            actor_id=getattr(auth.principal, "user_id", None),
            actor_role=getattr(auth.principal, "role", None),
            action="workflow.approval_decided",
            entity="salary_batch",
            entity_id=batch.batch_id,
            before=None,
            after={"step": step_code, "decision": ap.status, "batch_status": batch.status},
            extra={"workflow_code": ap.workflow_code, "order_index": ap.order_index, "delegation_id": str(d.delegation_id) if d else None},
        )

    return {"ok": True, "batch_status": batch.status, "step": step_code, "decision": ap.status}

