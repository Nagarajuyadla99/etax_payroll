"""Enterprise WF APIs: devices, freezes, roster SM, ops, projections, ESS extensions."""

from __future__ import annotations

from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.wf_enterprise_models import WfPolicyExecutionLog, WfRosterStateLog
from models.wf_models import WfRosterPlan
from schemas.wf_schemas import RosterPlanOut, WfApprovalRequestCreate, WfApprovalRequestOut
from services.wf_device_service import list_devices, record_device_sync, register_device
from services.wf_freeze_service import FREEZE_ATTENDANCE, FREEZE_FINANCIAL, FREEZE_PAYROLL, apply_freeze, release_freeze
from services.wf_observability_service import (
    persist_metrics_snapshot,
    queue_metrics,
    snapshot_metrics,
    worker_health_snapshot,
)
from services.wf_shift_ops_service import (
    add_shift_segment,
    allocate_shift_for_day,
    inherit_shift_template,
    list_shift_segments,
)
from schemas.wf_schemas import ShiftAllocateIn, ShiftSegmentIn, ShiftTemplateInheritIn
from services.wf_projection_service import query_projection_summary, refresh_daily_projection
from services.wf_roster_state_machine import (
    approve_roster,
    archive_roster,
    freeze_roster_sm,
    submit_for_approval,
)
from utils.dependencies import AuthSubject, get_current_auth, resolve_organisation_id
from utils.rbac import require_roles

router = APIRouter(prefix="/wf/enterprise", tags=["WF Enterprise"])


def _org(auth: AuthSubject) -> UUID:
    oid = resolve_organisation_id(auth.principal, auth.payload)
    if not oid:
        raise HTTPException(400, "Organisation context missing")
    return oid


class DeviceRegisterIn(BaseModel):
    terminal_code: str
    device_type: str = "biometric"
    location: Optional[str] = None


class FreezeIn(BaseModel):
    freeze_level: str
    range_start: Optional[date] = None
    range_end: Optional[date] = None
    pay_period_id: Optional[UUID] = None
    notes: Optional[str] = None


class RosterTransitionIn(BaseModel):
    notes: Optional[str] = None


class EssShiftSwapIn(BaseModel):
    work_date: date
    target_shift_id: Optional[UUID] = None
    reason: Optional[str] = None


class EssOtRequestIn(BaseModel):
    work_date: date
    hours: float = Field(gt=0)
    reason: Optional[str] = None


