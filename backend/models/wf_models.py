"""
Workforce Management (WF) extension models.

Additive only — does not replace attendances, leaves, or organisation_holidays.
"""

from __future__ import annotations

import uuid
from enum import Enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
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


# ---------------------------------------------------------------------------
# Feature flags
# ---------------------------------------------------------------------------


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    flag_code = Column(String(80), primary_key=True)
    description = Column(Text, nullable=True)
    default_enabled = Column(Boolean, nullable=False, server_default=text("false"))
    module = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class OrganizationFeatureFlag(Base):
    __tablename__ = "organization_feature_flags"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    flag_code = Column(String(80), ForeignKey("feature_flags.flag_code", ondelete="CASCADE"), nullable=False)
    enabled = Column(Boolean, nullable=False, server_default=text("false"))
    config_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    enabled_at = Column(DateTime(timezone=True), nullable=True)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    version_start = Column(DateTime(timezone=True), nullable=True)
    version_end = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organisation_id", "flag_code", name="ux_org_feature_flag"),
        Index("ix_org_feature_flags_org", "organisation_id"),
    )


# ---------------------------------------------------------------------------
# Organisation attendance profile & source plugins
# ---------------------------------------------------------------------------


class OrganisationAttendanceProfile(Base):
    __tablename__ = "organisation_attendance_profile"

    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        primary_key=True,
    )
    engine_version = Column(String(20), nullable=False, server_default=text("'legacy'"))
    enabled_modes = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    default_source = Column(String(50), nullable=True)
    label_version = Column(Integer, nullable=False, server_default=text("1"))
    terminology_pack_code = Column(String(50), nullable=True)
    setup_completed_at = Column(DateTime(timezone=True), nullable=True)
    setup_progress_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    industry_template = Column(String(50), nullable=True)
    attendance_cycle_type = Column(String(30), nullable=True)
    attendance_cycle_config = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    payroll_behavior_config = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    activated_modules_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class WfAttendanceSourcePlugin(Base):
    __tablename__ = "wf_attendance_source_plugins"

    source_code = Column(String(50), primary_key=True)
    display_name = Column(String(120), nullable=False)
    handler_class = Column(String(255), nullable=True)
    config_schema_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    event_types = Column(JSONB, nullable=False, server_default=text("'[\"IN\",\"OUT\"]'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    sort_order = Column(Integer, nullable=False, server_default=text("0"))


class OrganisationSourceConfig(Base):
    __tablename__ = "organisation_source_config"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    source_code = Column(
        String(50),
        ForeignKey("wf_attendance_source_plugins.source_code", ondelete="CASCADE"),
        nullable=False,
    )
    enabled = Column(Boolean, nullable=False, server_default=text("false"))
    settings_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    validations_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organisation_id", "source_code", name="ux_org_source_config"),
    )


# ---------------------------------------------------------------------------
# Labels & terminology
# ---------------------------------------------------------------------------


class LabelMaster(Base):
    __tablename__ = "label_master"

    label_key = Column(String(120), primary_key=True)
    category = Column(String(50), nullable=False, server_default=text("'attendance'"))
    default_en = Column(String(255), nullable=False)
    default_hi = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)


class TerminologyPack(Base):
    __tablename__ = "terminology_pack"

    pack_code = Column(String(50), primary_key=True)
    industry = Column(String(80), nullable=True)
    locale = Column(String(10), nullable=False, server_default=text("'en'"))
    labels_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    version = Column(Integer, nullable=False, server_default=text("1"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))


class OrganizationLabel(Base):
    __tablename__ = "organization_labels"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    label_key = Column(String(120), nullable=False)
    locale = Column(String(10), nullable=False, server_default=text("'en'"))
    value = Column(String(255), nullable=False)
    updated_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    version = Column(Integer, nullable=False, server_default=text("1"))
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    version_start = Column(DateTime(timezone=True), nullable=True)
    version_end = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organisation_id", "label_key", "locale", name="ux_org_label_locale"),
        Index("ix_org_labels_org", "organisation_id"),
    )


class LocalizationRegistry(Base):
    __tablename__ = "localization_registry"

    locale_code = Column(String(10), primary_key=True)
    label_key = Column(String(120), primary_key=True)
    platform_default = Column(String(255), nullable=False)


# ---------------------------------------------------------------------------
# Raw attendance events
# ---------------------------------------------------------------------------


class RawAttendanceEvent(Base):
    __tablename__ = "raw_attendance_events"

    event_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
    )
    source = Column(String(50), nullable=False)
    device_id = Column(String(120), nullable=True)
    punch_time = Column(DateTime(timezone=True), nullable=False)
    event_type = Column(String(20), nullable=False, server_default=text("'IN'"))
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    geo_radius = Column(Integer, nullable=True)
    qr_reference = Column(String(120), nullable=True)
    biometric_reference = Column(String(120), nullable=True)
    image_url = Column(Text, nullable=True)
    shift_id = Column(PG_UUID(as_uuid=True), nullable=True)
    roster_id = Column(PG_UUID(as_uuid=True), nullable=True)
    imported_batch_id = Column(PG_UUID(as_uuid=True), nullable=True)
    verification_status = Column(String(20), nullable=False, server_default=text("'pending'"))
    anomaly_flag = Column(Boolean, nullable=False, server_default=text("false"))
    duplicate_flag = Column(Boolean, nullable=False, server_default=text("false"))
    confidence_score = Column(Numeric(5, 4), nullable=True)
    metadata_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_raw_att_org_emp_punch", "organisation_id", "employee_id", "punch_time"),
        Index("ix_raw_att_source_created", "source", "created_at"),
    )


