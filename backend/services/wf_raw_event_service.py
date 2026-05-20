"""Raw attendance event ingestion (never touches payroll directly)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import RawAttendanceEvent
import time

from models.wf_enterprise_models import WF_EVENT_ATTENDANCE_RECORDED
from services.wf_event_bus import publish_wf_domain_event
from services.wf_observability_service import record_ingest_latency


DUPLICATE_WINDOW_SECONDS = 60


async def ingest_raw_event(
    db: AsyncSession,
    organisation_id: UUID,
    payload: dict[str, Any],
    created_by: UUID | None = None,
) -> RawAttendanceEvent:
    t0 = time.perf_counter()
    punch_time = payload["punch_time"]
    employee_id = payload["employee_id"]

    window_start = punch_time - timedelta(seconds=DUPLICATE_WINDOW_SECONDS)
    window_end = punch_time + timedelta(seconds=DUPLICATE_WINDOW_SECONDS)
    dup_q = await db.execute(
        select(RawAttendanceEvent.event_id).where(
            RawAttendanceEvent.organisation_id == organisation_id,
            RawAttendanceEvent.employee_id == employee_id,
            RawAttendanceEvent.punch_time >= window_start,
            RawAttendanceEvent.punch_time <= window_end,
            RawAttendanceEvent.event_type == payload.get("event_type", "IN"),
        ).limit(1)
    )
    is_duplicate = dup_q.scalar_one_or_none() is not None

    event = RawAttendanceEvent(
        organisation_id=organisation_id,
        employee_id=employee_id,
        source=payload["source"],
        device_id=payload.get("device_id"),
        punch_time=punch_time,
        event_type=payload.get("event_type", "IN"),
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
        geo_radius=payload.get("geo_radius"),
        qr_reference=payload.get("qr_reference"),
        biometric_reference=payload.get("biometric_reference"),
        image_url=payload.get("image_url"),
        shift_id=payload.get("shift_id"),
        roster_id=payload.get("roster_id"),
        confidence_score=payload.get("confidence_score"),
        metadata_json=payload.get("metadata_json") or {},
        created_by=created_by,
        duplicate_flag=is_duplicate,
        verification_status="pending",
    )
    db.add(event)
    await db.flush()

    work_date = punch_time.date() if hasattr(punch_time, "date") else punch_time
    record_ingest_latency((time.perf_counter() - t0) * 1000)
    await publish_wf_domain_event(
        db,
        organisation_id,
        WF_EVENT_ATTENDANCE_RECORDED,
        {
            "event_id": str(event.event_id),
            "employee_id": str(employee_id),
            "work_date": work_date.isoformat() if isinstance(work_date, date) else str(work_date),
            "source": payload["source"],
        },
        dedupe_key=f"raw:{event.event_id}",
    )
    await db.commit()
    await db.refresh(event)

    work_date_val = punch_time.date() if hasattr(punch_time, "date") else punch_time
    try:
        from services.wf_day_result_service import recompute_employee_day

        await recompute_employee_day(db, organisation_id, employee_id, work_date_val)
    except Exception:
        pass

    return event
