"""notifications

Revision ID: 7aa1b3c4d5e6
Revises: 6d2e9c1a0f21
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "7aa1b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "6d2e9c1a0f21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("notification_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=50), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("read_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("notifications_organisation_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], name=op.f("notifications_user_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("notification_id", name=op.f("notifications_pkey")),
    )


def downgrade() -> None:
    op.drop_table("notifications")

