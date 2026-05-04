# payroll_system/schemas/attendance_schemas.py
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import date, datetime
from typing import Literal, Optional, List
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
    work_hours: float = Field(default=0.0, ge=0)
    status: Optional[str] = Field(default="present")
    remarks: Optional[str] = None
    salary_assignment_id: Optional[UUID] = None

    class Config:
        from_attributes = True
class AttendanceUpdate(BaseModel):
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
    work_hours: Optional[float] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class AttendanceOut(AttendanceCreate):
    attendance_id: UUID
    created_at: datetime
    day_fraction: Optional[Decimal] = None
    is_locked: bool = False
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceBulkRow(BaseModel):
    employee_id: UUID
    work_date: date
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
    work_hours: float = Field(default=0.0, ge=0)
    status: str = "present"
    remarks: Optional[str] = None


class AttendanceBulkPayload(BaseModel):
    organisation_id: UUID
    records: List[AttendanceBulkRow]
    upsert: bool = True


class AttendanceBulkResult(BaseModel):
    created: int
    updated: int
    errors: List[dict]


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
    days: Optional[Decimal] = None
    notes: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)


class LeaveApproveIn(BaseModel):
    decision: Literal["approved", "rejected"] = "approved"
    notes: Optional[str] = None


class AttendanceCalendarJobIn(BaseModel):
    organisation_id: UUID
    from_date: date
    to_date: date
    employee_ids: Optional[List[UUID]] = None


class EmployeeLeaveBalanceOut(BaseModel):
    balance_id: UUID
    organisation_id: UUID
    employee_id: UUID
    leave_type: str
    period_year: int
    opening_balance: Decimal
    accrued: Decimal
    consumed: Decimal
    carried_forward: Decimal
    encashed: Decimal
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)