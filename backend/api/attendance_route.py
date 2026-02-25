# payroll_system/api/attendance_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from datetime import date

from database import get_async_db
from utils.dependencies import get_admin_user
from schemas.attendance_schemas import (
    AttendanceCreate, AttendanceOut, AttendanceUpdate,
    LeaveCreate, LeaveOut, LeaveUpdate
)
from crud.attendance_crud import (
    create_attendance, get_attendance, update_attendance,
    create_leave, get_leave, list_attendance, list_leaves
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ------------------------------------------------------------
# Create attendance record
# ------------------------------------------------------------
@router.post("/", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_attendance_route(
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    print("Incoming data:", data)
    return await create_attendance(db, data)
    


# ------------------------------------------------------------
# Get attendance record by ID 
# ------------------------------------------------------------
@router.get("/{attendance_id}", response_model=AttendanceOut)
async def get_attendance_route(
    attendance_id: UUID,
    db: AsyncSession = Depends(get_async_db)
):
    attendance = await get_attendance(db, attendance_id)
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance


# ------------------------------------------------------------
# Update attendance
# ------------------------------------------------------------
@router.put("/{attendance_id}", response_model=AttendanceOut)
async def update_attendance_route(
    attendance_id: UUID,
    data: AttendanceUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    updated = await update_attendance(db, attendance_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return updated


# ------------------------------------------------------------
# Create leave record
# ------------------------------------------------------------
@router.post("/leave/", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
async def create_leave_route(
    data: LeaveCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    return await create_leave(db, data)


# ------------------------------------------------------------
# Get leave record by ID
# ------------------------------------------------------------
@router.get("/leave/{leave_id}", response_model=LeaveOut)
async def get_leave_route(
    leave_id: UUID,
    db: AsyncSession = Depends(get_async_db)
):
    leave = await get_leave(db, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave record not found")
    return leave


# ------------------------------------------------------------
# List attendance records
# ------------------------------------------------------------
@router.get("/", response_model=List[AttendanceOut])
async def list_attendance_route(
    db: AsyncSession = Depends(get_async_db),
    employee_id: Optional[UUID] = None,
    for_date: Optional[date] = None
):
    return await list_attendance(db, employee_id, for_date)


# ------------------------------------------------------------
# List leave records
# ------------------------------------------------------------
@router.get("/leave/", response_model=List[LeaveOut])
async def list_leaves_route(
    db: AsyncSession = Depends(get_async_db),
    employee_id: Optional[UUID] = None
):
    return await list_leaves(db, employee_id)