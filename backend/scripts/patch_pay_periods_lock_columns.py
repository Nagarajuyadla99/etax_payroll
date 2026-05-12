"""One-off idempotent patch for pay_periods lock columns."""
import asyncio

from sqlalchemy import text

from database import engine


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "ALTER TABLE pay_periods "
                "ADD COLUMN IF NOT EXISTS attendance_leave_locked boolean NOT NULL DEFAULT false"
            )
        )
        await conn.execute(
            text("ALTER TABLE pay_periods ADD COLUMN IF NOT EXISTS locked_at timestamptz")
        )
        await conn.execute(
            text(
                "ALTER TABLE pay_periods ADD COLUMN IF NOT EXISTS locked_by_payroll_run_id uuid"
            )
        )
        await conn.execute(
            text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pay_periods_locked_by_run') THEN "
                "ALTER TABLE pay_periods ADD CONSTRAINT fk_pay_periods_locked_by_run "
                "FOREIGN KEY (locked_by_payroll_run_id) REFERENCES payroll_runs(payroll_run_id) ON DELETE SET NULL; "
                "END IF; "
                "END $$;"
            )
        )
        rows = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='pay_periods' "
                "AND column_name IN ('attendance_leave_locked','locked_at','locked_by_payroll_run_id') "
                "ORDER BY column_name"
            )
        )
        print("ok", [row[0] for row in rows.fetchall()])


if __name__ == "__main__":
    asyncio.run(main())
