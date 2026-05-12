"""domain events outbox phase2g

Revision ID: 12d3e4f5a6b7
Revises: 01c2d3e4f5a6
Create Date: 2026-05-08

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "12d3e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "01c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "domain_events",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("dedupe_key", sa.String(length=160), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("next_attempt_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("locked_until", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("correlation_id", sa.String(length=80), nullable=True),
        sa.Column("request_id", sa.String(length=80), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("processed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("domain_events_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("event_id", name=op.f("domain_events_pkey")),
        sa.UniqueConstraint("organisation_id", "dedupe_key", name=op.f("ux_domain_event_org_dedupe")),
    )
    op.create_index(op.f("ix_domain_events_status_next"), "domain_events", ["status", "next_attempt_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_domain_events_status_next"), table_name="domain_events")
    op.drop_table("domain_events")

