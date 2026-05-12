"""bank file formats

Revision ID: 6d2e9c1a0f21
Revises: 5a1b7c8d9e12
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "6d2e9c1a0f21"
down_revision: Union[str, Sequence[str], None] = "5a1b7c8d9e12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bank_file_formats",
        sa.Column("format_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bank_code", sa.String(length=20), nullable=False),
        sa.Column("bank_name", sa.String(length=150), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("file_type", sa.String(length=10), server_default=sa.text("'CSV'"), nullable=False),
        sa.Column("header_line", sa.Text(), nullable=True),
        sa.Column("data_line_config", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("bank_file_formats_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("format_id", name=op.f("bank_file_formats_pkey")),
        sa.UniqueConstraint("organisation_id", "bank_code", "name", name=op.f("ux_bank_file_format_org_bank_name")),
    )


def downgrade() -> None:
    op.drop_table("bank_file_formats")

