"""Enterprise WF layers: shift engine, roster SM, devices, observability, freezes, projections.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for stmt in (
        "ALTER TABLE wf_shift_templates ADD COLUMN IF NOT EXISTS parent_template_id uuid",
        "ALTER TABLE wf_shift_templates ADD COLUMN IF NOT EXISTS effective_from date",
        "ALTER TABLE wf_shift_templates ADD COLUMN IF NOT EXISTS effective_to date",
        "ALTER TABLE wf_roster_plans ADD COLUMN IF NOT EXISTS effective_from date",
        "ALTER TABLE wf_roster_plans ADD COLUMN IF NOT EXISTS effective_to date",
        "ALTER TABLE wf_attendance_policies ADD COLUMN IF NOT EXISTS effective_from date",
        "ALTER TABLE wf_attendance_policies ADD COLUMN IF NOT EXISTS effective_to date",
    ):
        op.execute(sa.text(stmt))

    op.create_table(
        "wf_shift_segments",
        sa.Column("segment_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("shift_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_shifts.shift_id", ondelete="CASCADE")),
        sa.Column("segment_index", sa.Integer(), server_default="0"),
        sa.Column("start_time", sa.String(8), nullable=False),
        sa.Column("end_time", sa.String(8), nullable=False),
        sa.Column("break_after_minutes", sa.Integer(), server_default="0"),
        sa.Column("break_paid", sa.Boolean(), server_default="false"),
        sa.Column("is_standby", sa.Boolean(), server_default="false"),
        sa.Column("is_on_call", sa.Boolean(), server_default="false"),
    )
    op.create_table(
        "wf_shift_versions",
        sa.Column("version_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_shift_templates.template_id", ondelete="CASCADE")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE")),
        sa.Column("parent_template_id", postgresql.UUID(as_uuid=True)),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date()),
        sa.Column("version_start", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("version_end", sa.DateTime(timezone=True)),
        sa.Column("config_snapshot_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
    )
    op.create_table(
        "wf_roster_state_log",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("roster_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wf_roster_plans.roster_plan_id", ondelete="CASCADE")),
        sa.Column("from_status", sa.String(30)),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL")),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "wf_policy_execution_log",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE")),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.employee_id", ondelete="CASCADE")),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("execution_graph_json", postgresql.JSONB(), nullable=False),
        sa.Column("stages_json", postgresql.JSONB(), nullable=False),
        sa.Column("final_status", sa.String(20)),
        sa.Column("duration_ms", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_wf_policy_exec_org_emp_date", "wf_policy_execution_log", ["organisation_id", "employee_id", "work_date"])
    op.create_table(
        "wf_ops_metrics",
        sa.Column("metric_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE")),
        sa.Column("metric_name", sa.String(80), nullable=False),
        sa.Column("metric_value", sa.Numeric(14, 4), nullable=False),
        sa.Column("labels_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "wf_dead_letter_events",
        sa.Column("dlq_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True)),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(), nullable=False),
        sa.Column("error_message", sa.Text()),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "attendance_devices",
        sa.Column("device_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE")),
        sa.Column("terminal_code", sa.String(80), nullable=False),
        sa.Column("device_type", sa.String(50), server_default="biometric"),
        sa.Column("location", sa.String(255)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True)),
        sa.Column("health_status", sa.String(20), server_default="unknown"),
        sa.Column("config_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("organisation_id", "terminal_code", name="ux_attendance_device_terminal"),
    )
    op.create_table(
        "device_health_logs",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attendance_devices.device_id", ondelete="CASCADE")),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("details_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "device_sync_logs",
        sa.Column("sync_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attendance_devices.device_id", ondelete="CASCADE")),
        sa.Column("events_received", sa.Integer(), server_default="0"),
        sa.Column("events_accepted", sa.Integer(), server_default="0"),
        sa.Column("latency_ms", sa.Integer()),
        sa.Column("error_message", sa.Text()),
        sa.Column("synced_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "wf_freeze_records",
        sa.Column("freeze_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE")),
        sa.Column("freeze_level", sa.String(20), nullable=False),
        sa.Column("pay_period_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pay_periods.pay_period_id", ondelete="SET NULL")),
        sa.Column("range_start", sa.Date()),
        sa.Column("range_end", sa.Date()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("performed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL")),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("released_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_wf_freeze_org_level", "wf_freeze_records", ["organisation_id", "freeze_level", "is_active"])
    op.create_table(
        "wf_attendance_daily_projection",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.organisation_id", ondelete="CASCADE")),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.employee_id", ondelete="CASCADE")),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20)),
        sa.Column("payable_fraction", sa.Numeric(5, 4)),
        sa.Column("overtime_hours", sa.Numeric(8, 2)),
        sa.Column("late_minutes", sa.Integer()),
        sa.Column("open_exceptions", sa.Integer(), server_default="0"),
        sa.Column("projection_version", sa.Integer(), server_default="1"),
        sa.Column("refreshed_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("employee_id", "work_date", name="ux_wf_att_daily_proj"),
    )
    op.create_index("ix_wf_att_proj_org_date", "wf_attendance_daily_projection", ["organisation_id", "work_date"])


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for t in (
        "wf_attendance_daily_projection",
        "wf_freeze_records",
        "device_sync_logs",
        "device_health_logs",
        "attendance_devices",
        "wf_dead_letter_events",
        "wf_ops_metrics",
        "wf_policy_execution_log",
        "wf_roster_state_log",
        "wf_shift_versions",
        "wf_shift_segments",
    ):
        op.drop_table(t)
