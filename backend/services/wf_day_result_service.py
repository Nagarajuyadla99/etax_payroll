"""
Attendance day result engine — writes legacy-compatible attendances rows.

Policy engine integration point; v1 uses punch pairing heuristics.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from crud.attendance_crud import assert_attendance_range_unlocked
from models.attendance_models import Attendance
from models.wf_models import RawAttendanceEvent
from services.wf_domain_event_service import publish_wf_event
from services.wf_exception_service import scan_day_exceptions
from services.wf_rule_orchestrator import OrchestratorContext, run_attendance_pipeline
from services.wf_observability_service import record_metric

logger = logging.getLogger(__name__)


def _pair_events(events: list[RawAttendanceEvent]) -> tuple[datetime | None, datetime | None, float]:
    ins = sorted([e for e in events if e.event_type.upper() == "IN"], key=lambda x: x.punch_time)
    outs = sorted([e for e in events if e.event_type.upper() == "OUT"], key=lambda x: x.punch_time)
    time_in = ins[0].punch_time if ins else None
    time_out = outs[-1].punch_time if outs else None
    hours = 0.0
    if time_in and time_out and time_out > time_in:
        hours = (time_out - time_in).total_seconds() / 3600.0
    return time_in, time_out, hours


async def recompute_employee_day(
    db: AsyncSession,
    organisation_id: UUID,
    employee_id: UUID,
    work_date: date,
    *,
    engine_version: str = "v2",
) -> Attendance | None:
    """Build/update attendances row from raw events for one employee-day."""
    await assert_attendance_range_unlocked(db, organisation_id, work_date, work_date)

    day_start = datetime.combine(work_date, time.min, tzinfo=timezone.utc)
    day_end = datetime.combine(work_date, time.max, tzinfo=timezone.utc)

    ev_q = await db.execute(
        select(RawAttendanceEvent).where(
            RawAttendanceEvent.organisation_id == organisation_id,
            RawAttendanceEvent.employee_id == employee_id,
            RawAttendanceEvent.punch_time >= day_start,
            RawAttendanceEvent.punch_time <= day_end,
            RawAttendanceEvent.duplicate_flag.is_(False),
        ).order_by(RawAttendanceEvent.punch_time.asc())
    )
    events = list(ev_q.scalars().all())

    if not events:
        return None

    time_in, time_out, work_hours = _pair_events(events)
    dominant_source = events[-1].source
    event_ids = [str(e.event_id) for e in events]

    missing_out = len(events) == 1 and events[0].event_type.upper() == "IN"
    has_dup = any(e.duplicate_flag for e in events)
    has_anomaly = any(e.anomaly_flag for e in events)

    orch_ctx = OrchestratorContext(
        organisation_id=organisation_id,
        employee_id=employee_id,
        work_date=work_date,
        events=events,
        time_in=time_in,
        time_out=time_out,
        work_hours=work_hours,
    )
    pipeline = await run_attendance_pipeline(db, orch_ctx)
    record_metric("wf_recompute_duration_ms", float(pipeline.policy_result.get("duration_ms", 0) or 0))

    status = pipeline.status
    payable_fraction = pipeline.payable_fraction
    policy_result = {**pipeline.policy_result, "engine": engine_version, "event_count": len(events)}

    await scan_day_exceptions(
        db,
        organisation_id,
        employee_id,
        work_date,
        missing_punch_out=missing_out,
        duplicate_punch=has_dup,
        anomaly=has_anomaly,
        source_event_ids=event_ids,
    )

    existing_q = await db.execute(
        select(Attendance).where(
            Attendance.employee_id == employee_id,
            Attendance.work_date == work_date,
        )
    )
    row = existing_q.scalar_one_or_none()
    if row and row.is_locked:
        logger.warning("skip recompute locked attendance employee=%s date=%s", employee_id, work_date)
        return row

    values = {
        "organisation_id": organisation_id,
        "employee_id": employee_id,
        "work_date": work_date,
        "time_in": time_in,
        "time_out": time_out,
        "work_hours": work_hours,
        "source": dominant_source,
        "status": status,
        "day_fraction": payable_fraction,
        "payable_fraction": payable_fraction,
        "attendance_source": dominant_source,
        "policy_result_json": policy_result,
        "engine_version": engine_version,
        "late_minutes": pipeline.late_minutes,
        "early_exit_minutes": pipeline.early_exit_minutes,
        "overtime_hours": pipeline.overtime_hours,
    }

    if row:
        for k, v in values.items():
            if k not in ("organisation_id", "employee_id", "work_date"):
                setattr(row, k, v)
        await db.flush()
        result = row
    else:
        stmt = (
            pg_insert(Attendance)
            .values(**values)
            .on_conflict_do_update(
                index_elements=["employee_id", "work_date"],
                set_={
                    "time_in": time_in,
                    "time_out": time_out,
                    "work_hours": work_hours,
                    "source": dominant_source,
                    "status": status,
                    "day_fraction": payable_fraction,
                    "payable_fraction": payable_fraction,
                    "attendance_source": dominant_source,
                    "policy_result_json": policy_result,
                    "engine_version": engine_version,
                    "late_minutes": pipeline.late_minutes,
                    "early_exit_minutes": pipeline.early_exit_minutes,
                    "overtime_hours": pipeline.overtime_hours,
                },
            )
            .returning(Attendance)
        )
        res = await db.execute(stmt)
        result = res.scalar_one()

    await publish_wf_event(
        db,
        organisation_id,
        "wf.AttendanceRecomputed",
        {
            "employee_id": str(employee_id),
            "work_date": work_date.isoformat(),
            "attendance_id": str(result.attendance_id),
        },
        dedupe_key=f"recompute:{employee_id}:{work_date}",
    )
    await db.commit()
    await db.refresh(result)
    return result
