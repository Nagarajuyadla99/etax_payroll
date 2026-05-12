import asyncio

from sqlalchemy import text

from database import engine


async def main() -> None:
    statements = [
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS execution_trace_id uuid",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS execution_meta jsonb",
        "ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS execution_status varchar(32) NOT NULL DEFAULT 'draft'",
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
            "END IF; END $$;"
        ),
        (
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_runs_lifecycle_approved_by') THEN "
            "ALTER TABLE payroll_runs ADD CONSTRAINT fk_payroll_runs_lifecycle_approved_by "
            "FOREIGN KEY (lifecycle_approved_by) REFERENCES users(user_id) ON DELETE SET NULL; "
            "END IF; END $$;"
        ),
        (
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_runs_lifecycle_locked_by') THEN "
            "ALTER TABLE payroll_runs ADD CONSTRAINT fk_payroll_runs_lifecycle_locked_by "
            "FOREIGN KEY (lifecycle_locked_by) REFERENCES users(user_id) ON DELETE SET NULL; "
            "END IF; END $$;"
        ),
    ]
    async with engine.begin() as conn:
        for statement in statements:
            await conn.execute(text(statement))
        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='payroll_runs' ORDER BY ordinal_position"
            )
        )
        print([row[0] for row in result.fetchall()])


if __name__ == "__main__":
    asyncio.run(main())
