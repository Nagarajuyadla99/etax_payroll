# payroll_system/models/attendance_models.py

import uuid
from sqlalchemy import (
    Column,
    String,
    Date,
    DateTime,
    Numeric,
    Float,
    ForeignKey,
    Text,
    UniqueConstraint,
    Boolean,
    Integer,
    CheckConstraint,
    Index,
    text,
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
    day_fraction = Column(Numeric(5, 4), nullable=False, server_default="1.0")
    is_locked = Column(Boolean, nullable=False, server_default="false")
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    salary_assignment_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employee_salary_assignments.salary_assignment_id", ondelete="CASCADE"),
        nullable=True,
    )

    salary_assignment = relationship("EmployeeSalaryAssignment", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", name="uq_employee_workdate"),
        Index("ix_attendances_org_emp_date", "organisation_id", "employee_id", "work_date"),
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
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("employee_id", "start_date", "end_date", name="uq_employee_leave_dates"),
        Index("ix_leaves_org_emp_status", "organisation_id", "employee_id", "status"),
        Index("ix_leaves_org_dates", "organisation_id", "start_date", "end_date"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="leave_records")
    approver = relationship("User", foreign_keys=[approved_by], lazy="joined")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="joined")


# ------------------------------------------------------------
# ORGANISATION HOLIDAYS
# ------------------------------------------------------------
class OrganisationHoliday(Base):
    __tablename__ = "organisation_holidays"

    holiday_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    holiday_date = Column(Date, nullable=False)
    name = Column(Text, nullable=True)
    is_optional = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organisation_id", "holiday_date", name="ux_org_holiday_date"),
        Index("ix_org_holidays_org_date", "organisation_id", "holiday_date"),
    )


# ------------------------------------------------------------
# EMPLOYEE LEAVE BALANCES (accrual / carry / encashment)
# ------------------------------------------------------------
class EmployeeLeaveBalance(Base):
    __tablename__ = "employee_leave_balances"

    balance_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organisation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
    )
    leave_type = Column(String(10), nullable=False)
    period_year = Column(Integer, nullable=False)
    opening_balance = Column(Numeric(8, 2), nullable=False, server_default=text("0"))
    accrued = Column(Numeric(8, 2), nullable=False, server_default=text("0"))
    consumed = Column(Numeric(8, 2), nullable=False, server_default=text("0"))
    carried_forward = Column(Numeric(8, 2), nullable=False, server_default=text("0"))
    encashed = Column(Numeric(8, 2), nullable=False, server_default=text("0"))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type", "period_year", name="ux_emp_leave_year"),
        Index("ix_leave_balances_org_emp", "organisation_id", "employee_id"),
        CheckConstraint(
            "leave_type IN ('CL','SL','EL','LOP')",
            name="ck_employee_leave_balances_leave_type",
        ),
    )