# Devices
@router.get("/devices")
async def get_devices(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_devices(db, _org(auth))


@router.post("/devices", status_code=201)
async def post_device(
    data: DeviceRegisterIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    return await register_device(db, _org(auth), data.terminal_code, data.device_type, location=data.location)


@router.post("/devices/{device_id}/sync")
async def device_sync(
    device_id: UUID,
    events_received: int,
    events_accepted: int,
    latency_ms: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await record_device_sync(db, device_id, events_received=events_received, events_accepted=events_accepted, latency_ms=latency_ms)


# Freeze hierarchy
@router.post("/freeze")
async def post_freeze(
    data: FreezeIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    if data.freeze_level not in (FREEZE_ATTENDANCE, FREEZE_PAYROLL, FREEZE_FINANCIAL):
        raise HTTPException(400, "Invalid freeze_level")
    return await apply_freeze(
        db,
        _org(auth),
        data.freeze_level,
        range_start=data.range_start,
        range_end=data.range_end,
        pay_period_id=data.pay_period_id,
        performed_by=getattr(auth.principal, "user_id", None),
        notes=data.notes,
    )


@router.post("/freeze/{freeze_id}/release")
async def release_freeze_route(
    freeze_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    ok = await release_freeze(db, freeze_id, _org(auth))
    if not ok:
        raise HTTPException(404, "Freeze not found")
    return {"released": True}


# Roster state machine
@router.post("/rosters/{roster_plan_id}/submit", response_model=RosterPlanOut)
async def roster_submit(
    roster_plan_id: UUID,
    data: RosterTransitionIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        return await submit_for_approval(db, _org(auth), roster_plan_id, getattr(auth.principal, "user_id", None))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/rosters/{roster_plan_id}/approve", response_model=RosterPlanOut)
async def roster_approve(
    roster_plan_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    try:
        return await approve_roster(db, _org(auth), roster_plan_id, getattr(auth.principal, "user_id", None))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/rosters/{roster_plan_id}/freeze", response_model=RosterPlanOut)
async def roster_freeze(
    roster_plan_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    try:
        return await freeze_roster_sm(db, _org(auth), roster_plan_id, getattr(auth.principal, "user_id", None))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/rosters/{roster_plan_id}/archive", response_model=RosterPlanOut)
async def roster_archive(
    roster_plan_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    try:
        return await archive_roster(db, _org(auth), roster_plan_id, getattr(auth.principal, "user_id", None))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/rosters/{roster_plan_id}/state-log")
async def roster_state_log(
    roster_plan_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(
        select(WfRosterStateLog)
        .where(WfRosterStateLog.roster_plan_id == roster_plan_id)
        .order_by(WfRosterStateLog.created_at.desc())
    )
    return list(res.scalars().all())


# Terminal registry (P5 — alias of device list)
@router.get("/terminals")
async def list_terminals(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_devices(db, _org(auth))


# Shift engine (P1)
@router.post("/shift-templates/{template_id}/inherit", status_code=201)
async def shift_template_inherit(
    template_id: UUID,
    data: ShiftTemplateInheritIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        row = await inherit_shift_template(
            db,
            _org(auth),
            template_id,
            code=data.code,
            name=data.name,
            effective_from=data.effective_from,
            effective_to=data.effective_to,
        )
        await db.commit()
        await db.refresh(row)
        return row
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/shifts/{shift_id}/segments")
async def get_shift_segments(
    shift_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        return await list_shift_segments(db, _org(auth), shift_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/shifts/{shift_id}/segments", status_code=201)
async def post_shift_segment(
    shift_id: UUID,
    data: ShiftSegmentIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        seg = await add_shift_segment(db, _org(auth), shift_id, **data.model_dump())
        await db.commit()
        await db.refresh(seg)
        return seg
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/shifts/allocate")
async def post_shift_allocate(
    data: ShiftAllocateIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        result = await allocate_shift_for_day(
            db,
            _org(auth),
            data.employee_id,
            data.work_date,
            roster_plan_id=data.roster_plan_id,
            template_id=data.template_id,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


# Observability (P4)
@router.get("/ops/metrics")
async def ops_metrics(current_user=Depends(require_roles(["admin"]))):
    return snapshot_metrics()


@router.get("/ops/queue-metrics")
async def ops_queue_metrics(current_user=Depends(require_roles(["admin"]))):
    return queue_metrics()


@router.get("/ops/worker-health")
async def ops_worker_health(current_user=Depends(require_roles(["admin"]))):
    return worker_health_snapshot()


@router.post("/ops/metrics/persist")
async def ops_metrics_persist(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    n = await persist_metrics_snapshot(db, _org(auth))
    await db.commit()
    return {"persisted": n}


@router.get("/policy-execution-logs")
async def policy_logs(
    employee_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    q = select(WfPolicyExecutionLog).where(WfPolicyExecutionLog.organisation_id == _org(auth))
    if employee_id:
        q = q.where(WfPolicyExecutionLog.employee_id == employee_id)
    if from_date:
        q = q.where(WfPolicyExecutionLog.work_date >= from_date)
    if to_date:
        q = q.where(WfPolicyExecutionLog.work_date <= to_date)
    res = await db.execute(q.order_by(WfPolicyExecutionLog.created_at.desc()).limit(min(limit, 200)))
    return list(res.scalars().all())


@router.get("/policy-execution-logs/{log_id}")
async def policy_log_detail(
    log_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    """Explainability trace for one day pipeline run (P3)."""
    row = await db.get(WfPolicyExecutionLog, log_id)
    if not row or row.organisation_id != _org(auth):
        raise HTTPException(404, "Policy execution log not found")
    return {
        "log_id": str(row.log_id),
        "employee_id": str(row.employee_id),
        "work_date": row.work_date.isoformat(),
        "final_status": row.final_status,
        "duration_ms": row.duration_ms,
        "execution_graph": row.execution_graph_json,
        "stages": row.stages_json,
    }


# Projections
@router.post("/projections/refresh")
async def refresh_projections(
    from_date: date,
    to_date: date,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    n = await refresh_daily_projection(db, _org(auth), from_date, to_date)
    return {"refreshed_rows": n}


@router.get("/projections/summary")
async def projection_summary(
    from_date: date,
    to_date: date,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await query_projection_summary(db, _org(auth), from_date, to_date)


# ESS extensions
@router.post("/ess/shift-swap", response_model=WfApprovalRequestOut, status_code=201)
async def ess_shift_swap(
    data: EssShiftSwapIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["employee", "admin", "hr"])),
):
    from models.wf_models import WfApprovalRequest
    from uuid import uuid4

    row = WfApprovalRequest(
        organisation_id=_org(auth),
        entity_type="shift_swap",
        entity_id=uuid4(),
        employee_id=getattr(auth.principal, "employee_id", None),
        payload_json=data.model_dump(mode="json"),
        created_by=getattr(auth.principal, "user_id", None),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/ess/ot-request", response_model=WfApprovalRequestOut, status_code=201)
async def ess_ot_request(
    data: EssOtRequestIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["employee", "admin", "hr"])),
):
    from models.wf_models import WfApprovalRequest
    from uuid import uuid4

    row = WfApprovalRequest(
        organisation_id=_org(auth),
        entity_type="ot_request",
        entity_id=uuid4(),
        employee_id=getattr(auth.principal, "employee_id", None),
        payload_json=data.model_dump(mode="json"),
        created_by=getattr(auth.principal, "user_id", None),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row
