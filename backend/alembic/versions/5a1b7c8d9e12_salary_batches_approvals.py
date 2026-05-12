"""salary batches approvals artifacts audit

Revision ID: 5a1b7c8d9e12
Revises: 4c9d6a2e1b11
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "5a1b7c8d9e12"
down_revision: Union[str, Sequence[str], None] = "4c9d6a2e1b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "salary_batches",
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payroll_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pay_period_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("batch_ref", sa.String(length=50), nullable=False),
        sa.Column("total_employees", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("total_amount", sa.Numeric(precision=18, scale=4), server_default=sa.text("0"), nullable=False),
        sa.Column("status", sa.String(length=30), server_default=sa.text("'draft'"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_id"], name=op.f("salary_batches_created_by_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("salary_batches_organisation_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["pay_period_id"], ["pay_periods.pay_period_id"], name=op.f("salary_batches_pay_period_id_fkey"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["payroll_run_id"], ["payroll_runs.payroll_run_id"], name=op.f("salary_batches_payroll_run_id_fkey"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("batch_id", name=op.f("salary_batches_pkey")),
        sa.UniqueConstraint("organisation_id", "payroll_run_id", name=op.f("ux_salary_batch_org_run")),
    )

    op.create_table(
        "salary_batch_items",
        sa.Column("item_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("employee_bank_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("payout_ref", sa.Text(), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("last_attempt_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["batch_id"], ["salary_batches.batch_id"], name=op.f("salary_batch_items_batch_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_bank_account_id"], ["employee_bank_accounts.bank_account_id"], name=op.f("salary_batch_items_employee_bank_account_id_fkey"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.employee_id"], name=op.f("salary_batch_items_employee_id_fkey"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("item_id", name=op.f("salary_batch_items_pkey")),
        sa.UniqueConstraint("batch_id", "employee_id", name=op.f("ux_salary_batch_item_batch_employee")),
    )

    op.create_table(
        "approvals",
        sa.Column("approval_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("step", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("decided_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.user_id"], name=op.f("approvals_actor_user_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["batch_id"], ["salary_batches.batch_id"], name=op.f("approvals_batch_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("approvals_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("approval_id", name=op.f("approvals_pkey")),
        sa.UniqueConstraint("entity_type", "entity_id", "step", name=op.f("ux_approval_entity_step")),
    )

    op.create_table(
        "payment_artifacts",
        sa.Column("artifact_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=30), nullable=False),
        sa.Column("format", sa.String(length=10), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["batch_id"], ["salary_batches.batch_id"], name=op.f("payment_artifacts_batch_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("artifact_id", name=op.f("payment_artifacts_pkey")),
        sa.UniqueConstraint("batch_id", "kind", name=op.f("ux_payment_artifact_batch_kind")),
    )

    op.create_table(
        "audit_logs",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=200), nullable=False),
        sa.Column("entity", sa.String(length=100), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("occurred_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("audit_logs_organisation_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], name=op.f("audit_logs_user_id_fkey"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("log_id", name=op.f("audit_logs_pkey")),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("payment_artifacts")
    op.drop_table("approvals")
    op.drop_table("salary_batch_items")
    op.drop_table("salary_batches")