# ---------------------------------------------------------------------------
# Shift & roster
# ---------------------------------------------------------------------------


class WfShiftTemplate(Base):
    __tablename__ = "wf_shift_templates"

    template_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    code = Column(String(50), nullable=False)
    name = Column(String(120), nullable=False)
    shift_type = Column(String(50), nullable=False, server_default=text("'fixed'"))
    start_time = Column(String(8), nullable=True)
    end_time = Column(String(8), nullable=True)
    break_minutes = Column(Integer, nullable=False, server_default=text("0"))
    cross_midnight = Column(Boolean, nullable=False, server_default=text("false"))
    night_shift = Column(Boolean, nullable=False, server_default=text("false"))
    capacity = Column(Integer, nullable=True)
    config_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    parent_template_id = Column(PG_UUID(as_uuid=True), nullable=True)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    version = Column(Integer, nullable=False, server_default=text("1"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organisation_id", "code", name="ux_wf_shift_template_code"),
    )


class WfShift(Base):
    __tablename__ = "wf_shifts"

    shift_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    template_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wf_shift_templates.template_id", ondelete="SET NULL"),
        nullable=True,
    )
    work_date = Column(Date, nullable=True)
    name = Column(String(120), nullable=False)
    start_time = Column(String(8), nullable=False)
    end_time = Column(String(8), nullable=False)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfRosterPlan(Base):
    __tablename__ = "wf_roster_plans"

    roster_plan_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(120), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, server_default=text("'draft'"))
    version = Column(Integer, nullable=False, server_default=text("1"))
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    frozen_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfRosterAssignment(Base):
    __tablename__ = "wf_roster_assignments"

    assignment_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roster_plan_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wf_roster_plans.roster_plan_id", ondelete="CASCADE"),
        nullable=False,
    )
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
    )
    work_date = Column(Date, nullable=False)
    shift_id = Column(PG_UUID(as_uuid=True), ForeignKey("wf_shifts.shift_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", "roster_plan_id", name="ux_wf_roster_emp_date_plan"),
        Index("ix_wf_roster_assign_org_date", "organisation_id", "work_date"),
    )


# ---------------------------------------------------------------------------
# Attendance cycle & policy
# ---------------------------------------------------------------------------


class WfAttendanceCycle(Base):
    __tablename__ = "wf_attendance_cycles"

    cycle_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    cycle_type = Column(String(50), nullable=False)
    config_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfWeeklyOffRule(Base):
    __tablename__ = "wf_weekly_off_rules"

    rule_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    rule_type = Column(String(50), nullable=False)
    pattern_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    priority = Column(Integer, nullable=False, server_default=text("0"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))


class WfPolicyPack(Base):
    __tablename__ = "wf_policy_packs"

    pack_code = Column(String(50), primary_key=True)
    industry = Column(String(80), nullable=True)
    name = Column(String(120), nullable=False)
    rules_json = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))


class WfAttendancePolicy(Base):
    __tablename__ = "wf_attendance_policies"

    policy_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(120), nullable=False)
    scope_level = Column(String(20), nullable=False, server_default=text("'organisation'"))
    scope_ref_id = Column(PG_UUID(as_uuid=True), nullable=True)
    status = Column(String(20), nullable=False, server_default=text("'draft'"))
    version = Column(Integer, nullable=False, server_default=text("1"))
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfPolicyRule(Base):
    __tablename__ = "wf_policy_rules"

    rule_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wf_attendance_policies.policy_id", ondelete="CASCADE"),
        nullable=False,
    )
    rule_type = Column(String(50), nullable=False)
    priority = Column(Integer, nullable=False, server_default=text("100"))
    condition_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    action_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))


class WfPolicyVersion(Base):
    __tablename__ = "wf_policy_versions"

    version_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wf_attendance_policies.policy_id", ondelete="CASCADE"),
        nullable=False,
    )
    version = Column(Integer, nullable=False)
    rules_snapshot_json = Column(JSONB, nullable=False)
    published_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    published_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class AttendanceException(Base):
    __tablename__ = "attendance_exceptions"

    exception_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
    )
    work_date = Column(Date, nullable=False)
    exception_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False, server_default=text("'medium'"))
    status = Column(String(20), nullable=False, server_default=text("'open'"))
    source_event_ids = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    rule_id = Column(PG_UUID(as_uuid=True), nullable=True)
    details_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_att_exc_org_emp_date", "organisation_id", "employee_id", "work_date"),
    )


