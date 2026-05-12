"""banking master setup

Revision ID: 3f2a1c9b7d10
Revises: d1a2c3e4f5a6
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "3f2a1c9b7d10"
down_revision: Union[str, Sequence[str], None] = "d1a2c3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "banks",
        sa.Column("bank_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("code", sa.String(length=30), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("swift_code", sa.String(length=20), nullable=True),
        sa.Column("country", sa.String(length=100), server_default=sa.text("'India'"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("bank_id", name=op.f("banks_pkey")),
        sa.UniqueConstraint("code", name=op.f("ux_banks_code")),
    )

    op.create_table(
        "bank_branches",
        sa.Column("branch_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("bank_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("branch_name", sa.Text(), nullable=False),
        sa.Column("ifsc_code", sa.String(length=20), nullable=True),
        sa.Column("micr_code", sa.String(length=20), nullable=True),
        sa.Column("swift_code", sa.String(length=20), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), server_default=sa.text("'India'"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["bank_id"], ["banks.bank_id"], name=op.f("bank_branches_bank_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("branch_id", name=op.f("bank_branches_pkey")),
        sa.UniqueConstraint("ifsc_code", name=op.f("ux_bank_branches_ifsc_code")),
    )

    op.create_table(
        "bank_transfer_modes",
        sa.Column("mode_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bank_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("mode", sa.String(length=20), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["bank_id"], ["banks.bank_id"], name=op.f("bank_transfer_modes_bank_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("bank_transfer_modes_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("mode_id", name=op.f("bank_transfer_modes_pkey")),
        sa.UniqueConstraint("organisation_id", "bank_id", "mode", name=op.f("ux_transfer_modes_org_bank_mode")),
    )

    op.create_table(
        "company_salary_accounts",
        sa.Column("company_account_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bank_branch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_holder_name", sa.Text(), nullable=False),
        sa.Column("account_number_enc", sa.Text(), nullable=False),
        sa.Column("account_number_last4", sa.String(length=4), nullable=False),
        sa.Column("account_type", sa.String(length=30), nullable=True),
        sa.Column("allowed_modes", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["bank_branch_id"], ["bank_branches.branch_id"], name=op.f("company_salary_accounts_bank_branch_id_fkey"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("company_salary_accounts_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("company_account_id", name=op.f("company_salary_accounts_pkey")),
        sa.UniqueConstraint("organisation_id", "is_default", name=op.f("ux_company_salary_accounts_org_default")),
    )


def downgrade() -> None:
    op.drop_table("company_salary_accounts")
    op.drop_table("bank_transfer_modes")
    op.drop_table("bank_branches")
    op.drop_table("banks")

