"""
Enterprise WF layer models (additive).

Shift engine, roster state machine, devices, observability, freezes, projections.
"""

from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.sql import func

from database import Base

# Roster lifecycle states
ROSTER_DRAFT = "draft"
ROSTER_PENDING_APPROVAL = "pending_approval"
ROSTER_APPROVED = "approved"
ROSTER_PUBLISHED = "published"
ROSTER_FROZEN = "frozen"
ROSTER_ARCHIVED = "archived"

ROSTER_TRANSITIONS: dict[str, set[str]] = {
    ROSTER_DRAFT: {ROSTER_PENDING_APPROVAL, ROSTER_ARCHIVED},
    ROSTER_PENDING_APPROVAL: {ROSTER_APPROVED, ROSTER_DRAFT, ROSTER_ARCHIVED},
    ROSTER_APPROVED: {ROSTER_PUBLISHED, ROSTER_DRAFT},
    ROSTER_PUBLISHED: {ROSTER_FROZEN, ROSTER_ARCHIVED},
    ROSTER_FROZEN: {ROSTER_ARCHIVED},
    ROSTER_ARCHIVED: set(),
}

FREEZE_ATTENDANCE = "attendance"
FREEZE_PAYROLL = "payroll"
FREEZE_FINANCIAL = "financial"


class WfShiftSegment(Base):
    """Split-shift segments (paid/unpaid breaks between segments)."""

    __tablename__ = "wf_shift_segments"

    segment_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shift_id = Column(PG_UUID(as_uuid=True), ForeignKey("wf_shifts.shift_id", ondelete="CASCADE"), nullable=False)
    segment_index = Column(Integer, nullable=False, server_default=text("0"))
    start_time = Column(String(8), nullable=False)
    end_time = Column(String(8), nullable=False)
    break_after_minutes = Column(Integer, nullable=False, server_default=text("0"))
    break_paid = Column(Boolean, nullable=False, server_default=text("false"))
    is_standby = Column(Boolean, nullable=False, server_default=text("false"))
    is_on_call = Column(Boolean, nullable=False, server_default=text("false"))


class WfShiftVersion(Base):
    """Temporal versioning for shift templates."""

    __tablename__ = "wf_shift_versions"

    version_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(PG_UUID(as_uuid=True), ForeignKey("wf_shift_templates.template_id", ondelete="CASCADE"))
    organisation_id = Column(PG_UUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"))
    parent_template_id = Column(PG_UUID(as_uuid=True), nullable=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    version_start = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    version_end = Column(DateTime(timezone=True), nullable=True)
    config_snapshot_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))


