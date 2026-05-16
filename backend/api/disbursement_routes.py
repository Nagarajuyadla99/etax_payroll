from __future__ import annotations

import logging
import os
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
from utils.db_transaction import run_writes
from utils.idempotency import idempotent_execute, require_idempotency_key
from utils.rbac import require_roles
from services.audit_service import audit_log
from services.disbursement_workflow import (
    batch_ready_for_bank_file,
    finance_approval_allowed,
    finance_step_done,
    load_approval_snapshot,
    log_workflow_state,
    reconcile_batch_status,
)
from services.disbursement_service import (
    DISBURSEMENT_MODE_API,
    DISBURSEMENT_MODE_BANK_FILE,
    assert_disbursement_mode,
    celery_inline_fallback_allowed,
    try_acquire_payout_enqueue_lock,
    validate_batch_for_bank_file,
    validate_batch_for_payout,
)
from services.workflow_service import (
    create_approvals_for_batch,
    recompute_batch_status_from_approvals,
    select_workflow_for_salary_batch,
)
from services.event_bus import publish_event
from services.payout_audit_service import seal_payout_audit
from utils.banking_log import new_correlation_id, log_banking
from services.disbursement_payroll_guard import assert_payroll_eligible_for_disbursement_batch
from services.disbursement_reconciliation_summary import build_batch_reconciliation_summary
from services.banking_metrics import (
    inc_bank_file_generated,
    inc_payout_enqueued,
    inc_payout_enqueue_conflict,
)
from utils.artifact_download_token import build_artifact_download_token, verify_artifact_download_token


