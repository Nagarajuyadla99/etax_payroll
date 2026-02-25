# payroll_system/schemas/attendance_schemas.py
from pydantic import BaseModel,Field,ConfigDict
from uuid import UUID
from datetime import date, datetime
from typing import Optional
from decimal import Decimal

# ------------------------------------------------------------
# Attendance Schemas
# ------------------------------------------------------------

class AttendanceCreate(BaseModel):
    organisation_id: UUID
    employee_id: UUID
    work_date: date
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
    work_hours: Optional[Decimal] = Field(default=None, ge=0)
    status: Optional[str] = Field(default="present")
    remarks: Optional[str] = None

    class Config:
        from_attributes = True
class AttendanceUpdate(BaseModel):
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
    work_hours: Optional[Decimal] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class AttendanceOut(AttendanceCreate):
    attendance_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------
# Leave Schemas
# ------------------------------------------------------------

class LeaveCreate(BaseModel):
    organisation_id: UUID
    employee_id: UUID
    leave_type: str  # e.g., 'Sick Leave', 'Casual Leave'
    start_date: date
    end_date: date
    reason: Optional[str] = None
    status: Optional[str] = "pending"  # pending, approved, rejected


class LeaveUpdate(BaseModel):
    status: Optional[str] = None
    reason: Optional[str] = None


class LeaveOut(LeaveCreate):
    leave_id: UUID
    approved_by: Optional[UUID] = None
    approved_on: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)