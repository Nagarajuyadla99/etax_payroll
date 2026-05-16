"""Parity for schema previously applied via FastAPI startup DDL.

Revision ID: f8e7d6c5b4a3
Revises: 2e3bd6785936
Create Date: 2026-05-14

This migration is **additive and idempotent** (IF NOT EXISTS / guarded DO blocks).
It mirrors ``main.py`` startup patches so production can rely on Alembic alone.

- **PostgreSQL only:** on other dialects (e.g. SQLite used in local Alembic smoke tests),
  this revision is a no-op.
- **Downgrade:** intentionally empty — do not drop columns added for legacy parity.

Remove after: all deployed databases have run this revision and ``ENABLE_STARTUP_SCHEMA_PATCH``
remains ``false`` (see ``main.py``).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f8e7d6c5b4a3"
down_revision: Union[str, Sequence[str], None] = "2e3bd6785936"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _pg_statements() -> list[str]:
    """Same semantics as historical ``startup()`` in ``main.py`` (minus idempotency DROP repair)."""
    return [
        "ALTER TABLE organisations "
        "ADD COLUMN IF NOT EXISTS hr_settings jsonb NOT NULL DEFAULT '{}'::jsonb",
        "ALTER TABLE attendances "
        "ADD COLUMN IF NOT EXISTS day_fraction numeric(5,4) NOT NULL DEFAULT 1.0",
        "ALTER TABLE attendances "
        "ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false",
        "ALTER TABLE attendances "
        "ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()",
        "ALTER TABLE leaves ADD COLUMN IF NOT EXISTS cancelled_at timestamptz",
        "ALTER TABLE leaves ADD COLUMN IF NOT EXISTS cancelled_by uuid",
        "ALTER TABLE employee_salary_structures "
        "ADD COLUMN IF NOT EXISTS overrides jsonb NOT NULL DEFAULT '{}'::jsonb",
        "ALTER TABLE pay_periods "
        "ADD COLUMN IF NOT EXISTS attendance_leave_locked boolean NOT NULL DEFAULT false",
        "ALTER TABLE pay_periods ADD COLUMN IF NOT EXISTS locked_at timestamptz",
        "ALTER TABLE pay_periods ADD COLUMN IF NOT EXISTS locked_by_payroll_run_id uuid",
        (
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pay_periods_locked_by_run') THEN "
            "ALTER TABLE pay_periods ADD CONSTRAINT fk_pay_periods_locked_by_run "
            "FOREIGN KEY (locked_by_payroll_run_id) REFERENCES payroll_runs(payroll_run_id) ON DELETE SET NULL; "
            "END IF; "
            "END $$;"
        ),
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS execution_trace_id uuid",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS execution_meta jsonb",
        (
            "ALTER TABLE payroll_runs "
            "ADD COLUMN IF NOT EXISTS execution_status varchar(32) NOT NULL DEFAULT 'draft'"
        ),
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lifecycle_status varchar(32)",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lifecycle_verified_at timestamptz",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lifecycle_verified_by uuid",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lifecycle_approved_at timestamptz",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lifecycle_approved_by uuid",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS payroll_locked_at timestamptz",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lifecycle_locked_by uuid",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS final_snapshot jsonb",
        (
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_runs_lifecycle_verified_by') THEN "
            "ALTER TABLE payroll_runs ADD CONSTRAINT fk_payroll_runs_lifecycle_verified_by "
            "FOREIGN KEY (lifecycle_verified_by) REFERENCES users(user_id) ON DELETE SET NULL; "
            "END IF; "
            "END $$;"
        ),
        (
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_runs_lifecycle_approved_by') THEN "
            "ALTER TABLE payroll_runs ADD CONSTRAINT fk_payroll_runs_lifecycle_approved_by "
            "FOREIGN KEY (lifecycle_approved_by) REFERENCES users(user_id) ON DELETE SET NULL; "
            "END IF; "
            "END $$;"
        ),
        (
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_runs_lifecycle_locked_by') THEN "
            "ALTER TABLE payroll_runs ADD CONSTRAINT fk_payroll_runs_lifecycle_locked_by "
            "FOREIGN KEY (lifecycle_locked_by) REFERENCES users(user_id) ON DELETE SET NULL; "
            "END IF; "
            "END $$;"
        ),
        (
            "CREATE TABLE IF NOT EXISTS payroll_lifecycle_audit ("
            "audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
            "organisation_id uuid NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,"
            "user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,"
            "action varchar(64) NOT NULL,"
            "entity_type varchar(64) NOT NULL,"
            "entity_id uuid NOT NULL,"
            "detail jsonb,"
            "created_at timestamptz NOT NULL DEFAULT now()"
            ")"
        ),
    ]


def upgrade() -> None:
    bind = op.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        # Non-PG targets: initial_schema + models are sufficient for local smoke tests.
        return
    for stmt in _pg_statements():
        op.execute(sa.text(stmt))


def downgrade() -> None:
    """Irreversible guard migration — do not drop production columns."""
    pass
