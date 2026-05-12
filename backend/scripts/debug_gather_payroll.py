import asyncio
from uuid import UUID

from sqlalchemy import select

from database import engine
from models.payroll_models import PayrollRun
from services.payroll_run_gather import gather_payroll_inputs


async def main() -> None:
    async with engine.connect() as conn:
        from sqlalchemy.ext.asyncio import AsyncSession

        async with AsyncSession(bind=conn, expire_on_commit=False) as db:
            result = await db.execute(
                select(PayrollRun.payroll_run_id).order_by(PayrollRun.created_at.desc()).limit(1)
            )
            run_id = result.scalar_one_or_none()
            if not run_id:
                print("no payroll runs")
                return
            print("run_id", run_id)
            try:
                gathered = await gather_payroll_inputs(db, run_id)
                print("jobs", len(gathered.jobs), "skipped", gathered.skipped_no_structure)
            except Exception as exc:
                print(type(exc).__name__, exc)
                raise


if __name__ == "__main__":
    asyncio.run(main())
