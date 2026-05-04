"""Add organisations.hr_settings if missing (idempotent).

Run from repo: python backend/scripts/ensure_org_hr_settings_column.py
Or from backend: python scripts/ensure_org_hr_settings_column.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from database import engine


async def main() -> None:
    ddl = (
        "ALTER TABLE organisations "
        "ADD COLUMN IF NOT EXISTS hr_settings jsonb NOT NULL DEFAULT '{}'::jsonb"
    )
    async with engine.begin() as conn:
        await conn.execute(text(ddl))
    print("organisations.hr_settings is present.")


if __name__ == "__main__":
    asyncio.run(main())
