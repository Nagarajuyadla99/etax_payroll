# payroll_system/models/attendance_models.py

import uuid
from sqlalchemy import (
    Column, String, Date, DateTime, Numeric,Float,ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from enum import Enum

from database import Base


# ------------------------------------------------------------
# ENUM DEFINITIONS
# ------------------------------------------------------------
class AttendanceStatusEnum(str, Enum):
    present = "present"
    absent = "absent"
    half_day = "half_day"
    leave = "leave"
    holiday = "holiday"


class LeaveStatusEnum(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


# ------------------------------------------------------------
# ATTENDANCE TABLE
# ------------------------------------------------------------
class Attendance(Base):
    __tablename__ = "attendances"

    attendance_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False
    )
    employee_id = Column(
    PG_UUID(as_uuid=True),
    ForeignKey("employees.employee_id", ondelete="CASCADE"),
    nullable=False
)
    work_date = Column(Date, nullable=False)
    time_in = Column(DateTime(timezone=True))
    time_out = Column(DateTime(timezone=True))
    work_hours = Column(Float, nullable=False)
    source = Column(String(50))
    status = Column(String(20), default=AttendanceStatusEnum.present.value)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    salary_assignment_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employee_salary_assignments.salary_assignment_id", ondelete="CASCADE"),
        nullable=True,
    )

    salary_assignment = relationship("EmployeeSalaryAssignment", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", name="uq_employee_workdate"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="attendance_records")



# ------------------------------------------------------------
# LEAVE TABLE
# ------------------------------------------------------------
class Leave(Base):
    __tablename__ = "leaves"

    leave_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False
    )
    employee_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False
    )
    leave_type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    days = Column(Numeric(6, 2), nullable=True)
    status = Column(String(20), default=LeaveStatusEnum.pending.value)
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    approved_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    approved_on = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "start_date", "end_date", name="uq_employee_leave_dates"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="leave_records")
    approver = relationship("User", foreign_keys=[approved_by], lazy="joined")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="joined")