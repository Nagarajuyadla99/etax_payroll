from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_async_db
from models.disbursement_models import Approval, SalaryBatch, SalaryBatchItem
from models.disbursement_models import PaymentArtifact
from schemas.disbursement_schemas import (
    ApproveIn,
    ApprovalOut,
    SalaryBatchCreate,
    SalaryBatchDetailOut,
    SalaryBatchOut,
)
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.idempotency import idempotent_execute, require_idempotency_key
from utils.rbac import require_roles
from services.audit_service import audit_log
from services.workflow_service import create_approvals_for_batch, select_workflow_for_salary_batch
from services.event_bus import publish_event


router = APIRouter(prefix="/disbursement", tags=["Disbursement"])


@router.post("/salary-batches", response_model=SalaryBatchOut, status_code=status.HTTP_201_CREATED)
async def create_salary_batch(
    data: SalaryBatchCreate,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    async with db.begin():
        # Create batch shell; items will be populated during payout engine task (next todo)
        batch = SalaryBatch(
            organisation_id=org_id,
            payroll_run_id=data.payroll_run_id,
            pay_period_id=data.pay_period_id,
            batch_ref=data.batch_ref,
            status="hr_pending",
            created_by=getattr(auth.principal, "user_id", None),
        )
        db.add(batch)
        await db.flush()

        # Phase 2D: create approvals from configured workflow (fallbacks to HR->FINANCE DEFAULT)
        sel = await select_workflow_for_salary_batch(
            db,
            organisation_id=org_id,
            total_amount=batch.total_amount,
        )
        await create_approvals_for_batch(
            db,
            batch=batch,
            workflow_code=sel.workflow_code,
            workflow_id=sel.workflow_id,
        )

        # Notify creator (best-effort, but transactional)
        try:
            from services.notification_service import create_notification

            creator_id = getattr(auth.principal, "user_id", None)
            if creator_id:
                await create_notification(
                    db,
                    organisation_id=org_id,
                    user_id=creator_id,
                    kind="batch_created",
                    title="Salary batch created",
                    body=f"Batch {batch.batch_ref} created and awaiting approvals.",
                    data={"batch_id": str(batch.batch_id)},
                )
        except Exception:
            pass

        await audit_log(
            db,
            organisation_id=org_id,
            actor_id=getattr(auth.principal, "user_id", None),
            actor_role=getattr(auth.principal, "role", None),
            action="salary_batch.created",
            entity="salary_batch",
            entity_id=batch.batch_id,
            before=None,
            after={"batch_ref": batch.batch_ref, "status": batch.status},
            extra={"payroll_run_id": str(batch.payroll_run_id), "pay_period_id": str(batch.pay_period_id)},
        )

        await publish_event(
            db,
            organisation_id=org_id,
            event_type="payroll.created",
            dedupe_key=f"payroll.created:{batch.batch_id}",
            payload={"batch_id": str(batch.batch_id), "batch_ref": batch.batch_ref, "status": batch.status},
        )

    await db.refresh(batch)
    return batch


@router.get("/salary-batches", response_model=list[SalaryBatchOut])
async def list_salary_batches(
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    res = await db.execute(select(SalaryBatch).where(SalaryBatch.organisation_id == org_id).order_by(SalaryBatch.created_at.desc()))
    return list(res.scalars().all())


@router.get("/salary-batches/{batch_id}", response_model=SalaryBatchDetailOut)
async def get_salary_batch(
    batch_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    res = await db.execute(
        select(SalaryBatch)
        .options(selectinload(SalaryBatch.items), selectinload(SalaryBatch.approvals))
        .where(SalaryBatch.batch_id == batch_id, SalaryBatch.organisation_id == org_id)
    )
    batch = res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


async def _approve(
    *,
    db: AsyncSession,
    org_id,
    batch: SalaryBatch,
    step: str,
    actor_user_id,
    comment: str | None,
):
    res = await db.execute(
        select(Approval).where(
            Approval.entity_type == "salary_batch",
            Approval.entity_id == batch.batch_id,
            Approval.step == step,
            Approval.organisation_id == org_id,
        )
    )
    ap = res.scalar_one_or_none()
    if not ap:
        raise HTTPException(status_code=404, detail="Approval step not found")
    if ap.status == "approved":
        raise HTTPException(status_code=409, detail="Already approved")
    if ap.status == "rejected":
        raise HTTPException(status_code=409, detail="Approval already rejected")

    # Integrity: no self-approval (creator cannot approve their own batch)
    if batch.created_by and actor_user_id and str(batch.created_by) == str(actor_user_id):
        raise HTTPException(status_code=403, detail="Self-approval is not allowed")

    # Sequential enforcement (Phase 2D): honor order_index if present, else old behavior
    if ap.order_index and ap.order_index > 1:
        prev = await db.execute(
            select(Approval).where(
                Approval.entity_type == "salary_batch",
                Approval.entity_id == batch.batch_id,
                Approval.organisation_id == org_id,
                Approval.order_index < ap.order_index,
            )
        )
        for p in prev.scalars().all():
            if p.status != "approved":
                raise HTTPException(status_code=409, detail="Previous approval steps are not complete")
    else:
        if step == "HR" and batch.status not in {"hr_pending", "finance_pending"}:
            raise HTTPException(status_code=409, detail="Batch not ready for HR approval")
        if step == "FINANCE" and batch.status != "finance_pending":
            raise HTTPException(status_code=409, detail="Batch not ready for finance approval")

    from datetime import datetime, timezone

    ap.status = "approved"
    ap.actor_user_id = actor_user_id
    ap.decided_at = datetime.now(tz=timezone.utc)
    ap.comment = comment
    ap.decision_token = None

    # batch status transitions
    # Phase 2D: compute based on all approvals
    res2 = await db.execute(
        select(Approval.status).where(
            Approval.entity_type == "salary_batch",
            Approval.entity_id == batch.batch_id,
            Approval.organisation_id == org_id,
        )
    )
    statuses = [r[0] for r in res2.all()]
    if statuses and all(s == "approved" for s in statuses):
        batch.status = "approved"
    elif step == "HR":
        batch.status = "finance_pending"
    await db.flush()

    await audit_log(
        db,
        organisation_id=org_id,
        actor_id=actor_user_id,
        actor_role=None,
        action="salary_batch.approved",
        entity="salary_batch",
        entity_id=batch.batch_id,
        before=None,
        after={"step": step, "status": batch.status, "comment": comment},
    )


@router.post("/salary-batches/{batch_id}/approve/hr")
async def approve_hr(
    request: Request,
    batch_id: UUID,
    data: ApproveIn,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
    idempotency_key: str = Depends(require_idempotency_key),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    batch = await db.get(SalaryBatch, batch_id)
    if not batch or str(batch.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    async def _exec():
        async with db.begin():
            await _approve(
                db=db,
                org_id=org_id,
                batch=batch,
                step="HR",
                actor_user_id=getattr(auth.principal, "user_id", None),
                comment=data.comment,
            )
        res = await db.execute(select(Approval).where(Approval.batch_id == batch_id).order_by(Approval.created_at.asc()))
        return 200, [ApprovalOut.model_validate(a).model_dump() for a in res.scalars().all()]

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        idempotency_key=idempotency_key,
        endpoint="approve_hr",
        body=data.model_dump(),
        exec_fn=_exec,
    )
    return payload


@router.post("/salary-batches/{batch_id}/approve/finance")
async def approve_finance(
    request: Request,
    batch_id: UUID,
    data: ApproveIn,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
    idempotency_key: str = Depends(require_idempotency_key),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    batch = await db.get(SalaryBatch, batch_id)
    if not batch or str(batch.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status not in {"finance_pending", "approved"}:
        raise HTTPException(status_code=409, detail="Batch not ready for finance approval")
    async def _exec():
        async with db.begin():
            await _approve(
                db=db,
                org_id=org_id,
                batch=batch,
                step="FINANCE",
                actor_user_id=getattr(auth.principal, "user_id", None),
                comment=data.comment,
            )
        res = await db.execute(select(Approval).where(Approval.batch_id == batch_id).order_by(Approval.created_at.asc()))
        return 200, [ApprovalOut.model_validate(a).model_dump() for a in res.scalars().all()]

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        idempotency_key=idempotency_key,
        endpoint="approve_finance",
        body=data.model_dump(),
        exec_fn=_exec,
    )
    return payload


@router.post("/salary-batches/{batch_id}/payout", status_code=status.HTTP_202_ACCEPTED)
async def payout_salary_batch(
    request: Request,
    batch_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
    idempotency_key: str = Depends(require_idempotency_key),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    batch = await db.get(SalaryBatch, batch_id)
    if not batch or str(batch.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status != "approved":
        raise HTTPException(status_code=409, detail="Batch not approved")

    async def _exec():
        # Enqueue payout task
        try:
            from celery_app import celery_app

            celery_app.send_task("payout.process_salary_batch", args=[str(batch_id)])
            return 202, {"ok": True, "message": "Payout queued"}
        except Exception:
            # Dev fallback: run inline
            from tasks.payout_tasks import process_salary_batch

            process_salary_batch(str(batch_id))
            return 202, {"ok": True, "message": "Payout executed inline (dev fallback)"}

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        idempotency_key=idempotency_key,
        endpoint="payout_salary_batch",
        body={"batch_id": str(batch_id)},
        exec_fn=_exec,
    )
    return payload


@router.post("/salary-batches/{batch_id}/retry-failed", status_code=status.HTTP_202_ACCEPTED)
async def retry_failed(
    request: Request,
    batch_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
    idempotency_key: str = Depends(require_idempotency_key),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    batch = await db.get(SalaryBatch, batch_id)
    if not batch or str(batch.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Batch not found")

    async def _exec():
        try:
            from celery_app import celery_app

            celery_app.send_task("payout.retry_failed_items", args=[str(batch_id)])
            return 202, {"ok": True, "message": "Retry queued"}
        except Exception:
            from tasks.payout_tasks import retry_failed_items

            retry_failed_items(str(batch_id))
            return 202, {"ok": True, "message": "Retry executed inline (dev fallback)"}

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        idempotency_key=idempotency_key,
        endpoint="retry_failed",
        body={"batch_id": str(batch_id)},
        exec_fn=_exec,
    )
    return payload


@router.post("/salary-batches/{batch_id}/artifacts/bank-file", status_code=status.HTTP_201_CREATED)
async def generate_bank_file(
    request: Request,
    batch_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
    idempotency_key: str = Depends(require_idempotency_key),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    from services.bank_file_service import generate_bank_file_for_batch

    async def _exec():
        async with db.begin():
            artifact = await generate_bank_file_for_batch(db, batch_id=batch_id, organisation_id=org_id)
        return (
            201,
            {
                "artifact_id": str(artifact.artifact_id),
                "kind": artifact.kind,
                "format": artifact.format,
                "storage_path": artifact.storage_path,
                "sha256": artifact.sha256,
                "created_at": str(artifact.created_at),
            },
        )

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        idempotency_key=idempotency_key,
        endpoint="generate_bank_file",
        body={"batch_id": str(batch_id)},
        exec_fn=_exec,
    )
    return payload


@router.get("/salary-batches/{batch_id}/artifacts", status_code=status.HTTP_200_OK)
async def list_artifacts(
    batch_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    batch = await db.get(SalaryBatch, batch_id)
    if not batch or str(batch.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    res = await db.execute(select(PaymentArtifact).where(PaymentArtifact.batch_id == batch_id).order_by(PaymentArtifact.created_at.desc()))
    return [
        {
            "artifact_id": str(a.artifact_id),
            "kind": a.kind,
            "format": a.format,
            "storage_path": a.storage_path,
            "sha256": a.sha256,
            "created_at": a.created_at,
        }
        for a in res.scalars().all()
    ]

