# payroll_system/crud/attendance_crud.py
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.attendance_models import Attendance, EmployeeLeaveBalance, Leave
from models.payroll_models import PayPeriod
from services.leave_service import validate_new_leave

from schemas.attendance_schemas import (
    AttendanceBulkPayload,
    AttendanceBulkResult,
    AttendanceCreate,
    AttendanceUpdate,
    LeaveCreate,
)


def _day_fraction_for_status(status: Optional[str]) -> Decimal:
    if not status:
        return Decimal("1")
    s = status.strip().lower()
    if s in ("half_day", "hd"):
        return Decimal("0.5")
    return Decimal("1")


async def _pay_period_locked_overlap(
    db: AsyncSession,
    organisation_id: UUID,
    range_start: date,
    range_end: date,
) -> bool:
    q = await db.execute(
        select(PayPeriod.pay_period_id).where(
            PayPeriod.organisation_id == organisation_id,
            PayPeriod.attendance_leave_locked.is_(True),
            PayPeriod.start_date <= range_end,
            PayPeriod.end_date >= range_start,
        ).limit(1)
    )
    return q.scalar_one_or_none() is not None


async def assert_attendance_range_unlocked(
    db: AsyncSession,
    organisation_id: UUID,
    range_start: date,
    range_end: date,
) -> None:
    if await _pay_period_locked_overlap(db, organisation_id, range_start, range_end):
        raise ValueError(
            "Attendance/leave inputs are locked for this date range (payroll finalized)."
        )


