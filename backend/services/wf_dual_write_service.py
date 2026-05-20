"""Optional dual-write: legacy attendance CRUD → raw_attendance_events."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.attendance_models import Attendance
from services.wf_feature_flag_service import is_feature_enabled
from services.wf_raw_event_service import ingest_raw_event


async def mirror_attendance_to_raw(
    db: AsyncSession,
    attendance: Attendance,
    *,
    event_type: str = "IN",
    created_by: UUID | None = None,
) -> None:
    """If wf_dual_write flag enabled, record synthetic raw event for audit trail."""
    if not await is_feature_enabled(db, attendance.organisation_id, "wf_dual_write"):
        return

    punch_time = attendance.time_in or datetime.combine(
        attendance.work_date,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )
    if punch_time.tzinfo is None:
        punch_time = punch_time.replace(tzinfo=timezone.utc)

    payload: dict[str, Any] = {
        "employee_id": attendance.employee_id,
        "source": attendance.attendance_source or attendance.source or "manual_hr",
        "punch_time": punch_time,
        "event_type": event_type,
        "metadata_json": {
            "attendance_id": str(attendance.attendance_id),
            "status": attendance.status,
            "dual_write": True,
        },
    }
    try:
        await ingest_raw_event(db, attendance.organisation_id, payload, created_by=created_by)
    except Exception:
        pass
