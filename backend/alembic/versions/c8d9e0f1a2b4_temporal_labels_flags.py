"""Temporal versioning for org labels and feature flags (requirement P8).

Revision ID: c8d9e0f1a2b4
Revises: b2c3d4e5f6a7
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8d9e0f1a2b4"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for stmt in (
        "ALTER TABLE organization_labels ADD COLUMN IF NOT EXISTS effective_from date",
        "ALTER TABLE organization_labels ADD COLUMN IF NOT EXISTS effective_to date",
        "ALTER TABLE organization_labels ADD COLUMN IF NOT EXISTS version_start timestamptz",
        "ALTER TABLE organization_labels ADD COLUMN IF NOT EXISTS version_end timestamptz",
        "ALTER TABLE organization_feature_flags ADD COLUMN IF NOT EXISTS effective_from date",
        "ALTER TABLE organization_feature_flags ADD COLUMN IF NOT EXISTS effective_to date",
        "ALTER TABLE organization_feature_flags ADD COLUMN IF NOT EXISTS version_start timestamptz",
        "ALTER TABLE organization_feature_flags ADD COLUMN IF NOT EXISTS version_end timestamptz",
    ):
        op.execute(sa.text(stmt))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for col, table in (
        ("effective_from", "organization_labels"),
        ("effective_to", "organization_labels"),
        ("version_start", "organization_labels"),
        ("version_end", "organization_labels"),
        ("effective_from", "organization_feature_flags"),
        ("effective_to", "organization_feature_flags"),
        ("version_start", "organization_feature_flags"),
        ("version_end", "organization_feature_flags"),
    ):
        op.execute(sa.text(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {col}"))
