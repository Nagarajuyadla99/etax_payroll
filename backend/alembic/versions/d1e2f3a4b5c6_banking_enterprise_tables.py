"""Banking enterprise tables (provider configs, health logs).

Revision ID: d1e2f3a4b5c6
Revises: c7d8e9f0a1b2
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS banking_provider_configs (
                config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
                provider_code VARCHAR(30) NOT NULL,
                credentials_enc TEXT NOT NULL,
                webhook_secret_enc TEXT,
                is_sandbox BOOLEAN NOT NULL DEFAULT true,
                is_active BOOLEAN NOT NULL DEFAULT true,
                meta JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT ux_provider_config_org_provider UNIQUE (organisation_id, provider_code)
            )
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS provider_health_logs (
                health_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
                provider_code VARCHAR(30) NOT NULL,
                ok BOOLEAN NOT NULL DEFAULT false,
                latency_ms VARCHAR(20),
                error TEXT,
                meta JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_provider_health_org_created ON provider_health_logs (organisation_id, created_at DESC)"
        )
    )


def downgrade() -> None:
    pass
