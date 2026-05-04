"""HR foundation: attendance/leave/pay-period lock, holidays, leave balances.

Revision ID: c4f8a1e9b2d0
Revises: 84893e373797
Create Date: 2026-04-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c4f8a1e9b2d0"
down_revision: Union[str, Sequence[str], None] = "84893e373797"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # NOTE: Some environments already have parts of this schema created manually.
    # Use IF NOT EXISTS to keep the migration safe/idempotent.

    op.execute(
        "ALTER TABLE organisations "
        "ADD COLUMN IF NOT EXISTS hr_settings jsonb NOT NULL DEFAULT '{}'::jsonb"
    )

    op.execute(
        "ALTER TABLE attendances "
        "ADD COLUMN IF NOT EXISTS day_fraction numeric(5,4) NOT NULL DEFAULT 1.0"
    )
    op.execute(
        "ALTER TABLE attendances "
        "ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE attendances "
        "ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_attendances_org_emp_date "
        "ON attendances (organisation_id, employee_id, work_date)"
    )

    op.execute("ALTER TABLE leaves ADD COLUMN IF NOT EXISTS cancelled_at timestamptz")
    op.execute(
        "ALTER TABLE leaves ADD COLUMN IF NOT EXISTS cancelled_by uuid"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leaves_cancelled_by_users') THEN "
        "ALTER TABLE leaves ADD CONSTRAINT fk_leaves_cancelled_by_users "
        "FOREIGN KEY (cancelled_by) REFERENCES users(user_id) ON DELETE SET NULL; "
        "END IF; "
        "END $$;"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_leaves_org_emp_status "
        "ON leaves (organisation_id, employee_id, status)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_leaves_org_dates "
        "ON leaves (organisation_id, start_date, end_date)"
    )

    op.execute(
        "ALTER TABLE pay_periods "
        "ADD COLUMN IF NOT EXISTS attendance_leave_locked boolean NOT NULL DEFAULT false"
    )
    op.execute("ALTER TABLE pay_periods ADD COLUMN IF NOT EXISTS locked_at timestamptz")
    op.execute("ALTER TABLE pay_periods ADD COLUMN IF NOT EXISTS locked_by_payroll_run_id uuid")
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pay_periods_locked_by_run') THEN "
        "ALTER TABLE pay_periods ADD CONSTRAINT fk_pay_periods_locked_by_run "
        "FOREIGN KEY (locked_by_payroll_run_id) REFERENCES payroll_runs(payroll_run_id) ON DELETE SET NULL; "
        "END IF; "
        "END $$;"
    )

    op.execute(
        "CREATE TABLE IF NOT EXISTS organisation_holidays ("
        "holiday_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
        "organisation_id uuid NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,"
        "holiday_date date NOT NULL,"
        "name text,"
        "is_optional boolean NOT NULL DEFAULT false,"
        "created_at timestamptz NOT NULL DEFAULT now(),"
        "CONSTRAINT ux_org_holiday_date UNIQUE (organisation_id, holiday_date)"
        ")"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_org_holidays_org_date "
        "ON organisation_holidays (organisation_id, holiday_date)"
    )

    op.execute(
        "CREATE TABLE IF NOT EXISTS employee_leave_balances ("
        "balance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
        "organisation_id uuid NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,"
        "employee_id uuid NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,"
        "leave_type varchar(10) NOT NULL,"
        "period_year int NOT NULL,"
        "opening_balance numeric(8,2) NOT NULL DEFAULT 0,"
        "accrued numeric(8,2) NOT NULL DEFAULT 0,"
        "consumed numeric(8,2) NOT NULL DEFAULT 0,"
        "carried_forward numeric(8,2) NOT NULL DEFAULT 0,"
        "encashed numeric(8,2) NOT NULL DEFAULT 0,"
        "updated_at timestamptz NOT NULL DEFAULT now(),"
        "CONSTRAINT ck_employee_leave_balances_leave_type CHECK (leave_type IN ('CL','SL','EL','LOP')),"
        "CONSTRAINT ux_emp_leave_year UNIQUE (employee_id, leave_type, period_year)"
        ")"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_leave_balances_org_emp "
        "ON employee_leave_balances (organisation_id, employee_id)"
    )


def downgrade() -> None:
    op.drop_index("ix_leave_balances_org_emp", table_name="employee_leave_balances")
    op.drop_table("employee_leave_balances")

    op.drop_index("ix_org_holidays_org_date", table_name="organisation_holidays")
    op.drop_table("organisation_holidays")

    op.drop_constraint("fk_pay_periods_locked_by_run", "pay_periods", type_="foreignkey")
    op.drop_column("pay_periods", "locked_by_payroll_run_id")
    op.drop_column("pay_periods", "locked_at")
    op.drop_column("pay_periods", "attendance_leave_locked")

    op.drop_index("ix_leaves_org_dates", table_name="leaves")
    op.drop_index("ix_leaves_org_emp_status", table_name="leaves")
    op.drop_constraint("fk_leaves_cancelled_by_users", "leaves", type_="foreignkey")
    op.drop_column("leaves", "cancelled_by")
    op.drop_column("leaves", "cancelled_at")

    op.drop_index("ix_attendances_org_emp_date", table_name="attendances")
    op.drop_column("attendances", "updated_at")
    op.drop_column("attendances", "is_locked")
    op.drop_column("attendances", "day_fraction")

    op.drop_column("organisations", "hr_settings")
