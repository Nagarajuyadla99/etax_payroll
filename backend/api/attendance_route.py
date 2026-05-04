# payroll_system/api/attendance_routes.py
from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from utils.dependencies import get_admin_user
from schemas.attendance_schemas import (
    AttendanceBulkPayload,
    AttendanceBulkResult,
    AttendanceCalendarJobIn,
    AttendanceCreate,
    AttendanceOut,
    AttendanceUpdate,
    EmployeeLeaveBalanceOut,
    LeaveApproveIn,
    LeaveCreate,
    LeaveOut,
)
from crud.attendance_crud import (
    bulk_upsert_attendance,
    create_attendance,
    create_leave,
    get_attendance,
    get_leave,
    list_attendance,
    list_employee_leave_balances,
    list_leaves,
    update_attendance,
)
from services.attendance_calendar_service import apply_org_calendar_marks
from services.leave_service import approve_or_reject_leave

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ------------------------------------------------------------
# Static / collection routes (before /{attendance_id})
# ------------------------------------------------------------
@router.get("/", response_model=List[AttendanceOut])
async def list_attendance_route(
    db: AsyncSession = Depends(get_async_db),
    organisation_id: Optional[UUID] = None,
    employee_id: Optional[UUID] = None,
    for_date: Optional[date] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
):
    return await list_attendance(
        db,
        organisation_id=organisation_id,
        employee_id=employee_id,
        for_date=for_date,
        from_date=from_date,
        to_date=to_date,
    )


@router.post("/", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_attendance_route(
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    print("Incoming data:", data)
    try:
        return await create_attendance(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/bulk", response_model=AttendanceBulkResult, status_code=status.HTTP_200_OK)
async def bulk_attendance_route(
    data: AttendanceBulkPayload,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    return await bulk_upsert_attendance(db, data)


@router.post("/jobs/apply-calendar", status_code=status.HTTP_200_OK)
async def apply_calendar_job_route(
    data: AttendanceCalendarJobIn,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    try:
        return await apply_org_calendar_marks(
            db,
            data.organisation_id,
            data.from_date,
            data.to_date,
            employee_ids=data.employee_ids,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/leave/balance", response_model=List[EmployeeLeaveBalanceOut])
async def leave_balance_route(
    employee_id: UUID,
    year: int,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    rows = await list_employee_leave_balances(db, employee_id, year)
    return rows


@router.post("/leave/", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
async def create_leave_route(
    data: LeaveCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    try:
        return await create_leave(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/leave/", response_model=List[LeaveOut])
async def list_leaves_route(
    db: AsyncSession = Depends(get_async_db),
    employee_id: Optional[UUID] = None,
):
    return await list_leaves(db, employee_id)


@router.post("/leave/{leave_id}/approve", response_model=LeaveOut)
async def approve_leave_route(
    leave_id: UUID,
    data: LeaveApproveIn,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    try:
        return await approve_or_reject_leave(
            db,
            leave_id,
            current_user.user_id,
            data.decision,
            notes=data.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/leave/{leave_id}", response_model=LeaveOut)
async def get_leave_route(
    leave_id: UUID,
    db: AsyncSession = Depends(get_async_db),
):
    leave = await get_leave(db, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave record not found")
    return leave


# ------------------------------------------------------------
# Single attendance by ID (dynamic last)
# ------------------------------------------------------------
@router.put("/{attendance_id}", response_model=AttendanceOut)
async def update_attendance_route(
    attendance_id: UUID,
    data: AttendanceUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    try:
        updated = await update_attendance(db, attendance_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    if not updated:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return updated


@router.get("/{attendance_id}", response_model=AttendanceOut)
async def get_attendance_route(
    attendance_id: UUID,
    db: AsyncSession = Depends(get_async_db),
):
    attendance = await get_attendance(db, attendance_id)
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance
