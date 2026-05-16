"""
Apply enterprise attendance_units payroll settings to one or all organisations.

Usage (from backend/):
  py scripts/apply_enterprise_payroll_settings.py
  py scripts/apply_enterprise_payroll_settings.py --org-id <uuid>
  py scripts/apply_enterprise_payroll_settings.py --dry-run
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path
from uuid import UUID

from dotenv import load_dotenv

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

load_dotenv(_BACKEND / ".env")

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from crud.org_crud import update_organisation_hr_settings
from models.org_models import Organisation
from services.payroll_attendance_calculator import enterprise_attendance_payroll_settings, merge_payroll_cfg


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise SystemExit("DATABASE_URL not set in backend/.env")
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


async def main() -> int:
    parser = argparse.ArgumentParser(description="Enable attendance_units payroll on organisation(s)")
    parser.add_argument("--org-id", type=str, default=None, help="Single organisation UUID")
    parser.add_argument("--dry-run", action="store_true", help="Print targets only, do not write")
    args = parser.parse_args()

    engine = create_async_engine(_database_url(), echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    patch = enterprise_attendance_payroll_settings()

    async with Session() as db:
        if args.org_id:
            org_ids = [UUID(args.org_id)]
        else:
            res = await db.execute(select(Organisation.organisation_id))
            org_ids = [row[0] for row in res.all()]

        print(f"Patch to apply: {patch}")
        for oid in org_ids:
            org = await db.get(Organisation, oid)
            if not org:
                print(f"SKIP {oid}: not found")
                continue
            before = merge_payroll_cfg((org.hr_settings or {}).get("payroll"))
            print(f"Org {oid} ({org.name}) payable_days_mode before={before.get('payable_days_mode')!r}")
            if args.dry_run:
                continue
            await update_organisation_hr_settings(db, oid, patch)
            await db.refresh(org)
            after = merge_payroll_cfg((org.hr_settings or {}).get("payroll"))
            print(f"  -> after payable_days_mode={after.get('payable_days_mode')!r}")

    await engine.dispose()
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
