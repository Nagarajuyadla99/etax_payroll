# payroll_system/crud/attendance_crud.py
from typing import Optional, List
from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from models.attendance_models import Attendance, Leave
from schemas.attendance_schemas import AttendanceCreate, AttendanceUpdate, LeaveCreate, LeaveUpdate


# ------------------------------------------------------------
# Create attendance record
# ------------------------------------------------------------
async def create_attendance(db: AsyncSession, payload: AttendanceCreate) -> Attendance:
    attendance = Attendance(**payload.model_dump())
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
async def update_attendance(db: AsyncSession, attendance_id: UUID, payload: AttendanceUpdate) -> Optional[Attendance]:
    attendance = await get_attendance(db, attendance_id)
    if not attendance:
        return None

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(attendance, k, v)

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
# List attendance records (optionally filtered by employee)
# ------------------------------------------------------------
async def list_attendance(
    db: AsyncSession,
    employee_id: Optional[UUID] = None,
    for_date: Optional[date] = None
) -> List[Attendance]:
    q = select(Attendance)
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if for_date:
        q = q.filter(Attendance.work_date == for_date)

    res = await db.execute(q)
    return res.scalars().all()


# ------------------------------------------------------------
# List leave records
# ------------------------------------------------------------
async def list_leaves(db: AsyncSession, employee_id: Optional[UUID] = None) -> List[Leave]:
    q = select(Leave)
    if employee_id:
        q = q.filter(Leave.employee_id == employee_id)
    res = await db.execute(q)
    return res.scalars().all()