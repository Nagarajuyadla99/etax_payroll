"""employee bank accounts

Revision ID: 4c9d6a2e1b11
Revises: 3f2a1c9b7d10
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "4c9d6a2e1b11"
down_revision: Union[str, Sequence[str], None] = "3f2a1c9b7d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employee_bank_accounts",
        sa.Column("bank_account_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bank_branch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_holder_name", sa.Text(), nullable=False),
        sa.Column("account_number_nonce_b64", sa.Text(), nullable=False),
        sa.Column("account_number_ciphertext_b64", sa.Text(), nullable=False),
        sa.Column("account_number_last4", sa.String(length=4), nullable=False),
        sa.Column("upi_vpa", sa.String(length=120), nullable=True),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("verification_status", sa.String(length=30), server_default=sa.text("'pending_verification'"), nullable=False),
        sa.Column("verification_meta", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("verified_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("verified_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["bank_branch_id"], ["bank_branches.branch_id"], name=op.f("employee_bank_accounts_bank_branch_id_fkey"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.employee_id"], name=op.f("employee_bank_accounts_employee_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["verified_by"], ["users.user_id"], name=op.f("employee_bank_accounts_verified_by_fkey"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("bank_account_id", name=op.f("employee_bank_accounts_pkey")),
        sa.UniqueConstraint("employee_id", "effective_from", name=op.f("ux_emp_bank_effective_from")),
    )

    op.create_table(
        "employee_bank_account_documents",
        sa.Column("document_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("bank_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doc_type", sa.String(length=50), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=True),
        sa.Column("content_type", sa.String(length=120), nullable=True),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("uploaded_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["bank_account_id"], ["employee_bank_accounts.bank_account_id"], name=op.f("employee_bank_account_documents_bank_account_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("employee_bank_account_documents_organisation_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.user_id"], name=op.f("employee_bank_account_documents_uploaded_by_fkey"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("document_id", name=op.f("employee_bank_account_documents_pkey")),
        sa.UniqueConstraint("bank_account_id", "checksum_sha256", name=op.f("ux_emp_bank_doc_checksum")),
    )


def downgrade() -> None:
    op.drop_table("employee_bank_account_documents")
    op.drop_table("employee_bank_accounts")

