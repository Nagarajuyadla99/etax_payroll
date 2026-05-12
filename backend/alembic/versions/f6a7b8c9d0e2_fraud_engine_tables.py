"""fraud engine tables

Revision ID: f6a7b8c9d0e2
Revises: e5f6a7b8c9d1
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f6a7b8c9d0e2"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fraud_rules",
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=20), server_default=sa.text("'medium'"), nullable=False),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("fraud_rules_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("rule_id", name=op.f("fraud_rules_pkey")),
        sa.UniqueConstraint("organisation_id", "code", name=op.f("ux_fraud_rules_org_code")),
    )

    op.create_table(
        "fraud_alerts",
        sa.Column("alert_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rule_code", sa.String(length=60), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'open'"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("salary_batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("salary_batch_item_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider_payout_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("acknowledged_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("acknowledged_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolved_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["acknowledged_by"], ["users.user_id"], name=op.f("fraud_alerts_acknowledged_by_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.employee_id"], name=op.f("fraud_alerts_employee_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("fraud_alerts_organisation_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["provider_payout_id"], ["provider_payouts.provider_payout_id"], name=op.f("fraud_alerts_provider_payout_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.user_id"], name=op.f("fraud_alerts_resolved_by_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["salary_batch_id"], ["salary_batches.batch_id"], name=op.f("fraud_alerts_salary_batch_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["salary_batch_item_id"], ["salary_batch_items.item_id"], name=op.f("fraud_alerts_salary_batch_item_id_fkey"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("alert_id", name=op.f("fraud_alerts_pkey")),
    )

    op.create_table(
        "risk_scores",
        sa.Column("risk_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=30), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("band", sa.String(length=20), server_default=sa.text("'low'"), nullable=False),
        sa.Column("signals", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("risk_scores_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("risk_id", name=op.f("risk_scores_pkey")),
        sa.UniqueConstraint("organisation_id", "entity_type", "entity_id", name=op.f("ux_risk_score_entity")),
    )


def downgrade() -> None:
    op.drop_table("risk_scores")
    op.drop_table("fraud_alerts")
    op.drop_table("fraud_rules")

