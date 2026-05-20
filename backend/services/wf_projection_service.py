"""Materialized analytics projections — do not query attendances table for dashboards."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.attendance_models import Attendance
from models.wf_models import AttendanceException
from models.wf_enterprise_models import WfAttendanceDailyProjection


async def refresh_daily_projection(
    db: AsyncSession,
    organisation_id: UUID,
    from_date: date,
    to_date: date,
) -> int:
    att_q = await db.execute(
        select(Attendance).where(
            Attendance.organisation_id == organisation_id,
            Attendance.work_date >= from_date,
            Attendance.work_date <= to_date,
        )
    )
    rows = list(att_q.scalars().all())
    count = 0
    for att in rows:
        exc_q = await db.execute(
            select(func.count())
            .select_from(AttendanceException)
            .where(
                AttendanceException.organisation_id == organisation_id,
                AttendanceException.employee_id == att.employee_id,
                AttendanceException.work_date == att.work_date,
                AttendanceException.status == "open",
            )
        )
        open_exc = int(exc_q.scalar() or 0)
        stmt = (
            pg_insert(WfAttendanceDailyProjection)
            .values(
                organisation_id=organisation_id,
                employee_id=att.employee_id,
                work_date=att.work_date,
                status=att.status,
                payable_fraction=att.payable_fraction or att.day_fraction,
                overtime_hours=att.overtime_hours,
                late_minutes=att.late_minutes,
                open_exceptions=open_exc,
            )
            .on_conflict_do_update(
                constraint="ux_wf_att_daily_proj",
                set_={
                    "status": att.status,
                    "payable_fraction": att.payable_fraction or att.day_fraction,
                    "overtime_hours": att.overtime_hours,
                    "late_minutes": att.late_minutes,
                    "open_exceptions": open_exc,
                },
            )
        )
        await db.execute(stmt)
        count += 1
    await db.commit()
    return count


async def query_projection_summary(
    db: AsyncSession,
    organisation_id: UUID,
    from_date: date,
    to_date: date,
) -> dict:
    q = await db.execute(
        select(WfAttendanceDailyProjection.status, func.count())
        .where(
            WfAttendanceDailyProjection.organisation_id == organisation_id,
            WfAttendanceDailyProjection.work_date >= from_date,
            WfAttendanceDailyProjection.work_date <= to_date,
        )
        .group_by(WfAttendanceDailyProjection.status)
    )
    return {
        "status_counts": {str(r[0]): r[1] for r in q.all()},
        "source": "projection",
    }
