"""api idempotency keys

Revision ID: 8b2c3d4e5f61
Revises: 7aa1b3c4d5e6
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "8b2c3d4e5f61"
down_revision: Union[str, Sequence[str], None] = "7aa1b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "api_idempotency_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("endpoint", sa.String(length=200), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("response_status", sa.String(length=10), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("api_idempotency_keys_pkey")),
        sa.UniqueConstraint("idempotency_key", "endpoint", name=op.f("ux_idempotency_key_endpoint")),
    )
    op.create_index(op.f("ix_api_idempotency_keys_expires_at"), "api_idempotency_keys", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_api_idempotency_keys_expires_at"), table_name="api_idempotency_keys")
    op.drop_table("api_idempotency_keys")

