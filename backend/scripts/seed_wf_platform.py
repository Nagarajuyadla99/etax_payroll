"""Seed WF platform data (labels, plugins, flags). Run from backend/: python scripts/seed_wf_platform.py"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import AsyncSessionLocal
from services.wf_seed_service import seed_wf_platform_data


async def main():
    async with AsyncSessionLocal() as db:
        counts = await seed_wf_platform_data(db)
        print("WF seed complete:", counts)


if __name__ == "__main__":
    asyncio.run(main())
