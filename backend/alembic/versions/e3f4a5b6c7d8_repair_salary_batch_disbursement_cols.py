"""Repair salary_batches disbursement columns when c7d8e9f0a1b2 was stamped but not applied.

Revision ID: e3f4a5b6c7d8
Revises: d1e2f3a4b5c6
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for stmt in (
        "ALTER TABLE salary_batches ADD COLUMN IF NOT EXISTS disbursement_mode VARCHAR(20)",
        "ALTER TABLE salary_batches ADD COLUMN IF NOT EXISTS disbursement_locked_at TIMESTAMPTZ",
        "ALTER TABLE salary_batches ADD COLUMN IF NOT EXISTS payout_job_id VARCHAR(64)",
        "CREATE INDEX IF NOT EXISTS ix_salary_batches_org_status ON salary_batches (organisation_id, status)",
        "CREATE INDEX IF NOT EXISTS ix_salary_batch_items_batch_status ON salary_batch_items (batch_id, status)",
    ):
        op.execute(sa.text(stmt))


def downgrade() -> None:
    pass
