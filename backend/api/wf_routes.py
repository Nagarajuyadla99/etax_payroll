"""
Workforce Management API — additive namespace /api/wf/*

Does not replace /api/attendance/* legacy routes.
"""

from __future__ import annotations

from datetime import date
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.wf_holiday_crud import create_holiday, delete_holiday, list_holidays, update_holiday
from database import get_async_db
from models.wf_models import (
    AttendanceException,
    OrganisationAttendanceProfile,
    OrganisationSourceConfig,
    RawAttendanceEvent,
    TerminologyPack,
    WfApprovalRequest,
    WfAttendancePolicy,
    WfAttendanceSourcePlugin,
    WfPolicyRule,
    WfPolicyVersion,
    WfRecomputeJob,
    WfRosterPlan,
    WfShiftTemplate,
)
from schemas.wf_schemas import (
    AttendanceProfileActivateIn,
    AttendanceProfileOut,
    AttendanceSetupCompleteIn,
    AttendanceSetupProgressIn,
    AttendanceSetupStatusOut,
    EssAttendanceDisputeIn,
    EssMobileAttendanceIn,
    EssPunchCorrectionIn,
    EssRegularizationIn,
    ExceptionOut,
    ExceptionResolveIn,
    FeatureFlagOut,
    FeatureFlagPatchIn,
    HolidayCreate,
    HolidayOut,
    HolidayUpdate,
    LabelsOut,
    LabelsPatchIn,
    OrganisationSourceConfigOut,
    OrganisationSourceConfigPatch,
    PolicyCreate,
    PolicyRuleIn,
    PolicyOut,
    RawEventIngestIn,
    RawEventOut,
    RecomputeJobIn,
    RecomputeJobOut,
    AnalyticsSummaryOut,
    RosterAssignmentOut,
    RosterAssignmentsBulkIn,
    RosterPlanCreate,
    RosterPlanOut,
    ShiftTemplateCreate,
    ShiftTemplateOut,
    SourcePluginOut,
    TerminologyPackOut,
    WfApprovalDecisionIn,
    WfApprovalRequestCreate,
    WfApprovalRequestOut,
)
from services.wf_feature_flag_service import is_feature_enabled, list_org_flags, set_org_flag
from services.wf_label_service import resolve_org_labels, upsert_org_labels
from services.wf_profile_service import activate_attendance_ecosystem, ensure_attendance_profile, list_enabled_modes
from services.wf_setup_service import (
    complete_setup,
    complete_setup_from_progress,
    get_setup_options,
    get_setup_status,
    save_setup_progress,
    setup_required,
)
from services.wf_raw_event_service import ingest_raw_event
from services.wf_analytics_service import attendance_dashboard_summary
from services.wf_recompute_service import create_recompute_job, process_recompute_job
from services.wf_roster_service import add_roster_assignments, list_roster_assignments, publish_roster_plan
from services.wf_seed_service import seed_wf_platform_data
from utils.dependencies import AuthSubject, get_current_auth, resolve_organisation_id
from utils.rbac import require_roles

router = APIRouter(prefix="/wf", tags=["Workforce Management"])


def _org_id(auth: AuthSubject) -> UUID:
    oid = resolve_organisation_id(auth.principal, auth.payload)
    if not oid:
        raise HTTPException(status_code=400, detail="Organisation context missing")
    return oid


# ---------------------------------------------------------------------------
# Platform seed (admin)
# ---------------------------------------------------------------------------


@router.post("/platform/seed", status_code=status.HTTP_200_OK)
async def seed_platform(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin"])),
):
    counts = await seed_wf_platform_data(db)
    return {"status": "ok", "seeded": counts}


# ---------------------------------------------------------------------------
# Profile & sources
# ---------------------------------------------------------------------------


def _profile_out(profile: OrganisationAttendanceProfile) -> AttendanceProfileOut:
    return AttendanceProfileOut(
        organisation_id=profile.organisation_id,
        engine_version=profile.engine_version,
        enabled_modes=list(profile.enabled_modes or []),
        default_source=profile.default_source,
        label_version=profile.label_version,
        terminology_pack_code=profile.terminology_pack_code,
        setup_completed_at=profile.setup_completed_at,
        setup_required=setup_required(profile),
        industry_template=profile.industry_template,
        attendance_cycle_type=profile.attendance_cycle_type,
    )


