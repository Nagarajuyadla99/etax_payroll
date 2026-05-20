"""Attendance enterprise setup wizard columns on organisation_attendance_profile.

Revision ID: d1e2f3a4b5c6
Revises: c8d9e0f1a2b4
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c8d9e0f1a2b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for stmt in (
        "ALTER TABLE organisation_attendance_profile ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz",
        "ALTER TABLE organisation_attendance_profile ADD COLUMN IF NOT EXISTS setup_progress_json jsonb DEFAULT '{}'::jsonb",
        "ALTER TABLE organisation_attendance_profile ADD COLUMN IF NOT EXISTS industry_template varchar(50)",
        "ALTER TABLE organisation_attendance_profile ADD COLUMN IF NOT EXISTS attendance_cycle_type varchar(30)",
        "ALTER TABLE organisation_attendance_profile ADD COLUMN IF NOT EXISTS attendance_cycle_config jsonb DEFAULT '{}'::jsonb",
        "ALTER TABLE organisation_attendance_profile ADD COLUMN IF NOT EXISTS payroll_behavior_config jsonb DEFAULT '{}'::jsonb",
        "ALTER TABLE organisation_attendance_profile ADD COLUMN IF NOT EXISTS activated_modules_json jsonb DEFAULT '{}'::jsonb",
    ):
        op.execute(sa.text(stmt))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for col in (
        "setup_completed_at",
        "setup_progress_json",
        "industry_template",
        "attendance_cycle_type",
        "attendance_cycle_config",
        "payroll_behavior_config",
        "activated_modules_json",
    ):
        op.execute(sa.text(f"ALTER TABLE organisation_attendance_profile DROP COLUMN IF EXISTS {col}"))
