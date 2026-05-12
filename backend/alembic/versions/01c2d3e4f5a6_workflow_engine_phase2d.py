"""workflow engine phase2d

Revision ID: 01c2d3e4f5a6
Revises: f6a7b8c9d0e2
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "01c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "approval_workflows",
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("routing_rule", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("approval_workflows_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("workflow_id", name=op.f("approval_workflows_pkey")),
        sa.UniqueConstraint("organisation_id", "entity_type", "code", name=op.f("ux_workflow_org_entity_code")),
    )

    op.create_table(
        "approval_workflow_steps",
        sa.Column("step_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("step_code", sa.String(length=40), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("require_all", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sla_hours", sa.Integer(), server_default=sa.text("24"), nullable=False),
        sa.Column("min_amount", sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column("max_amount", sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["workflow_id"], ["approval_workflows.workflow_id"], name=op.f("approval_workflow_steps_workflow_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("step_id", name=op.f("approval_workflow_steps_pkey")),
        sa.UniqueConstraint("workflow_id", "step_code", name=op.f("ux_workflow_step_code")),
    )

    op.create_table(
        "approval_delegations",
        sa.Column("delegation_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delegator_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delegate_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), server_default=sa.text("'salary_batch'"), nullable=False),
        sa.Column("step_code", sa.String(length=40), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("starts_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("ends_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["delegate_user_id"], ["users.user_id"], name=op.f("approval_delegations_delegate_user_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["delegator_user_id"], ["users.user_id"], name=op.f("approval_delegations_delegator_user_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("approval_delegations_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("delegation_id", name=op.f("approval_delegations_pkey")),
        sa.UniqueConstraint(
            "organisation_id",
            "delegator_user_id",
            "delegate_user_id",
            "entity_type",
            name=op.f("ux_delegation_unique"),
        ),
    )

    op.add_column(
        "approvals",
        sa.Column("workflow_code", sa.String(length=50), server_default=sa.text("'DEFAULT'"), nullable=False),
    )
    op.add_column(
        "approvals",
        sa.Column("order_index", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    op.add_column("approvals", sa.Column("parallel_group", sa.String(length=50), nullable=True))
    op.add_column("approvals", sa.Column("due_at", postgresql.TIMESTAMP(timezone=True), nullable=True))
    op.add_column("approvals", sa.Column("decision_token", sa.String(length=80), nullable=True))
    op.add_column(
        "approvals",
        sa.Column("decided_by_delegation_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        op.f("approvals_decided_by_delegation_id_fkey"),
        "approvals",
        "approval_delegations",
        ["decided_by_delegation_id"],
        ["delegation_id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("approvals_decided_by_delegation_id_fkey"), "approvals", type_="foreignkey")
    op.drop_column("approvals", "decided_by_delegation_id")
    op.drop_column("approvals", "decision_token")
    op.drop_column("approvals", "due_at")
    op.drop_column("approvals", "parallel_group")
    op.drop_column("approvals", "order_index")
    op.drop_column("approvals", "workflow_code")
    op.drop_table("approval_delegations")
    op.drop_table("approval_workflow_steps")
    op.drop_table("approval_workflows")