# ------------------------------------------------------------
# Create attendance record
# ------------------------------------------------------------
async def create_attendance(db: AsyncSession, payload: AttendanceCreate) -> Attendance:
    await assert_attendance_range_unlocked(
        db, payload.organisation_id, payload.work_date, payload.work_date
    )

    # Give a clear 409 message instead of a generic integrity error.
    existing = await db.execute(
        select(Attendance.attendance_id).where(
            Attendance.employee_id == payload.employee_id,
            Attendance.work_date == payload.work_date,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError(
            "Attendance already exists for this employee and date. Use update instead."
        )

    data = payload.model_dump(exclude_none=False)
    data["work_hours"] = float(data.get("work_hours") or 0)
    data["day_fraction"] = _day_fraction_for_status(data.get("status"))
    if data.get("salary_assignment_id") is None:
        data.pop("salary_assignment_id", None)

    attendance = Attendance(**data)
    try:
        db.add(attendance)
        await db.commit()
        await db.refresh(attendance)
        return attendance
    except IntegrityError:
        await db.rollback()
        raise ValueError("Attendance creation failed (duplicate or invalid data).")


# ------------------------------------------------------------
# Get attendance by ID
# ------------------------------------------------------------
async def get_attendance(db: AsyncSession, attendance_id: UUID) -> Optional[Attendance]:
    q = await db.execute(select(Attendance).filter(Attendance.attendance_id == attendance_id))
    return q.scalar_one_or_none()


# ------------------------------------------------------------
# Update attendance record
# ------------------------------------------------------------
async def update_attendance(
    db: AsyncSession, attendance_id: UUID, payload: AttendanceUpdate
) -> Optional[Attendance]:
    attendance = await get_attendance(db, attendance_id)
    if not attendance:
        return None
    if attendance.is_locked:
        raise ValueError("Attendance row is locked.")
    await assert_attendance_range_unlocked(
        db,
        attendance.organisation_id,
        attendance.work_date,
        attendance.work_date,
    )

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(attendance, k, v)
    if payload.status is not None:
        attendance.day_fraction = _day_fraction_for_status(payload.status)
    if payload.work_hours is not None:
        attendance.work_hours = float(payload.work_hours)

    try:
        await db.commit()
        await db.refresh(attendance)
        return attendance
    except IntegrityError:
        await db.rollback()
        raise ValueError("Failed to update attendance record.")


# ------------------------------------------------------------
# Create leave request
# ------------------------------------------------------------
async def create_leave(db: AsyncSession, payload: LeaveCreate) -> Leave:
    await assert_attendance_range_unlocked(
        db, payload.organisation_id, payload.start_date, payload.end_date
    )
    await validate_new_leave(
        db,
        payload.organisation_id,
        payload.employee_id,
        payload.leave_type,
        payload.start_date,
        payload.end_date,
    )
    leave = Leave(**payload.model_dump())
    try:
        db.add(leave)
        await db.commit()
        await db.refresh(leave)
        return leave
    except IntegrityError:
        await db.rollback()
        raise ValueError("Leave creation failed (duplicate or invalid data).")


# ------------------------------------------------------------
# Get leave by ID
# ------------------------------------------------------------
async def get_leave(db: AsyncSession, leave_id: UUID) -> Optional[Leave]:
    q = await db.execute(select(Leave).filter(Leave.leave_id == leave_id))
    return q.scalar_one_or_none()


# ------------------------------------------------------------
# List attendance records
# ------------------------------------------------------------
async def list_attendance(
    db: AsyncSession,
    organisation_id: Optional[UUID] = None,
    employee_id: Optional[UUID] = None,
    for_date: Optional[date] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> List[Attendance]:
    q = select(Attendance)
    if organisation_id:
        q = q.filter(Attendance.organisation_id == organisation_id)
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if for_date:
        q = q.filter(Attendance.work_date == for_date)
    if from_date:
        q = q.filter(Attendance.work_date >= from_date)
    if to_date:
        q = q.filter(Attendance.work_date <= to_date)

    res = await db.execute(q.order_by(Attendance.work_date, Attendance.employee_id))
    return list(res.scalars().all())


# ------------------------------------------------------------
# Bulk upsert attendance (organisation scope)
# ------------------------------------------------------------
async def bulk_upsert_attendance(
    db: AsyncSession,
    payload: AttendanceBulkPayload,
) -> AttendanceBulkResult:
    errors: List[dict] = []
    if not payload.records:
        return AttendanceBulkResult(created=0, updated=0, errors=[])

    dates = [r.work_date for r in payload.records]
    d0, d1 = min(dates), max(dates)
    try:
        await assert_attendance_range_unlocked(db, payload.organisation_id, d0, d1)
    except ValueError as e:
        return AttendanceBulkResult(created=0, updated=0, errors=[{"detail": str(e)}])

    created = 0
    updated = 0

    for idx, r in enumerate(payload.records):
        day_frac = _day_fraction_for_status(r.status)
        values = {
            "organisation_id": payload.organisation_id,
            "employee_id": r.employee_id,
            "work_date": r.work_date,
            "time_in": r.time_in,
            "time_out": r.time_out,
            "work_hours": float(r.work_hours or 0),
            "status": r.status,
            "remarks": r.remarks,
            "day_fraction": day_frac,
            "source": "bulk",
        }
        try:
            existing = await db.execute(
                select(Attendance).where(
                    Attendance.employee_id == r.employee_id,
                    Attendance.work_date == r.work_date,
                )
            )
            row = existing.scalar_one_or_none()
            if row and row.is_locked:
                errors.append({"row": idx, "detail": "Row is locked"})
                continue

            if payload.upsert:
                insert_stmt = pg_insert(Attendance).values(**values)
                upsert_stmt = insert_stmt.on_conflict_do_update(
                    constraint="uq_employee_workdate",
                    set_={
                        "organisation_id": insert_stmt.excluded.organisation_id,
                        "time_in": insert_stmt.excluded.time_in,
                        "time_out": insert_stmt.excluded.time_out,
                        "work_hours": insert_stmt.excluded.work_hours,
                        "status": insert_stmt.excluded.status,
                        "remarks": insert_stmt.excluded.remarks,
                        "day_fraction": insert_stmt.excluded.day_fraction,
                        "source": insert_stmt.excluded.source,
                        "updated_at": func.now(),
                    },
                )
                await db.execute(upsert_stmt)
                if row:
                    updated += 1
                else:
                    created += 1
            else:
                if row:
                    errors.append({"row": idx, "detail": "Duplicate work_date for employee"})
                    continue
                db.add(Attendance(**values))
                created += 1
        except IntegrityError:
            errors.append({"row": idx, "detail": "Integrity error"})
        except Exception as ex:  # noqa: BLE001
            errors.append({"row": idx, "detail": str(ex)})

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    return AttendanceBulkResult(created=created, updated=updated, errors=errors)


# ------------------------------------------------------------
# List leave records
# ------------------------------------------------------------
async def list_leaves(db: AsyncSession, employee_id: Optional[UUID] = None) -> List[Leave]:
    q = select(Leave)
    if employee_id:
        q = q.filter(Leave.employee_id == employee_id)
    res = await db.execute(q)
    return list(res.scalars().all())


async def list_employee_leave_balances(
    db: AsyncSession,
    employee_id: UUID,
    period_year: int,
) -> List[EmployeeLeaveBalance]:
    res = await db.execute(
        select(EmployeeLeaveBalance).where(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.period_year == period_year,
        )
    )
    return list(res.scalars().all())
