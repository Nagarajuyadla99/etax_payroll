"""reconciliation v2 tables

Revision ID: d4e5f6a7b8c0
Revises: c3d4e5f6a7b9
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d4e5f6a7b8c0"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bank_transactions",
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("row_index", sa.String(length=20), nullable=False),
        sa.Column("txn_date", sa.String(length=20), nullable=False),
        sa.Column("txn_type", sa.String(length=10), server_default=sa.text("'DR'"), nullable=False),
        sa.Column("amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=10), server_default=sa.text("'INR'"), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("utr", sa.String(length=120), nullable=True),
        sa.Column("normalized", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["import_id"], ["bank_statement_imports.import_id"], name=op.f("bank_transactions_import_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("bank_transactions_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("transaction_id", name=op.f("bank_transactions_pkey")),
        sa.UniqueConstraint("organisation_id", "import_id", "row_index", name=op.f("ux_bank_txn_import_row")),
    )

    op.create_table(
        "reconciliation_matches",
        sa.Column("match_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_payout_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("salary_batch_item_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("match_type", sa.String(length=30), nullable=False),
        sa.Column("confidence", sa.Numeric(precision=5, scale=2), server_default=sa.text("100"), nullable=False),
        sa.Column("status", sa.String(length=30), server_default=sa.text("'matched'"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("reconciliation_matches_organisation_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["provider_payout_id"], ["provider_payouts.provider_payout_id"], name=op.f("reconciliation_matches_provider_payout_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["salary_batch_item_id"], ["salary_batch_items.item_id"], name=op.f("reconciliation_matches_salary_batch_item_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["transaction_id"], ["bank_transactions.transaction_id"], name=op.f("reconciliation_matches_transaction_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("match_id", name=op.f("reconciliation_matches_pkey")),
        sa.UniqueConstraint("transaction_id", name=op.f("ux_recon_match_txn")),
    )

    op.create_table(
        "reconciliation_exceptions",
        sa.Column("exception_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.String(length=50), nullable=False),
        sa.Column("severity", sa.String(length=20), server_default=sa.text("'medium'"), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'open'"), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["import_id"], ["bank_statement_imports.import_id"], name=op.f("reconciliation_exceptions_import_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("reconciliation_exceptions_organisation_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["transaction_id"], ["bank_transactions.transaction_id"], name=op.f("reconciliation_exceptions_transaction_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("exception_id", name=op.f("reconciliation_exceptions_pkey")),
    )


def downgrade() -> None:
    op.drop_table("reconciliation_exceptions")
    op.drop_table("reconciliation_matches")
    op.drop_table("bank_transactions")

