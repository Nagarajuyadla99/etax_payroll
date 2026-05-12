import asyncio

from sqlalchemy import text

from database import engine


async def main() -> None:
    statements = [
        "ALTER TABLE organisations ADD COLUMN IF NOT EXISTS hr_settings jsonb NOT NULL DEFAULT '{}'::jsonb",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS day_fraction numeric(5,4) NOT NULL DEFAULT 1.0",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false",
        "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()",
        "ALTER TABLE leaves ADD COLUMN IF NOT EXISTS cancelled_at timestamptz",
        "ALTER TABLE leaves ADD COLUMN IF NOT EXISTS cancelled_by uuid",
        (
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leaves_cancelled_by_users') THEN "
            "ALTER TABLE leaves ADD CONSTRAINT fk_leaves_cancelled_by_users "
            "FOREIGN KEY (cancelled_by) REFERENCES users(user_id) ON DELETE SET NULL; "
            "END IF; END $$;"
        ),
    ]
    async with engine.begin() as conn:
        for statement in statements:
            await conn.execute(text(statement))
        for table in ("attendances", "leaves"):
            result = await conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name=:table ORDER BY ordinal_position"
                ),
                {"table": table},
            )
            print(table, [row[0] for row in result.fetchall()])


if __name__ == "__main__":
    asyncio.run(main())
