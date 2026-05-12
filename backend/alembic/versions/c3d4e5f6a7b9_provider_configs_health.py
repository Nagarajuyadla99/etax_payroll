"""provider configs and health logs

Revision ID: c3d4e5f6a7b9
Revises: b2c3d4e5f6a8
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3d4e5f6a7b9"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "banking_provider_configs",
        sa.Column("config_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_code", sa.String(length=30), nullable=False),
        sa.Column("credentials_enc", sa.Text(), nullable=False),
        sa.Column("webhook_secret_enc", sa.Text(), nullable=True),
        sa.Column("is_sandbox", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("banking_provider_configs_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("config_id", name=op.f("banking_provider_configs_pkey")),
        sa.UniqueConstraint("organisation_id", "provider_code", name=op.f("ux_provider_config_org_provider")),
    )

    op.create_table(
        "provider_health_logs",
        sa.Column("health_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_code", sa.String(length=30), nullable=False),
        sa.Column("ok", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("latency_ms", sa.String(length=20), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.organisation_id"], name=op.f("provider_health_logs_organisation_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("health_id", name=op.f("provider_health_logs_pkey")),
    )


def downgrade() -> None:
    op.drop_table("provider_health_logs")
    op.drop_table("banking_provider_configs")