router = APIRouter(prefix="/disbursement", tags=["Disbursement"])
logger = logging.getLogger("payroll.disbursement")


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

    async def _writes() -> SalaryBatch:
        cid = new_correlation_id()
        await assert_payroll_eligible_for_disbursement_batch(
            db,
            payroll_run_id=data.payroll_run_id,
            organisation_id=org_id,
            pay_period_id=data.pay_period_id,
        )
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

        await seal_payout_audit(
            db,
            organisation_id=org_id,
            action="salary_batch.created",
            entity="salary_batch",
            entity_id=batch.batch_id,
            actor_id=getattr(auth.principal, "user_id", None),
            actor_role=getattr(auth.principal, "role", None),
            after={"batch_ref": batch.batch_ref, "status": batch.status},
            extra={
                "payroll_run_id": str(batch.payroll_run_id),
                "pay_period_id": str(batch.pay_period_id),
                "correlation_id": cid,
            },
        )

        await publish_event(
            db,
            organisation_id=org_id,
            event_type="payroll.created",
            dedupe_key=f"payroll.created:{batch.batch_id}",
            payload={"batch_id": str(batch.batch_id), "batch_ref": batch.batch_ref, "status": batch.status},
        )
        return batch

    batch = await run_writes(db, _writes)
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
    batches = list(res.scalars().all())
    for batch in batches:
        await reconcile_batch_status(db, batch=batch)
    if db.in_transaction():
        await db.commit()
    return batches


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
    await reconcile_batch_status(db, batch=batch)
    if db.in_transaction():
        await db.commit()
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

    previous_batch_status = batch.status
    ap.status = "approved"
    ap.actor_user_id = actor_user_id
    ap.decided_at = datetime.now(tz=timezone.utc)
    ap.comment = comment
    ap.decision_token = None

    # Flush so approval status is visible before batch status is recomputed.
    await db.flush()
    await recompute_batch_status_from_approvals(db, batch=batch)
    await db.flush()

    snapshot = await load_approval_snapshot(db, batch=batch)
    log_workflow_state(
        event=f"approval_{step.lower()}",
        snapshot=snapshot,
        extra={
            "transition": f"{previous_batch_status} -> {batch.status}",
            "actor_user_id": str(actor_user_id) if actor_user_id else None,
        },
    )

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
        await run_writes(
            db,
            lambda: _approve(
                db=db,
                org_id=org_id,
                batch=batch,
                step="HR",
                actor_user_id=getattr(auth.principal, "user_id", None),
                comment=data.comment,
            ),
        )
        res = await db.execute(select(Approval).where(Approval.batch_id == batch_id).order_by(Approval.created_at.asc()))
        return 200, [ApprovalOut.model_validate(a).model_dump() for a in res.scalars().all()]

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        organisation_id=org_id,
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

    snapshot = await load_approval_snapshot(db, batch=batch)
    log_workflow_state(event="finance_approve_attempt", snapshot=snapshot)

    if not finance_approval_allowed(batch, snapshot):
        raise HTTPException(status_code=409, detail="Batch not ready for finance approval")

    async def _exec():
        snap = await load_approval_snapshot(db, batch=batch)
        if finance_step_done(snap):
            async def _repair():
                await reconcile_batch_status(db, batch=batch)

            await run_writes(db, _repair)
            log_workflow_state(
                event="finance_approve_idempotent",
                snapshot=await load_approval_snapshot(db, batch=batch),
            )
        else:
            await run_writes(
                db,
                lambda: _approve(
                    db=db,
                    org_id=org_id,
                    batch=batch,
                    step="FINANCE",
                    actor_user_id=getattr(auth.principal, "user_id", None),
                    comment=data.comment,
                ),
            )
        res = await db.execute(
            select(Approval).where(Approval.batch_id == batch_id).order_by(Approval.created_at.asc())
        )
        return 200, [ApprovalOut.model_validate(a).model_dump() for a in res.scalars().all()]

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        organisation_id=org_id,
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
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    await validate_batch_for_payout(batch, org_id)

    async def _exec():
        async def _writes():
            await assert_disbursement_mode(db, batch, DISBURSEMENT_MODE_API)
            try:
                job_id = await try_acquire_payout_enqueue_lock(db, batch)
            except HTTPException as exc:
                if exc.status_code == 409:
                    inc_payout_enqueue_conflict()
                raise
            try:
                from celery_app import celery_app

                celery_app.send_task("payout.process_salary_batch", args=[str(batch_id)])
                inc_payout_enqueued()
                cid = new_correlation_id()
                await seal_payout_audit(
                    db,
                    organisation_id=org_id,
                    action="salary_batch.payout_enqueued",
                    entity="salary_batch",
                    entity_id=batch.batch_id,
                    actor_id=getattr(auth.principal, "user_id", None),
                    actor_role=getattr(auth.principal, "role", None),
                    after={"job_id": job_id, "status": batch.status},
                    extra={"correlation_id": cid},
                )
                log_banking(logger, "payout.enqueued", batch_id=str(batch_id), job_id=job_id)
                return 202, {"ok": True, "message": "Payout queued", "job_id": job_id}
            except Exception as exc:
                if not celery_inline_fallback_allowed():
                    batch.payout_job_id = None
                    batch.status = "approved"
                    await db.flush()
                    raise HTTPException(
                        status_code=503,
                        detail="Payout queue unavailable; try again later",
                    ) from exc
                from tasks.payout_tasks import process_salary_batch

                process_salary_batch(str(batch_id))
                return 202, {"ok": True, "message": "Payout executed inline (dev fallback)", "job_id": job_id}

        return await run_writes(db, _writes)

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        organisation_id=org_id,
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
    if batch.disbursement_mode == DISBURSEMENT_MODE_BANK_FILE:
        raise HTTPException(status_code=409, detail="Batch uses bank_file mode; API retry not allowed")

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
        organisation_id=org_id,
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

    batch = await db.get(SalaryBatch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    await validate_batch_for_bank_file(batch, org_id)

    await reconcile_batch_status(db, batch=batch)
    snapshot = await load_approval_snapshot(db, batch=batch)
    log_workflow_state(event="bank_file_attempt", snapshot=snapshot)

    ok, reason = batch_ready_for_bank_file(batch, snapshot)
    if not ok:
        log_workflow_state(
            event="bank_file_rejected",
            snapshot=snapshot,
            extra={"reason": reason},
        )
        raise HTTPException(status_code=409, detail=reason)

    from services.bank_file_service import generate_bank_file_for_batch

    async def _exec():
        async def _writes():
            await assert_disbursement_mode(db, batch, DISBURSEMENT_MODE_BANK_FILE)
            return await generate_bank_file_for_batch(db, batch_id=batch_id, organisation_id=org_id)

        artifact = await run_writes(db, _writes)
        inc_bank_file_generated()
        return (
            201,
            {
                "artifact_id": str(artifact.artifact_id),
                "kind": artifact.kind,
                "format": artifact.format,
                "version": artifact.version,
                "sha256": artifact.sha256,
                "created_at": str(artifact.created_at),
            },
        )

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        organisation_id=org_id,
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
    res = await db.execute(
        select(PaymentArtifact)
        .where(PaymentArtifact.batch_id == batch_id)
        .order_by(PaymentArtifact.created_at.desc())
    )
    artifacts = []
    for a in res.scalars().all():
        try:
            token = build_artifact_download_token(batch_id=batch_id, artifact_id=a.artifact_id)
            download_url = (
                f"/api/disbursement/salary-batches/{batch_id}/artifacts/{a.artifact_id}/download"
                f"?token={token}"
            )
        except RuntimeError:
            download_url = (
                f"/api/disbursement/salary-batches/{batch_id}/artifacts/{a.artifact_id}/download"
            )
        artifacts.append(
            {
                "artifact_id": str(a.artifact_id),
                "kind": a.kind,
                "format": a.format,
                "version": a.version,
                "sha256": a.sha256,
                "created_at": a.created_at,
                "download_url": download_url,
            }
        )
    return artifacts


@router.get("/salary-batches/{batch_id}/reconciliation-summary")
async def batch_reconciliation_summary(
    batch_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    summary = await build_batch_reconciliation_summary(
        db, batch_id=batch_id, organisation_id=org_id
    )
    if summary.get("error") == "not_found":
        raise HTTPException(status_code=404, detail="Batch not found")
    return summary


@router.get("/salary-batches/{batch_id}/artifacts/{artifact_id}/download")
async def download_artifact(
    batch_id: UUID,
    artifact_id: UUID,
    token: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
):
    from pathlib import Path

    from fastapi.responses import FileResponse

    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    batch = await db.get(SalaryBatch, batch_id)
    if not batch or str(batch.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    art = await db.get(PaymentArtifact, artifact_id)
    if not art or art.batch_id != batch_id:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if not token or not verify_artifact_download_token(
        batch_id=batch_id, artifact_id=artifact_id, token=token
    ):
        raise HTTPException(status_code=403, detail="Invalid or expired download token")
    path = Path(art.storage_path).resolve()
    base = Path(os.getenv("BANK_FILE_STORAGE_DIR", "storage/bank_files")).resolve()
    if not str(path).startswith(str(base)):
        raise HTTPException(status_code=403, detail="Invalid artifact path")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact file missing on disk")
    await audit_log(
        db,
        organisation_id=org_id,
        actor_id=getattr(auth.principal, "user_id", None),
        actor_role=getattr(auth.principal, "role", None),
        action="bank_file.downloaded",
        entity="payment_artifact",
        entity_id=art.artifact_id,
        before=None,
        after={"batch_id": str(batch_id), "version": art.version},
    )
    if db.in_transaction():
        await db.commit()
    return FileResponse(
        path,
        media_type="text/csv",
        filename=path.name,
    )

