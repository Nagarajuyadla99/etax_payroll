"""Workforce attendance analytics summaries (read-only)."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attendance_models import Attendance
from models.wf_enterprise_models import WfAttendanceDailyProjection
from models.wf_models import AttendanceException, RawAttendanceEvent, WfRecomputeJob
from services.wf_projection_service import query_projection_summary


async def attendance_dashboard_summary(
    db: AsyncSession,
    organisation_id: UUID,
    from_date: date,
    to_date: date,
) -> dict:
    proj_q = await db.execute(
        select(func.count())
        .select_from(WfAttendanceDailyProjection)
        .where(
            WfAttendanceDailyProjection.organisation_id == organisation_id,
            WfAttendanceDailyProjection.work_date >= from_date,
            WfAttendanceDailyProjection.work_date <= to_date,
        )
    )
    proj_rows = int(proj_q.scalar() or 0)
    if proj_rows > 0:
        summary = await query_projection_summary(db, organisation_id, from_date, to_date)
        status_counts = summary.get("status_counts", {})
        data_source = "projection"
    else:
        att_q = await db.execute(
            select(Attendance.status, func.count())
            .where(
                Attendance.organisation_id == organisation_id,
                Attendance.work_date >= from_date,
                Attendance.work_date <= to_date,
            )
            .group_by(Attendance.status)
        )
        status_counts = {str(row[0]): row[1] for row in att_q.all()}
        data_source = "operational"

    exc_q = await db.execute(
        select(func.count())
        .select_from(AttendanceException)
        .where(
            AttendanceException.organisation_id == organisation_id,
            AttendanceException.work_date >= from_date,
            AttendanceException.work_date <= to_date,
            AttendanceException.status == "open",
        )
    )
    open_exceptions = exc_q.scalar() or 0

    day_start = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
    day_end = datetime.combine(to_date, time.max, tzinfo=timezone.utc)
    raw_q = await db.execute(
        select(func.count())
        .select_from(RawAttendanceEvent)
        .where(
            RawAttendanceEvent.organisation_id == organisation_id,
            RawAttendanceEvent.punch_time >= day_start,
            RawAttendanceEvent.punch_time <= day_end,
        )
    )
    raw_events = raw_q.scalar() or 0

    jobs_q = await db.execute(
        select(func.count())
        .select_from(WfRecomputeJob)
        .where(WfRecomputeJob.organisation_id == organisation_id)
    )
    recompute_jobs = jobs_q.scalar() or 0

    return {
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "status_counts": status_counts,
        "open_exceptions": open_exceptions,
        "raw_events": raw_events,
        "recompute_jobs_total": recompute_jobs,
        "data_source": data_source,
    }
