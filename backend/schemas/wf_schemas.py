"""Pydantic schemas for Workforce Management (WF) API."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Profile & sources
# ---------------------------------------------------------------------------


class AttendanceProfileOut(BaseModel):
    organisation_id: UUID
    engine_version: str = "legacy"
    enabled_modes: list[str] = Field(default_factory=list)
    default_source: Optional[str] = None
    label_version: int = 1
    terminology_pack_code: Optional[str] = None
    setup_completed_at: Optional[datetime] = None
    setup_required: bool = False
    industry_template: Optional[str] = None
    attendance_cycle_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceSetupStatusOut(BaseModel):
    setup_required: bool
    setup_completed_at: Optional[str] = None
    current_step: int = 1
    engine_version: str = "legacy"
    industry_template: Optional[str] = None
    attendance_cycle_type: Optional[str] = None


class AttendanceSetupProgressIn(BaseModel):
    step: int = Field(..., ge=1, le=5)
    payload: dict[str, Any] = Field(default_factory=dict)


class AttendanceSetupCompleteIn(BaseModel):
    sources: list[str] = Field(..., min_length=1)
    industry: str
    cycle_type: str
    cycle_config: dict[str, Any] = Field(default_factory=dict)
    behaviors: list[str] = Field(default_factory=list)


class AttendanceProfileActivateIn(BaseModel):
    enabled_modes: list[str] = Field(..., min_length=1)
    default_source: Optional[str] = None
    terminology_pack_code: Optional[str] = None
    engine_version: str = Field(default="v2")


class SourcePluginOut(BaseModel):
    source_code: str
    display_name: str
    is_active: bool = True
    sort_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class OrganisationSourceConfigOut(BaseModel):
    source_code: str
    enabled: bool
    settings_json: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class OrganisationSourceConfigPatch(BaseModel):
    enabled: Optional[bool] = None
    settings_json: Optional[dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------


class LabelsOut(BaseModel):
    locale: str
    version: int
    labels: dict[str, str]


class LabelPatchItem(BaseModel):
    label_key: str
    value: str
    locale: str = "en"


class LabelsPatchIn(BaseModel):
    labels: list[LabelPatchItem]


class TerminologyPackOut(BaseModel):
    pack_code: str
    industry: Optional[str] = None
    locale: str = "en"
    version: int = 1

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Feature flags
# ---------------------------------------------------------------------------


class FeatureFlagOut(BaseModel):
    flag_code: str
    description: Optional[str] = None
    enabled: bool
    config_json: dict[str, Any] = Field(default_factory=dict)


class FeatureFlagPatchIn(BaseModel):
    enabled: bool
    config_json: Optional[dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Holidays (organisation_holidays CRUD)
# ---------------------------------------------------------------------------


class HolidayCreate(BaseModel):
    holiday_date: date
    name: Optional[str] = None
    is_optional: bool = False


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    is_optional: Optional[bool] = None


class HolidayOut(BaseModel):
    holiday_id: UUID
    organisation_id: UUID
    holiday_date: date
    name: Optional[str] = None
    is_optional: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Raw events
# ---------------------------------------------------------------------------


class RawEventIngestIn(BaseModel):
    employee_id: UUID
    source: str
    punch_time: datetime
    event_type: str = "IN"
    device_id: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    geo_radius: Optional[int] = None
    qr_reference: Optional[str] = None
    biometric_reference: Optional[str] = None
    image_url: Optional[str] = None
    shift_id: Optional[UUID] = None
    roster_id: Optional[UUID] = None
    confidence_score: Optional[Decimal] = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class RawEventOut(BaseModel):
    event_id: UUID
    organisation_id: UUID
    employee_id: UUID
    source: str
    punch_time: datetime
    event_type: str
    verification_status: str
    anomaly_flag: bool
    duplicate_flag: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Shift / roster
# ---------------------------------------------------------------------------


class ShiftTemplateCreate(BaseModel):
    code: str
    name: str
    shift_type: str = "fixed"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    break_minutes: int = 0
    cross_midnight: bool = False
    night_shift: bool = False
    capacity: Optional[int] = None
    config_json: dict[str, Any] = Field(default_factory=dict)


class ShiftTemplateOut(ShiftTemplateCreate):
    template_id: UUID
    organisation_id: UUID
    is_active: bool = True
    version: int = 1

    model_config = ConfigDict(from_attributes=True)


class RosterPlanCreate(BaseModel):
    name: str
    period_start: date
    period_end: date


class RosterAssignmentIn(BaseModel):
    employee_id: UUID
    work_date: date
    shift_id: Optional[UUID] = None


class RosterPlanOut(BaseModel):
    roster_plan_id: UUID
    organisation_id: UUID
    name: str
    period_start: date
    period_end: date
    status: str
    version: int

    model_config = ConfigDict(from_attributes=True)


class RosterAssignmentOut(BaseModel):
    assignment_id: UUID
    roster_plan_id: UUID
    employee_id: UUID
    work_date: date
    shift_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)


class RosterAssignmentsBulkIn(BaseModel):
    assignments: list[RosterAssignmentIn] = Field(..., min_length=1)


class AnalyticsSummaryOut(BaseModel):
    from_date: str
    to_date: str
    status_counts: dict[str, int]
    open_exceptions: int
    raw_events: int
    recompute_jobs_total: int


# ---------------------------------------------------------------------------
# Policy
# ---------------------------------------------------------------------------


class PolicyCreate(BaseModel):
    name: str
    scope_level: str = "organisation"
    scope_ref_id: Optional[UUID] = None


class PolicyRuleIn(BaseModel):
    rule_type: str
    priority: int = 100
    condition_json: dict[str, Any] = Field(default_factory=dict)
    action_json: dict[str, Any] = Field(default_factory=dict)


class PolicyOut(BaseModel):
    policy_id: UUID
    organisation_id: UUID
    name: str
    scope_level: str
    status: str
    version: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class ExceptionOut(BaseModel):
    exception_id: UUID
    employee_id: UUID
    work_date: date
    exception_type: str
    severity: str
    status: str
    details_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExceptionResolveIn(BaseModel):
    resolution_type: str
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Recompute
# ---------------------------------------------------------------------------


class RecomputeJobIn(BaseModel):
    scope_type: str = Field(..., description="employee_day | employee_month | org_month")
    employee_id: Optional[UUID] = None
    work_date: Optional[date] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None


class RecomputeJobOut(BaseModel):
    job_id: UUID
    organisation_id: UUID
    scope_type: str
    status: str
    stats_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Approvals (WF)
# ---------------------------------------------------------------------------


class WfApprovalRequestCreate(BaseModel):
    workflow_type: str
    entity_type: str
    entity_id: UUID
    employee_id: Optional[UUID] = None
    payload_json: dict[str, Any] = Field(default_factory=dict)


class WfApprovalDecisionIn(BaseModel):
    action: str = Field(..., description="approve | reject")
    comment: Optional[str] = None


class WfApprovalRequestOut(BaseModel):
    request_id: UUID
    entity_type: str
    entity_id: UUID
    status: str
    current_level: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# ESS
# ---------------------------------------------------------------------------


class EssRegularizationIn(BaseModel):
    work_date: date
    requested_status: str
    reason: Optional[str] = None


class EssPunchCorrectionIn(BaseModel):
    work_date: date
    punch_time: datetime
    event_type: str = "IN"
    reason: Optional[str] = None


class EssAttendanceDisputeIn(BaseModel):
    work_date: date
    dispute_type: str
    description: Optional[str] = None


class EssMobileAttendanceIn(BaseModel):
    employee_id: Optional[UUID] = None
    punch_time: datetime
    event_type: str = "IN"
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    device_id: Optional[str] = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ShiftSegmentIn(BaseModel):
    segment_index: int = 0
    start_time: str
    end_time: str
    break_after_minutes: int = 0
    break_paid: bool = False
    is_standby: bool = False
    is_on_call: bool = False


class ShiftTemplateInheritIn(BaseModel):
    code: str
    name: str
    effective_from: date
    effective_to: Optional[date] = None


class ShiftAllocateIn(BaseModel):
    employee_id: UUID
    work_date: date
    roster_plan_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
