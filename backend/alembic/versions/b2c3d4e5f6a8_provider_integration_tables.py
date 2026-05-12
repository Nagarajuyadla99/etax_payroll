"""provider integration tables

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b2c3d4e5f6a8"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "provider_beneficiaries",
        sa.Column("provider_beneficiary_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_code", sa.String(length=30), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_bank_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_ref", sa.String(length=120), nullable=False),
        sa.Column("sync_status", sa.String(length=30), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("verification_status", sa.String(length=30), server_default=sa.text("'unknown'"), nullable=False),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["employee_bank_account_id"], ["employee_bank_accounts.bank_account_id"], name=op.f("provider_beneficiaries_employee_bank_account_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.employee_id"], name=op.f("provider_beneficiaries_employee_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("provider_beneficiaries_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("provider_beneficiary_id", name=op.f("provider_beneficiaries_pkey")),
        sa.UniqueConstraint("provider_code", "employee_bank_account_id", name=op.f("ux_provider_beneficiary_account")),
    )

    op.create_table(
        "provider_payouts",
        sa.Column("provider_payout_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_code", sa.String(length=30), nullable=False),
        sa.Column("salary_batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("salary_batch_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_beneficiary_ref", sa.String(length=120), nullable=False),
        sa.Column("provider_payout_ref", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=30), server_default=sa.text("'queued'"), nullable=False),
        sa.Column("utr", sa.String(length=120), nullable=True),
        sa.Column("settlement_id", sa.String(length=120), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("raw", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("provider_payouts_organisation_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["salary_batch_id"], ["salary_batches.batch_id"], name=op.f("provider_payouts_salary_batch_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["salary_batch_item_id"], ["salary_batch_items.item_id"], name=op.f("provider_payouts_salary_batch_item_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("provider_payout_id", name=op.f("provider_payouts_pkey")),
        sa.UniqueConstraint("provider_code", "provider_payout_ref", name=op.f("ux_provider_payout_ref")),
        sa.UniqueConstraint("salary_batch_item_id", name=op.f("ux_provider_payout_item")),
    )

    op.create_table(
        "webhook_events",
        sa.Column("webhook_event_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("provider_code", sa.String(length=30), nullable=False),
        sa.Column("event_id", sa.String(length=120), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=True),
        sa.Column("signature_valid", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("received_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("processed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("process_status", sa.String(length=30), server_default=sa.text("'received'"), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("webhook_event_id", name=op.f("webhook_events_pkey")),
        sa.UniqueConstraint("provider_code", "event_id", name=op.f("ux_webhook_event_provider_id")),
    )


def downgrade() -> None:
    op.drop_table("webhook_events")
    op.drop_table("provider_payouts")
    op.drop_table("provider_beneficiaries")

