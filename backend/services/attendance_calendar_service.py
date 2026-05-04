"""Auto-mark organisation holidays and configured week-offs on attendance rows."""
from __future__ import annotations

from datetime import date, timedelta
from typing import List, Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attendance_models import OrganisationHoliday
from models.employee_model import Employee
from models.org_models import Organisation
from schemas.attendance_schemas import AttendanceBulkPayload, AttendanceBulkRow
from crud.attendance_crud import assert_attendance_range_unlocked, bulk_upsert_attendance


def _daterange(d0: date, d1: date) -> List[date]:
    out: List[date] = []
    cur = d0
    while cur <= d1:
        out.append(cur)
        cur += timedelta(days=1)
    return out


async def apply_org_calendar_marks(
    db: AsyncSession,
    organisation_id: UUID,
    from_date: date,
    to_date: date,
    *,
    employee_ids: Optional[Sequence[UUID]] = None,
    chunk_size: int = 250,
) -> dict:
    if from_date > to_date:
        raise ValueError("from_date must be on or before to_date.")

    await assert_attendance_range_unlocked(db, organisation_id, from_date, to_date)

    org_r = await db.execute(select(Organisation).where(Organisation.organisation_id == organisation_id))
    org = org_r.scalar_one_or_none()
    if not org:
        raise ValueError("Organisation not found.")

    hr = org.hr_settings or {}
    att = hr.get("attendance") or {}
    week_off_days = att.get("week_off_weekdays")  # Monday=0 .. Sunday=6
    if week_off_days is None:
        week_off_days = []
    auto_holidays = bool(att.get("auto_mark_holidays", True))

    hol_dates: set[date] = set()
    if auto_holidays:
        hol_q = await db.execute(
            select(OrganisationHoliday.holiday_date).where(
                OrganisationHoliday.organisation_id == organisation_id,
                OrganisationHoliday.holiday_date >= from_date,
                OrganisationHoliday.holiday_date <= to_date,
            )
        )
        hol_dates = {row[0] for row in hol_q.all()}

    emp_q = select(Employee.employee_id).where(
        Employee.organisation_id == organisation_id,
        Employee.is_active.is_(True),
    )
    if employee_ids:
        emp_q = emp_q.where(Employee.employee_id.in_(tuple(employee_ids)))
    emp_r = await db.execute(emp_q)
    employees = [row[0] for row in emp_r.all()]
    if not employees:
        return {"processed_rows": 0, "chunks": 0, "errors": []}

    records: List[AttendanceBulkRow] = []
    for d in _daterange(from_date, to_date):
        if d in hol_dates:
            status = "H"
            frac_hours = 0.0
        elif d.weekday() in week_off_days:
            status = "WO"
            frac_hours = 0.0
        else:
            continue

        for eid in employees:
            records.append(
                AttendanceBulkRow(
                    employee_id=eid,
                    work_date=d,
                    status=status,
                    work_hours=frac_hours,
                    remarks="calendar",
                )
            )

    if not records:
        return {"processed_rows": 0, "chunks": 0, "errors": []}

    total_errors: list = []
    chunks = 0
    processed = 0
    for i in range(0, len(records), chunk_size):
        chunk = records[i : i + chunk_size]
        chunks += 1
        res = await bulk_upsert_attendance(
            db,
            AttendanceBulkPayload(organisation_id=organisation_id, records=chunk, upsert=True),
        )
        processed += res.created + res.updated
        total_errors.extend(res.errors)

    return {"processed_rows": processed, "chunks": chunks, "errors": total_errors}