class AttendanceExceptionRule(Base):
    __tablename__ = "attendance_exception_rules"

    rule_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=True,
    )
    exception_type = Column(String(50), nullable=False)
    condition_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    auto_action = Column(String(50), nullable=True)
    priority = Column(Integer, nullable=False, server_default=text("0"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))


class AttendanceExceptionResolution(Base):
    __tablename__ = "attendance_exception_resolution"

    resolution_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exception_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("attendance_exceptions.exception_id", ondelete="CASCADE"),
        nullable=False,
    )
    resolved_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    resolution_type = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ---------------------------------------------------------------------------
# Recompute jobs
# ---------------------------------------------------------------------------


class WfRecomputeJob(Base):
    __tablename__ = "wf_recompute_jobs"

    job_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    scope_type = Column(String(30), nullable=False)
    scope_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    policy_version_id = Column(PG_UUID(as_uuid=True), nullable=True)
    status = Column(String(20), nullable=False, server_default=text("'pending'"))
    stats_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfRecomputeJobItem(Base):
    __tablename__ = "wf_recompute_job_items"

    item_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wf_recompute_jobs.job_id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id = Column(PG_UUID(as_uuid=True), nullable=False)
    work_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, server_default=text("'pending'"))
    error_message = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_wf_recompute_items_job", "job_id"),
    )


# ---------------------------------------------------------------------------
# Snapshots & multi-layer
# ---------------------------------------------------------------------------


class AttendanceSnapshot(Base):
    __tablename__ = "attendance_snapshot"

    snapshot_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    pay_period_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("pay_periods.pay_period_id", ondelete="CASCADE"),
        nullable=True,
    )
    snapshot_hash = Column(String(64), nullable=False)
    payload_json = Column(JSONB, nullable=False)
    policy_version_ids = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    engine_version = Column(String(20), nullable=False, server_default=text("'legacy'"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PolicySnapshot(Base):
    __tablename__ = "policy_snapshot"

    snapshot_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    policy_version_id = Column(PG_UUID(as_uuid=True), nullable=False)
    rules_json = Column(JSONB, nullable=False)
    effective_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfAttendanceLayer(Base):
    __tablename__ = "wf_attendance_layers"

    layer_code = Column(String(30), primary_key=True)
    description = Column(Text, nullable=True)


class WfAttendanceLayerResult(Base):
    __tablename__ = "wf_attendance_layer_results"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
    )
    work_date = Column(Date, nullable=False)
    layer_code = Column(
        String(30),
        ForeignKey("wf_attendance_layers.layer_code", ondelete="CASCADE"),
        nullable=False,
    )
    status = Column(String(20), nullable=True)
    units_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", "layer_code", name="ux_wf_layer_emp_date"),
    )


# ---------------------------------------------------------------------------
# WF approval workflows (attendance-specific)
# ---------------------------------------------------------------------------


class WfApprovalWorkflow(Base):
    __tablename__ = "wf_approval_workflows"

    workflow_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    workflow_type = Column(String(50), nullable=False)
    name = Column(String(120), nullable=False)
    levels_json = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))


class WfApprovalRequest(Base):
    __tablename__ = "wf_approval_requests"

    request_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    workflow_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wf_approval_workflows.workflow_id", ondelete="SET NULL"),
        nullable=True,
    )
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(PG_UUID(as_uuid=True), nullable=False)
    employee_id = Column(PG_UUID(as_uuid=True), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=True)
    status = Column(String(20), nullable=False, server_default=text("'pending'"))
    current_level = Column(Integer, nullable=False, server_default=text("1"))
    payload_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfApprovalAction(Base):
    __tablename__ = "wf_approval_actions"

    action_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wf_approval_requests.request_id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(20), nullable=False)
    level = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ---------------------------------------------------------------------------
# Audit & freeze
# ---------------------------------------------------------------------------


class WfAttendanceFreezeLog(Base):
    __tablename__ = "wf_attendance_freeze_log"

    log_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    pay_period_id = Column(PG_UUID(as_uuid=True), ForeignKey("pay_periods.pay_period_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(20), nullable=False)
    range_start = Column(Date, nullable=True)
    range_end = Column(Date, nullable=True)
    performed_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WfAuditLog(Base):
    __tablename__ = "wf_audit_log"

    audit_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(80), nullable=False)
    action = Column(String(50), nullable=False)
    before_json = Column(JSONB, nullable=True)
    after_json = Column(JSONB, nullable=True)
    performed_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_wf_audit_org_created", "organisation_id", "created_at"),
    )


# Attendance source mode codes (registry)
ATTENDANCE_SOURCE_MODES = (
    "biometric",
    "mobile_checkin",
    "manual_hr",
    "shift_roster",
    "geo_fence",
    "qr",
    "face_scan",
    "excel_upload",
    "default_present",
    "api_push",
    "browser_login",
    "hybrid",
    "contractor",
    "client_site",
    "calendar_auto",
)