@router.get("/attendance-profile", response_model=AttendanceProfileOut)
async def get_attendance_profile(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(auth)
    profile = await ensure_attendance_profile(db, org_id)
    return _profile_out(profile)


# ---------------------------------------------------------------------------
# Mandatory setup wizard (admin)
# ---------------------------------------------------------------------------


@router.get("/setup/status", response_model=AttendanceSetupStatusOut)
async def setup_status(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    profile = await ensure_attendance_profile(db, _org_id(auth))
    return AttendanceSetupStatusOut(**get_setup_status(profile))


@router.get("/setup/options")
async def setup_options(
    current_user=Depends(require_roles(["admin"])),
):
    return get_setup_options()


@router.put("/setup/progress", response_model=AttendanceProfileOut)
async def setup_progress_save(
    data: AttendanceSetupProgressIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    profile = await save_setup_progress(
        db, _org_id(auth), step=data.step, payload=data.payload
    )
    return _profile_out(profile)


@router.post("/setup/complete", response_model=AttendanceProfileOut)
async def setup_complete(
    data: AttendanceSetupCompleteIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    try:
        profile = await complete_setup(
            db,
            _org_id(auth),
            sources=data.sources,
            industry=data.industry,
            cycle_type=data.cycle_type,
            cycle_config=data.cycle_config,
            behaviors=data.behaviors,
        )
        return _profile_out(profile)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/setup/complete-from-progress", response_model=AttendanceProfileOut)
async def setup_complete_from_saved(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    try:
        profile = await complete_setup_from_progress(db, _org_id(auth))
        return _profile_out(profile)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/attendance-profile/activate", response_model=AttendanceProfileOut)
async def activate_profile(
    data: AttendanceProfileActivateIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = _org_id(auth)
    return await activate_attendance_ecosystem(
        db,
        org_id,
        data.enabled_modes,
        default_source=data.default_source,
        terminology_pack_code=data.terminology_pack_code,
        engine_version=data.engine_version,
    )


@router.get("/attendance-profile/modes", response_model=list[str])
async def get_enabled_modes(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "employee"])),
):
    return await list_enabled_modes(db, _org_id(auth))


@router.get("/sources", response_model=List[SourcePluginOut])
async def list_source_plugins(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(
        select(WfAttendanceSourcePlugin)
        .where(WfAttendanceSourcePlugin.is_active.is_(True))
        .order_by(WfAttendanceSourcePlugin.sort_order.asc())
    )
    return list(res.scalars().all())


@router.get("/sources/config", response_model=List[OrganisationSourceConfigOut])
async def list_org_source_config(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(auth)
    res = await db.execute(
        select(OrganisationSourceConfig).where(OrganisationSourceConfig.organisation_id == org_id)
    )
    return list(res.scalars().all())


@router.patch("/sources/config/{source_code}", response_model=OrganisationSourceConfigOut)
async def patch_org_source_config(
    source_code: str,
    data: OrganisationSourceConfigPatch,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = _org_id(auth)
    res = await db.execute(
        select(OrganisationSourceConfig).where(
            OrganisationSourceConfig.organisation_id == org_id,
            OrganisationSourceConfig.source_code == source_code,
        )
    )
    row = res.scalar_one_or_none()
    if not row:
        row = OrganisationSourceConfig(organisation_id=org_id, source_code=source_code)
        db.add(row)
    if data.enabled is not None:
        row.enabled = data.enabled
    if data.settings_json is not None:
        row.settings_json = data.settings_json
    await db.commit()
    await db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------


@router.get("/labels", response_model=LabelsOut)
async def get_labels(
    locale: str = "en",
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "employee"])),
):
    org_id = _org_id(auth)
    labels, version = await resolve_org_labels(db, org_id, locale)
    return LabelsOut(locale=locale, version=version, labels=labels)


@router.patch("/labels", response_model=LabelsOut)
async def patch_labels(
    data: LabelsPatchIn,
    locale: str = "en",
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = _org_id(auth)
    user_id = getattr(auth.principal, "user_id", None)
    await upsert_org_labels(
        db,
        org_id,
        [i.model_dump() for i in data.labels],
        user_id,
    )
    labels, version = await resolve_org_labels(db, org_id, locale)
    return LabelsOut(locale=locale, version=version, labels=labels)


@router.get("/terminology-packs", response_model=List[TerminologyPackOut])
async def list_terminology_packs(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(select(TerminologyPack).where(TerminologyPack.is_active.is_(True)))
    return list(res.scalars().all())


# ---------------------------------------------------------------------------
# Feature flags
# ---------------------------------------------------------------------------


@router.get("/feature-flags", response_model=List[FeatureFlagOut])
async def get_feature_flags(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    rows = await list_org_flags(db, _org_id(auth))
    return [FeatureFlagOut(**r) for r in rows]


@router.patch("/feature-flags/{flag_code}", response_model=FeatureFlagOut)
async def patch_feature_flag(
    flag_code: str,
    data: FeatureFlagPatchIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    try:
        row = await set_org_flag(db, _org_id(auth), flag_code, data.enabled, data.config_json)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return FeatureFlagOut(
        flag_code=flag_code,
        enabled=row.enabled,
        config_json=row.config_json or {},
    )


# ---------------------------------------------------------------------------
# Holidays
# ---------------------------------------------------------------------------


@router.get("/holidays", response_model=List[HolidayOut])
async def get_holidays(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_holidays(db, _org_id(auth), from_date, to_date)


@router.post("/holidays", response_model=HolidayOut, status_code=status.HTTP_201_CREATED)
async def post_holiday(
    data: HolidayCreate,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        return await create_holiday(db, _org_id(auth), data)
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/holidays/{holiday_id}", response_model=HolidayOut)
async def put_holiday(
    holiday_id: UUID,
    data: HolidayUpdate,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    row = await update_holiday(db, holiday_id, _org_id(auth), data)
    if not row:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return row


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_holiday(
    holiday_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    ok = await delete_holiday(db, holiday_id, _org_id(auth))
    if not ok:
        raise HTTPException(status_code=404, detail="Holiday not found")


# ---------------------------------------------------------------------------
# Raw events
# ---------------------------------------------------------------------------


@router.post("/events/ingest", response_model=RawEventOut, status_code=status.HTTP_201_CREATED)
async def ingest_event(
    data: RawEventIngestIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "employee"])),
):
    org_id = _org_id(auth)
    if not await is_feature_enabled(db, org_id, "wf_raw_events"):
        raise HTTPException(status_code=403, detail="Raw event ingestion not enabled for this organisation")
    user_id = getattr(auth.principal, "user_id", None)
    event = await ingest_raw_event(db, org_id, data.model_dump(), created_by=user_id)
    return event


@router.get("/events", response_model=List[RawEventOut])
async def list_raw_events(
    employee_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(auth)
    q = select(RawAttendanceEvent).where(RawAttendanceEvent.organisation_id == org_id)
    if employee_id:
        q = q.where(RawAttendanceEvent.employee_id == employee_id)
    q = q.order_by(RawAttendanceEvent.punch_time.desc()).limit(min(limit, 500))
    res = await db.execute(q)
    return list(res.scalars().all())


# ---------------------------------------------------------------------------
# Recompute
# ---------------------------------------------------------------------------


@router.post("/jobs/recompute", response_model=RecomputeJobOut, status_code=status.HTTP_202_ACCEPTED)
async def start_recompute(
    data: RecomputeJobIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(auth)
    scope_json: dict = {}
    if data.scope_type == "employee_day":
        if not data.employee_id or not data.work_date:
            raise HTTPException(status_code=400, detail="employee_id and work_date required")
        scope_json = {"employee_id": str(data.employee_id), "work_date": data.work_date.isoformat()}
    elif data.scope_type in ("employee_month", "org_month"):
        if not data.from_date or not data.to_date:
            raise HTTPException(status_code=400, detail="from_date and to_date required")
        scope_json = {
            "from_date": data.from_date.isoformat(),
            "to_date": data.to_date.isoformat(),
        }
        if data.employee_id:
            scope_json["employee_id"] = str(data.employee_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid scope_type")

    user_id = getattr(auth.principal, "user_id", None)
    job = await create_recompute_job(db, org_id, data.scope_type, scope_json, created_by=user_id)

    if await is_feature_enabled(db, org_id, "wf_recompute_async"):
        try:
            from tasks.wf_attendance_tasks import run_recompute_job_task
            from services.wf_observability_service import record_queue_enqueue

            record_queue_enqueue("attendance")
            run_recompute_job_task.delay(str(job.job_id))
        except Exception:
            await process_recompute_job(db, job.job_id)
    else:
        await process_recompute_job(db, job.job_id)

    await db.refresh(job)
    return job


@router.get("/jobs/recompute/{job_id}", response_model=RecomputeJobOut)
async def get_recompute_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    job = await db.get(WfRecomputeJob, job_id)
    if not job or job.organisation_id != _org_id(auth):
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ---------------------------------------------------------------------------
# Shift templates (basic CRUD)
# ---------------------------------------------------------------------------


@router.get("/shift-templates", response_model=List[ShiftTemplateOut])
async def list_shift_templates(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(
        select(WfShiftTemplate).where(WfShiftTemplate.organisation_id == _org_id(auth))
    )
    return list(res.scalars().all())


@router.post("/shift-templates", response_model=ShiftTemplateOut, status_code=status.HTTP_201_CREATED)
async def create_shift_template(
    data: ShiftTemplateCreate,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    row = WfShiftTemplate(organisation_id=_org_id(auth), **data.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# Roster plans (basic CRUD)
# ---------------------------------------------------------------------------


@router.get("/rosters", response_model=List[RosterPlanOut])
async def list_rosters(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(
        select(WfRosterPlan).where(WfRosterPlan.organisation_id == _org_id(auth))
    )
    return list(res.scalars().all())


@router.post("/rosters", response_model=RosterPlanOut, status_code=status.HTTP_201_CREATED)
async def create_roster(
    data: RosterPlanCreate,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    row = WfRosterPlan(organisation_id=_org_id(auth), **data.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/rosters/{roster_plan_id}/assignments", status_code=status.HTTP_201_CREATED)
async def bulk_roster_assignments(
    roster_plan_id: UUID,
    data: RosterAssignmentsBulkIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(auth)
    try:
        n = await add_roster_assignments(
            db,
            org_id,
            roster_plan_id,
            [a.model_dump() for a in data.assignments],
        )
        await db.commit()
        return {"created": n}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/rosters/{roster_plan_id}/assignments", response_model=List[RosterAssignmentOut])
async def get_roster_assignments(
    roster_plan_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    rows = await list_roster_assignments(db, _org_id(auth), roster_plan_id=roster_plan_id)
    return rows


@router.post("/rosters/{roster_plan_id}/publish", response_model=RosterPlanOut)
async def publish_roster(
    roster_plan_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        return await publish_roster_plan(db, _org_id(auth), roster_plan_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/analytics/dashboard", response_model=AnalyticsSummaryOut)
async def analytics_dashboard(
    from_date: date,
    to_date: date,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await attendance_dashboard_summary(db, _org_id(auth), from_date, to_date)


# ---------------------------------------------------------------------------
# Policies (basic CRUD)
# ---------------------------------------------------------------------------


@router.get("/policies", response_model=List[PolicyOut])
async def list_policies(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(
        select(WfAttendancePolicy).where(WfAttendancePolicy.organisation_id == _org_id(auth))
    )
    return list(res.scalars().all())


@router.post("/policies", response_model=PolicyOut, status_code=status.HTTP_201_CREATED)
async def create_policy(
    data: PolicyCreate,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    row = WfAttendancePolicy(organisation_id=_org_id(auth), **data.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/policies/{policy_id}/rules", status_code=status.HTTP_201_CREATED)
async def add_policy_rule(
    policy_id: UUID,
    data: PolicyRuleIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    pol = await db.get(WfAttendancePolicy, policy_id)
    if not pol or pol.organisation_id != _org_id(auth):
        raise HTTPException(status_code=404, detail="Policy not found")
    rule = WfPolicyRule(policy_id=policy_id, **data.model_dump())
    db.add(rule)
    await db.commit()
    return {"rule_id": str(rule.rule_id), "rule_type": rule.rule_type}


@router.post("/policies/{policy_id}/publish", response_model=PolicyOut)
async def publish_policy(
    policy_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    pol = await db.get(WfAttendancePolicy, policy_id)
    if not pol or pol.organisation_id != _org_id(auth):
        raise HTTPException(status_code=404, detail="Policy not found")
    rules_q = await db.execute(
        select(WfPolicyRule).where(WfPolicyRule.policy_id == policy_id, WfPolicyRule.is_active.is_(True))
    )
    rules = list(rules_q.scalars().all())
    snapshot = [
        {
            "rule_id": str(r.rule_id),
            "rule_type": r.rule_type,
            "priority": r.priority,
            "condition_json": r.condition_json,
            "action_json": r.action_json,
        }
        for r in rules
    ]
    pol.version = pol.version + 1
    pol.status = "published"
    db.add(
        WfPolicyVersion(
            policy_id=policy_id,
            version=pol.version,
            rules_snapshot_json=snapshot,
            published_by=getattr(auth.principal, "user_id", None),
        )
    )
    await db.commit()
    await db.refresh(pol)
    return pol


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


@router.get("/exceptions", response_model=List[ExceptionOut])
async def list_exceptions(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    q = select(AttendanceException).where(AttendanceException.organisation_id == _org_id(auth))
    if status_filter:
        q = q.where(AttendanceException.status == status_filter)
    res = await db.execute(q.order_by(AttendanceException.created_at.desc()).limit(200))
    return list(res.scalars().all())


@router.post("/exceptions/{exception_id}/resolve", response_model=ExceptionOut)
async def resolve_exception(
    exception_id: UUID,
    data: ExceptionResolveIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    from models.wf_models import AttendanceExceptionResolution

    exc = await db.get(AttendanceException, exception_id)
    if not exc or exc.organisation_id != _org_id(auth):
        raise HTTPException(status_code=404, detail="Exception not found")
    exc.status = "resolved"
    db.add(
        AttendanceExceptionResolution(
            exception_id=exception_id,
            resolved_by=getattr(auth.principal, "user_id", None),
            resolution_type=data.resolution_type,
            notes=data.notes,
        )
    )
    await db.flush()
    try:
        from models.wf_enterprise_models import WF_EVENT_EXCEPTION_RESOLVED
        from services.wf_event_bus import publish_wf_domain_event

        await publish_wf_domain_event(
            db,
            exc.organisation_id,
            WF_EVENT_EXCEPTION_RESOLVED,
            {
                "exception_id": str(exc.exception_id),
                "employee_id": str(exc.employee_id),
                "work_date": exc.work_date.isoformat(),
                "resolution_type": data.resolution_type,
            },
            dedupe_key=f"exc_resolved:{exc.exception_id}",
        )
    except Exception:
        pass
    await db.commit()
    await db.refresh(exc)
    return exc


# ---------------------------------------------------------------------------
# WF Approvals
# ---------------------------------------------------------------------------


@router.post("/approvals", response_model=WfApprovalRequestOut, status_code=status.HTTP_201_CREATED)
async def create_approval_request(
    data: WfApprovalRequestCreate,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "employee"])),
):
    row = WfApprovalRequest(
        organisation_id=_org_id(auth),
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        employee_id=data.employee_id,
        payload_json=data.payload_json,
        created_by=getattr(auth.principal, "user_id", None),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.get("/approvals", response_model=List[WfApprovalRequestOut])
async def list_approval_requests(
    status_filter: Optional[str] = "pending",
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    q = select(WfApprovalRequest).where(WfApprovalRequest.organisation_id == _org_id(auth))
    if status_filter:
        q = q.where(WfApprovalRequest.status == status_filter)
    res = await db.execute(q.order_by(WfApprovalRequest.created_at.desc()).limit(100))
    return list(res.scalars().all())


@router.post("/approvals/{request_id}/decide", response_model=WfApprovalRequestOut)
async def decide_approval(
    request_id: UUID,
    data: WfApprovalDecisionIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    from models.wf_models import WfApprovalAction

    req = await db.get(WfApprovalRequest, request_id)
    if not req or req.organisation_id != _org_id(auth):
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "approved" if data.action == "approve" else "rejected"
    db.add(
        WfApprovalAction(
            request_id=request_id,
            actor_id=getattr(auth.principal, "user_id", None),
            action=data.action,
            level=req.current_level,
            comment=data.comment,
        )
    )
    await db.commit()
    await db.refresh(req)
    return req


# ---------------------------------------------------------------------------
# ESS (employee self-service)
# ---------------------------------------------------------------------------


@router.post("/ess/regularization", response_model=WfApprovalRequestOut, status_code=status.HTTP_201_CREATED)
async def ess_regularization(
    data: EssRegularizationIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["employee", "admin", "hr"])),
):
    org_id = _org_id(auth)
    if not await is_feature_enabled(db, org_id, "wf_ess"):
        raise HTTPException(status_code=403, detail="ESS not enabled")
    emp_id = getattr(auth.principal, "employee_id", None)
    row = WfApprovalRequest(
        organisation_id=org_id,
        entity_type="attendance_regularization",
        entity_id=uuid4(),
        employee_id=emp_id,
        payload_json=data.model_dump(mode="json"),
        created_by=getattr(auth.principal, "user_id", None),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/ess/punch-correction", response_model=WfApprovalRequestOut, status_code=status.HTTP_201_CREATED)
async def ess_punch_correction(
    data: EssPunchCorrectionIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["employee", "admin", "hr"])),
):
    org_id = _org_id(auth)
    if not await is_feature_enabled(db, org_id, "wf_ess"):
        raise HTTPException(status_code=403, detail="ESS not enabled")
    emp_id = getattr(auth.principal, "employee_id", None)
    row = WfApprovalRequest(
        organisation_id=org_id,
        entity_type="missing_punch",
        entity_id=uuid4(),
        employee_id=emp_id,
        payload_json=data.model_dump(mode="json"),
        created_by=getattr(auth.principal, "user_id", None),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/ess/attendance-dispute", response_model=WfApprovalRequestOut, status_code=status.HTTP_201_CREATED)
async def ess_attendance_dispute(
    data: EssAttendanceDisputeIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["employee", "admin", "hr"])),
):
    org_id = _org_id(auth)
    if not await is_feature_enabled(db, org_id, "wf_ess"):
        raise HTTPException(status_code=403, detail="ESS not enabled")
    row = WfApprovalRequest(
        organisation_id=org_id,
        entity_type="attendance_dispute",
        entity_id=uuid4(),
        employee_id=getattr(auth.principal, "employee_id", None),
        payload_json=data.model_dump(mode="json"),
        created_by=getattr(auth.principal, "user_id", None),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/ess/mobile-attendance", response_model=RawEventOut, status_code=status.HTTP_201_CREATED)
async def ess_mobile_attendance(
    data: EssMobileAttendanceIn,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["employee", "admin", "hr"])),
):
    org_id = _org_id(auth)
    if not await is_feature_enabled(db, org_id, "wf_raw_events"):
        raise HTTPException(status_code=403, detail="Raw event ingestion not enabled")
    emp_id = getattr(auth.principal, "employee_id", None) or data.employee_id
    payload = data.model_dump()
    payload["employee_id"] = emp_id
    payload["source"] = "mobile"
    user_id = getattr(auth.principal, "user_id", None)
    return await ingest_raw_event(db, org_id, payload, created_by=user_id)
