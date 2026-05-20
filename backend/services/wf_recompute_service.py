"""Attendance recompute job orchestration."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.employee_model import Employee
from models.wf_models import WfRecomputeJob, WfRecomputeJobItem
from services.wf_day_result_service import recompute_employee_day
from services.wf_observability_service import record_recompute_job


async def create_recompute_job(
    db: AsyncSession,
    organisation_id: UUID,
    scope_type: str,
    scope_json: dict[str, Any],
    created_by: UUID | None = None,
) -> WfRecomputeJob:
    job = WfRecomputeJob(
        organisation_id=organisation_id,
        scope_type=scope_type,
        scope_json=scope_json,
        status="pending",
        created_by=created_by,
    )
    db.add(job)
    await db.flush()

    items: list[WfRecomputeJobItem] = []
    if scope_type == "employee_day":
        items.append(
            WfRecomputeJobItem(
                job_id=job.job_id,
                employee_id=scope_json["employee_id"],
                work_date=date.fromisoformat(scope_json["work_date"]),
            )
        )
    elif scope_type in ("employee_month", "org_month"):
        from_d = date.fromisoformat(scope_json["from_date"])
        to_d = date.fromisoformat(scope_json["to_date"])
        emp_id = scope_json.get("employee_id")
        emp_q = select(Employee.employee_id).where(Employee.organisation_id == organisation_id)
        if emp_id:
            emp_q = emp_q.where(Employee.employee_id == UUID(str(emp_id)))
        res = await db.execute(emp_q)
        emp_ids = [r[0] for r in res.all()]
        cur = from_d
        while cur <= to_d:
            for eid in emp_ids:
                items.append(WfRecomputeJobItem(job_id=job.job_id, employee_id=eid, work_date=cur))
            cur += timedelta(days=1)

    for it in items:
        db.add(it)
    job.stats_json = {"total_items": len(items)}
    record_recompute_job("pending", len(items))
    await db.commit()
    await db.refresh(job)
    return job


async def process_recompute_job(db: AsyncSession, job_id: UUID) -> WfRecomputeJob:
    job = await db.get(WfRecomputeJob, job_id)
    if not job:
        raise ValueError("Recompute job not found")

    job.status = "processing"
    from datetime import datetime, timezone

    job.started_at = datetime.now(timezone.utc)
    await db.flush()

    items_q = await db.execute(
        select(WfRecomputeJobItem).where(WfRecomputeJobItem.job_id == job_id)
    )
    items = list(items_q.scalars().all())
    ok = 0
    failed = 0

    for item in items:
        try:
            await recompute_employee_day(
                db,
                job.organisation_id,
                item.employee_id,
                item.work_date,
            )
            item.status = "completed"
            ok += 1
        except Exception as exc:
            item.status = "failed"
            item.error_message = str(exc)[:500]
            failed += 1

    job.status = "completed" if failed == 0 else "completed_with_errors"
    job.completed_at = datetime.now(timezone.utc)
    job.stats_json = {**(job.stats_json or {}), "completed": ok, "failed": failed}
    record_recompute_job(job.status, ok + failed)
    await db.commit()
    await db.refresh(job)
    return job
