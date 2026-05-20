"""Attendance exception detection and persistence."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import AttendanceException


async def upsert_exception(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    employee_id: UUID,
    work_date: date,
    exception_type: str,
    severity: str = "medium",
    details: dict[str, Any] | None = None,
    source_event_ids: list[str] | None = None,
) -> AttendanceException:
    q = await db.execute(
        select(AttendanceException).where(
            AttendanceException.organisation_id == organisation_id,
            AttendanceException.employee_id == employee_id,
            AttendanceException.work_date == work_date,
            AttendanceException.exception_type == exception_type,
            AttendanceException.status == "open",
        ).limit(1)
    )
    row = q.scalar_one_or_none()
    if row:
        row.details_json = {**(row.details_json or {}), **(details or {})}
        if source_event_ids:
            existing = list(row.source_event_ids or [])
            row.source_event_ids = existing + source_event_ids
        await db.flush()
        return row

    row = AttendanceException(
        organisation_id=organisation_id,
        employee_id=employee_id,
        work_date=work_date,
        exception_type=exception_type,
        severity=severity,
        status="open",
        details_json=details or {},
        source_event_ids=source_event_ids or [],
    )
    db.add(row)
    await db.flush()
    try:
        from services.wf_event_bus import publish_wf_domain_event
        from models.wf_enterprise_models import WF_EVENT_EXCEPTION_RAISED

        await publish_wf_domain_event(
            db,
            organisation_id,
            WF_EVENT_EXCEPTION_RAISED,
            {
                "exception_id": str(row.exception_id),
                "exception_type": exception_type,
                "employee_id": str(employee_id),
                "work_date": work_date.isoformat(),
            },
            dedupe_key=f"exc:{row.exception_id}",
        )
    except Exception:
        pass
    return row


async def scan_day_exceptions(
    db: AsyncSession,
    organisation_id: UUID,
    employee_id: UUID,
    work_date: date,
    *,
    missing_punch_out: bool = False,
    duplicate_punch: bool = False,
    anomaly: bool = False,
    source_event_ids: list[str] | None = None,
) -> list[AttendanceException]:
    created: list[AttendanceException] = []
    ids = source_event_ids or []

    if missing_punch_out:
        created.append(
            await upsert_exception(
                db,
                organisation_id=organisation_id,
                employee_id=employee_id,
                work_date=work_date,
                exception_type="missing_punch",
                severity="high",
                details={"message": "Missing punch-out"},
                source_event_ids=ids,
            )
        )
    if duplicate_punch:
        created.append(
            await upsert_exception(
                db,
                organisation_id=organisation_id,
                employee_id=employee_id,
                work_date=work_date,
                exception_type="duplicate_punch",
                severity="low",
                details={"message": "Duplicate punch detected"},
                source_event_ids=ids,
            )
        )
    if anomaly:
        created.append(
            await upsert_exception(
                db,
                organisation_id=organisation_id,
                employee_id=employee_id,
                work_date=work_date,
                exception_type="attendance_anomaly",
                severity="medium",
                details={"message": "Anomaly flag on raw event"},
                source_event_ids=ids,
            )
        )
    return created
