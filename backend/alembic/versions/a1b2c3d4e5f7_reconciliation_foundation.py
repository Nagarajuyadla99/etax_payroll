"""reconciliation foundation

Revision ID: a1b2c3d4e5f7
Revises: 9c1d2e3f4a71
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, Sequence[str], None] = "9c1d2e3f4a71"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bank_statement_imports",
        sa.Column("import_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source", sa.String(length=50), server_default=sa.text("'csv'"), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=True),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), server_default=sa.text("'uploaded'"), nullable=False),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("bank_statement_imports_organisation_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.user_id"], name=op.f("bank_statement_imports_uploaded_by_fkey"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("import_id", name=op.f("bank_statement_imports_pkey")),
    )

    op.create_table(
        "bank_reconciliation_entries",
        sa.Column("entry_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("row_index", sa.String(length=20), nullable=False),
        sa.Column("txn_date", sa.String(length=20), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.String(length=40), nullable=True),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("matched", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("matched_batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("matched_item_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("recon_status", sa.String(length=30), server_default=sa.text("'unmatched'"), nullable=False),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["import_id"], ["bank_statement_imports.import_id"], name=op.f("bank_reconciliation_entries_import_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["matched_batch_id"], ["salary_batches.batch_id"], name=op.f("bank_reconciliation_entries_matched_batch_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["matched_item_id"], ["salary_batch_items.item_id"], name=op.f("bank_reconciliation_entries_matched_item_id_fkey"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("bank_reconciliation_entries_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("entry_id", name=op.f("bank_reconciliation_entries_pkey")),
        sa.UniqueConstraint("import_id", "row_index", name=op.f("ux_recon_import_row")),
    )


def downgrade() -> None:
    op.drop_table("bank_reconciliation_entries")
    op.drop_table("bank_statement_imports")

