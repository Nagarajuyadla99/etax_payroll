"""Universal workforce management engine — additive extension tables.

Revision ID: a1b2c3d4e5f6
Revises: e3f4a5b6c7d8
Create Date: 2026-05-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "e3f4a5b6c7d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    # --- attendances additive columns ---
    for stmt in (
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS payable_fraction numeric(5,4)",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS policy_result_json jsonb",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS attendance_source varchar(50)",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS approval_status varchar(20)",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS overtime_hours numeric(8,2)",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS late_minutes integer",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS early_exit_minutes integer",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS shift_id uuid",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS roster_assignment_id uuid",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS engine_version varchar(20)",
    ):
        op.execute(sa.text(stmt))

    op.create_table(
        "feature_flags",
        sa.Column("flag_code", sa.String(80), primary_key=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("module", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "organization_feature_flags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("flag_code", sa.String(80), sa.ForeignKey("feature_flags.flag_code", ondelete="CASCADE"), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("config_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("enabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("organisation_id", "flag_code", name="ux_org_feature_flag"),
    )
    op.create_index("ix_org_feature_flags_org", "organization_feature_flags", ["organisation_id"])

    op.create_table(
        "organisation_attendance_profile",
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("engine_version", sa.String(20), server_default=sa.text("'legacy'"), nullable=False),
        sa.Column("enabled_modes", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("default_source", sa.String(50), nullable=True),
        sa.Column("label_version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("terminology_pack_code", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "wf_attendance_source_plugins",
        sa.Column("source_code", sa.String(50), primary_key=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("handler_class", sa.String(255), nullable=True),
        sa.Column("config_schema_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("event_types", postgresql.JSONB(), server_default=sa.text("'[\"IN\",\"OUT\"]'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.create_table(
        "organisation_source_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_code", sa.String(50), sa.ForeignKey("wf_attendance_source_plugins.source_code", ondelete="CASCADE"), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("settings_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("validations_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("organisation_id", "source_code", name="ux_org_source_config"),
    )

    op.create_table(
        "label_master",
        sa.Column("label_key", sa.String(120), primary_key=True),
        sa.Column("category", sa.String(50), server_default=sa.text("'attendance'"), nullable=False),
        sa.Column("default_en", sa.String(255), nullable=False),
        sa.Column("default_hi", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_table(
        "terminology_pack",
        sa.Column("pack_code", sa.String(50), primary_key=True),
        sa.Column("industry", sa.String(80), nullable=True),
        sa.Column("locale", sa.String(10), server_default=sa.text("'en'"), nullable=False),
        sa.Column("labels_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.create_table(
        "organization_labels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("label_key", sa.String(120), nullable=False),
        sa.Column("locale", sa.String(10), server_default=sa.text("'en'"), nullable=False),
        sa.Column("value", sa.String(255), nullable=False),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("organisation_id", "label_key", "locale", name="ux_org_label_locale"),
    )
    op.create_index("ix_org_labels_org", "organization_labels", ["organisation_id"])

    op.create_table(
        "localization_registry",
        sa.Column("locale_code", sa.String(10), primary_key=True),
        sa.Column("label_key", sa.String(120), primary_key=True),
        sa.Column("platform_default", sa.String(255), nullable=False),
    )

    op.create_table(
        "raw_attendance_events",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("device_id", sa.String(120), nullable=True),
        sa.Column("punch_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("event_type", sa.String(20), server_default=sa.text("'IN'"), nullable=False),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("geo_radius", sa.Integer(), nullable=True),
        sa.Column("qr_reference", sa.String(120), nullable=True),
        sa.Column("biometric_reference", sa.String(120), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("shift_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("roster_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("imported_batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("verification_status", sa.String(20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("anomaly_flag", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("duplicate_flag", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("confidence_score", sa.Numeric(5, 4), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_raw_att_org_emp_punch", "raw_attendance_events", ["organisation_id", "employee_id", "punch_time"])
    op.create_index("ix_raw_att_source_created", "raw_attendance_events", ["source", "created_at"])

    # Shift & roster
    op.create_table(
        "wf_shift_templates",
        sa.Column("template_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("shift_type", sa.String(50), server_default=sa.text("'fixed'"), nullable=False),
        sa.Column("start_time", sa.String(8), nullable=True),
        sa.Column("end_time", sa.String(8), nullable=True),
        sa.Column("break_minutes", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("cross_midnight", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("night_shift", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("config_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("organisation_id", "code", name="ux_wf_shift_template_code"),
    )
    op.create_table(
        "wf_shifts",
        sa.Column("shift_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_shift_templates.template_id", ondelete="SET NULL"), nullable=True),
        sa.Column("work_date", sa.Date(), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("start_time", sa.String(8), nullable=False),
        sa.Column("end_time", sa.String(8), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "wf_roster_plans",
        sa.Column("roster_plan_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'draft'"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("frozen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "wf_roster_assignments",
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("roster_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_roster_plans.roster_plan_id", ondelete="CASCADE"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("shift_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_shifts.shift_id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("employee_id", "work_date", "roster_plan_id", name="ux_wf_roster_emp_date_plan"),
    )
    op.create_index("ix_wf_roster_assign_org_date", "wf_roster_assignments", ["organisation_id", "work_date"])

    op.create_table(
        "wf_attendance_cycles",
        sa.Column("cycle_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("cycle_type", sa.String(50), nullable=False),
        sa.Column("config_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "wf_weekly_off_rules",
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_type", sa.String(50), nullable=False),
        sa.Column("pattern_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("priority", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )

    op.create_table(
        "wf_policy_packs",
        sa.Column("pack_code", sa.String(50), primary_key=True),
        sa.Column("industry", sa.String(80), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("rules_json", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.create_table(
        "wf_attendance_policies",
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("scope_level", sa.String(20), server_default=sa.text("'organisation'"), nullable=False),
        sa.Column("scope_ref_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'draft'"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=True),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "wf_policy_rules",
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_attendance_policies.policy_id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_type", sa.String(50), nullable=False),
        sa.Column("priority", sa.Integer(), server_default=sa.text("100"), nullable=False),
        sa.Column("condition_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("action_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.create_table(
        "wf_policy_versions",
        sa.Column("version_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_attendance_policies.policy_id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("rules_snapshot_json", postgresql.JSONB(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("published_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
    )

    op.create_table(
        "attendance_exceptions",
        sa.Column("exception_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("exception_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), server_default=sa.text("'medium'"), nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'open'"), nullable=False),
        sa.Column("source_event_ids", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("details_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_att_exc_org_emp_date", "attendance_exceptions", ["organisation_id", "employee_id", "work_date"])

    op.create_table(
        "attendance_exception_rules",
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=True),
        sa.Column("exception_type", sa.String(50), nullable=False),
        sa.Column("condition_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("auto_action", sa.String(50), nullable=True),
        sa.Column("priority", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.create_table(
        "attendance_exception_resolution",
        sa.Column("resolution_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("exception_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attendance_exceptions.exception_id", ondelete="CASCADE"), nullable=False),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolution_type", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "wf_recompute_jobs",
        sa.Column("job_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("scope_type", sa.String(30), nullable=False),
        sa.Column("scope_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("policy_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("stats_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "wf_recompute_job_items",
        sa.Column("item_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_recompute_jobs.job_id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("ix_wf_recompute_items_job", "wf_recompute_job_items", ["job_id"])

    op.create_table(
        "attendance_snapshot",
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("pay_period_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pay_periods.pay_period_id", ondelete="CASCADE"), nullable=True),
        sa.Column("snapshot_hash", sa.String(64), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(), nullable=False),
        sa.Column("policy_version_ids", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("engine_version", sa.String(20), server_default=sa.text("'legacy'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "policy_snapshot",
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("policy_version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rules_json", postgresql.JSONB(), nullable=False),
        sa.Column("effective_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "wf_attendance_layers",
        sa.Column("layer_code", sa.String(30), primary_key=True),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_table(
        "wf_attendance_layer_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("layer_code", sa.String(30), sa.ForeignKey("wf_attendance_layers.layer_code", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("units_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("employee_id", "work_date", "layer_code", name="ux_wf_layer_emp_date"),
    )

    op.create_table(
        "wf_approval_workflows",
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("workflow_type", sa.String(50), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("levels_json", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.create_table(
        "wf_approval_requests",
        sa.Column("request_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_approval_workflows.workflow_id", ondelete="SET NULL"), nullable=True),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("current_level", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "wf_approval_actions",
        sa.Column("action_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_approval_requests.request_id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "wf_attendance_freeze_log",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("pay_period_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pay_periods.pay_period_id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("range_start", sa.Date(), nullable=True),
        sa.Column("range_end", sa.Date(), nullable=True),
        sa.Column("performed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "wf_audit_log",
        sa.Column("audit_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.String(80), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("before_json", postgresql.JSONB(), nullable=True),
        sa.Column("after_json", postgresql.JSONB(), nullable=True),
        sa.Column("performed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_wf_audit_org_created", "wf_audit_log", ["organisation_id", "created_at"])

    # Seed attendance layers
    op.execute(
        sa.text(
            "INSERT INTO wf_attendance_layers (layer_code, description) VALUES "
            "('operational', 'HR operational attendance'), "
            "('payroll', 'Payroll attendance scalars input'), "
            "('billing', 'Client billing attendance'), "
            "('compliance', 'Statutory compliance attendance') "
            "ON CONFLICT (layer_code) DO NOTHING"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    tables = [
        "wf_audit_log",
        "wf_attendance_freeze_log",
        "wf_approval_actions",
        "wf_approval_requests",
        "wf_approval_workflows",
        "wf_attendance_layer_results",
        "wf_attendance_layers",
        "policy_snapshot",
        "attendance_snapshot",
        "wf_recompute_job_items",
        "wf_recompute_jobs",
        "attendance_exception_resolution",
        "attendance_exception_rules",
        "attendance_exceptions",
        "wf_policy_versions",
        "wf_policy_rules",
        "wf_attendance_policies",
        "wf_policy_packs",
        "wf_weekly_off_rules",
        "wf_attendance_cycles",
        "wf_roster_assignments",
        "wf_roster_plans",
        "wf_shifts",
        "wf_shift_templates",
        "raw_attendance_events",
        "localization_registry",
        "organization_labels",
        "terminology_pack",
        "label_master",
        "organisation_source_config",
        "wf_attendance_source_plugins",
        "organisation_attendance_profile",
        "organization_feature_flags",
        "feature_flags",
    ]
    for t in tables:
        op.drop_table(t)