class WfRosterStateLog(Base):
    __tablename__ = "wf_roster_state_log"

    log_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roster_plan_id = Column(PG_UUID(as_uuid=True), ForeignKey("wf_roster_plans.roster_plan_id", ondelete="CASCADE"))
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=False)
    actor_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfPolicyExecutionLog(Base):
    """Rule orchestrator trace — explainability per employee-day."""

    __tablename__ = "wf_policy_execution_log"

    log_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(PG_UUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"))
    employee_id = Column(PG_UUID(as_uuid=True), ForeignKey("employees.employee_id", ondelete="CASCADE"))
    work_date = Column(Date, nullable=False)
    execution_graph_json = Column(JSONB, nullable=False)
    stages_json = Column(JSONB, nullable=False)
    final_status = Column(String(20), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_wf_policy_exec_org_emp_date", "organisation_id", "employee_id", "work_date"),
    )


class WfOpsMetric(Base):
    __tablename__ = "wf_ops_metrics"

    metric_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(PG_UUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=True)
    metric_name = Column(String(80), nullable=False)
    metric_value = Column(Numeric(14, 4), nullable=False)
    labels_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_wf_ops_metrics_name_time", "metric_name", "recorded_at"),)


class WfDeadLetterEvent(Base):
    __tablename__ = "wf_dead_letter_events"

    dlq_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(PG_UUID(as_uuid=True), nullable=True)
    event_type = Column(String(80), nullable=False)
    payload_json = Column(JSONB, nullable=False)
    error_message = Column(Text, nullable=True)
    attempts = Column(Integer, nullable=False, server_default=text("0"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class AttendanceDevice(Base):
    __tablename__ = "attendance_devices"

    device_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(PG_UUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"))
    terminal_code = Column(String(80), nullable=False)
    device_type = Column(String(50), nullable=False, server_default=text("'biometric'"))
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    health_status = Column(String(20), nullable=False, server_default=text("'unknown'"))
    config_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organisation_id", "terminal_code", name="ux_attendance_device_terminal"),
    )


class DeviceHealthLog(Base):
    __tablename__ = "device_health_logs"

    log_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(PG_UUID(as_uuid=True), ForeignKey("attendance_devices.device_id", ondelete="CASCADE"))
    status = Column(String(20), nullable=False)
    details_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DeviceSyncLog(Base):
    __tablename__ = "device_sync_logs"

    sync_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(PG_UUID(as_uuid=True), ForeignKey("attendance_devices.device_id", ondelete="CASCADE"))
    events_received = Column(Integer, nullable=False, server_default=text("0"))
    events_accepted = Column(Integer, nullable=False, server_default=text("0"))
    latency_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfFreezeRecord(Base):
    """Hierarchical freeze: attendance | payroll | financial."""

    __tablename__ = "wf_freeze_records"

    freeze_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(PG_UUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"))
    freeze_level = Column(String(20), nullable=False)
    pay_period_id = Column(PG_UUID(as_uuid=True), ForeignKey("pay_periods.pay_period_id", ondelete="SET NULL"), nullable=True)
    range_start = Column(Date, nullable=True)
    range_end = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    performed_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    released_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_wf_freeze_org_level", "organisation_id", "freeze_level", "is_active"),
    )


class WfAttendanceDailyProjection(Base):
    """Materialized read model — refresh via projection job, not ad-hoc on attendances."""

    __tablename__ = "wf_attendance_daily_projection"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(PG_UUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"))
    employee_id = Column(PG_UUID(as_uuid=True), ForeignKey("employees.employee_id", ondelete="CASCADE"))
    work_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=True)
    payable_fraction = Column(Numeric(5, 4), nullable=True)
    overtime_hours = Column(Numeric(8, 2), nullable=True)
    late_minutes = Column(Integer, nullable=True)
    open_exceptions = Column(Integer, nullable=False, server_default=text("0"))
    projection_version = Column(Integer, nullable=False, server_default=text("1"))
    refreshed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", name="ux_wf_att_daily_proj"),
        Index("ix_wf_att_proj_org_date", "organisation_id", "work_date"),
    )


# Canonical domain event types
WF_EVENT_ATTENDANCE_RECORDED = "wf.AttendanceRecorded"
WF_EVENT_ATTENDANCE_RECOMPUTED = "wf.AttendanceRecomputed"
WF_EVENT_ROSTER_PUBLISHED = "wf.RosterPublished"
WF_EVENT_EXCEPTION_RAISED = "wf.ExceptionRaised"
WF_EVENT_EXCEPTION_RESOLVED = "wf.ExceptionResolved"
WF_EVENT_ATTENDANCE_LOCKED = "wf.AttendanceLocked"
WF_EVENT_PAYROLL_FINALIZED = "wf.PayrollFinalized"

WF_EVENT_TYPES = frozenset(
    {
        WF_EVENT_ATTENDANCE_RECORDED,
        WF_EVENT_ATTENDANCE_RECOMPUTED,
        WF_EVENT_ROSTER_PUBLISHED,
        WF_EVENT_EXCEPTION_RAISED,
        WF_EVENT_EXCEPTION_RESOLVED,
        WF_EVENT_ATTENDANCE_LOCKED,
        WF_EVENT_PAYROLL_FINALIZED,
    }
)
