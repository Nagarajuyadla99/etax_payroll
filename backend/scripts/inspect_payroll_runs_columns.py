import asyncio

from sqlalchemy import text

from database import engine


async def main() -> None:
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='payroll_runs' ORDER BY ordinal_position"
            )
        )
        print([row[0] for row in result.fetchall()])


if __name__ == "__main__":
    asyncio.run(main())
