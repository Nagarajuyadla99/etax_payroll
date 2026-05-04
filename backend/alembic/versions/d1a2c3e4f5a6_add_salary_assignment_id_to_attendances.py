"""add salary_assignment_id to attendances (idempotent)

Revision ID: d1a2c3e4f5a6
Revises: c4f8a1e9b2d0
Create Date: 2026-04-23

"""

from typing import Sequence, Union

from alembic import op


revision: str = "d1a2c3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "c4f8a1e9b2d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Some DBs were created without this column (schema drift).
    op.execute(
        "ALTER TABLE attendances "
        "ADD COLUMN IF NOT EXISTS salary_assignment_id uuid"
    )

    # Add FK only if it doesn't already exist.
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendances_salary_assignment') THEN "
        "ALTER TABLE attendances "
        "ADD CONSTRAINT fk_attendances_salary_assignment "
        "FOREIGN KEY (salary_assignment_id) "
        "REFERENCES employee_salary_assignments(salary_assignment_id) "
        "ON DELETE CASCADE; "
        "END IF; "
        "END $$;"
    )


def downgrade() -> None:
    # Best-effort downgrade (keep safe).
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendances_salary_assignment') THEN "
        "ALTER TABLE attendances DROP CONSTRAINT fk_attendances_salary_assignment; "
        "END IF; "
        "END $$;"
    )
    op.execute("ALTER TABLE attendances DROP COLUMN IF EXISTS salary_assignment_id")

