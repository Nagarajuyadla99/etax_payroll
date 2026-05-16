"""Banking/disbursement production hardening (additive, PostgreSQL).

Revision ID: c7d8e9f0a1b2
Revises: f8e7d6c5b4a3
Create Date: 2026-05-16

- salary_batches: disbursement_mode, locks, indexes
- payment_artifacts: version column + unique constraint
- company_salary_accounts: partial unique on default account
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "f8e7d6c5b4a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _pg_statements() -> list[str]:
    return [
        "ALTER TABLE salary_batches ADD COLUMN IF NOT EXISTS disbursement_mode VARCHAR(20)",
        "ALTER TABLE salary_batches ADD COLUMN IF NOT EXISTS disbursement_locked_at TIMESTAMPTZ",
        "ALTER TABLE salary_batches ADD COLUMN IF NOT EXISTS payout_job_id VARCHAR(64)",
        "CREATE INDEX IF NOT EXISTS ix_salary_batches_org_status ON salary_batches (organisation_id, status)",
        "CREATE INDEX IF NOT EXISTS ix_salary_batch_items_batch_status ON salary_batch_items (batch_id, status)",
        "ALTER TABLE payment_artifacts ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE payment_artifacts DROP CONSTRAINT IF EXISTS ux_payment_artifact_batch_kind",
        "ALTER TABLE payment_artifacts DROP CONSTRAINT IF EXISTS ux_payment_artifact_batch_kind_version",
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ux_payment_artifact_batch_kind_version'
            ) THEN
                ALTER TABLE payment_artifacts
                ADD CONSTRAINT ux_payment_artifact_batch_kind_version
                UNIQUE (batch_id, kind, version);
            END IF;
        END $$;
        """,
        "ALTER TABLE company_salary_accounts DROP CONSTRAINT IF EXISTS ux_company_salary_accounts_org_default",
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_company_salary_default_one
        ON company_salary_accounts (organisation_id)
        WHERE is_default = true
        """,
        "CREATE INDEX IF NOT EXISTS ix_provider_payouts_org_status ON provider_payouts (organisation_id, status)",
        "CREATE INDEX IF NOT EXISTS ix_provider_payouts_utr ON provider_payouts (utr) WHERE utr IS NOT NULL",
    ]


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for stmt in _pg_statements():
        op.execute(sa.text(stmt))


def downgrade() -> None:
    pass
