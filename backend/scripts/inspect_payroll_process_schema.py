import asyncio

from sqlalchemy import text

from database import engine


async def inspect(table: str) -> None:
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name=:table ORDER BY ordinal_position"
            ),
            {"table": table},
        )
        print(table, [row[0] for row in result.fetchall()])


async def main() -> None:
    for table in ("organisations", "attendances", "leaves", "payroll_entries", "salary_component_groups"):
        await inspect(table)


if __name__ == "__main__":
    asyncio.run(main())
