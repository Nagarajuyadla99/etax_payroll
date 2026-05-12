# payroll_system/schemas/payroll_schemas.py

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


# ============================================================
# PAY PERIOD
# ============================================================

class PayPeriodBase(BaseModel):
    organisation_id: UUID
    start_date: date
    end_date: date
    status: Optional[str] = "open"
    attendance_leave_locked: Optional[bool] = False
    locked_at: Optional[datetime] = None
    locked_by_payroll_run_id: Optional[UUID] = None


class PayPeriodCreate(PayPeriodBase):
    pass


class PayPeriodUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


class PayPeriodOut(PayPeriodBase):
    pay_period_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# PAYROLL RUN
# ============================================================

class PayrollRunBase(BaseModel):
    organisation_id: UUID
    pay_period_id: UUID
    processed_by: Optional[UUID] = None
    processed_at: Optional[datetime] = None
    status: Optional[str] = "draft"
    notes: Optional[str] = None
    gross_pay_total: Decimal = Field(default=Decimal("0.00"))
    net_pay_total: Decimal = Field(default=Decimal("0.00"))
    execution_trace_id: Optional[UUID] = None
    execution_meta: Optional[dict] = None
    execution_status: Optional[str] = None
    # Phase 4 lifecycle
    lifecycle_status: Optional[str] = None
    lifecycle_verified_at: Optional[datetime] = None
    lifecycle_verified_by: Optional[UUID] = None
    lifecycle_approved_at: Optional[datetime] = None
    lifecycle_approved_by: Optional[UUID] = None
    payroll_locked_at: Optional[datetime] = None
    lifecycle_locked_by: Optional[UUID] = None
    final_snapshot: Optional[dict] = None


class PayrollRunCreate(BaseModel):
   
    organisation_id: UUID
    pay_period_id: UUID
    notes: Optional[str] = None


class PayrollBatchProcessRequest(BaseModel):
    payroll_run_ids: List[UUID]


class PayrollRunUpdate(BaseModel):
    processed_by: Optional[UUID] = None
    processed_at: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    gross_pay_total: Optional[Decimal] = None
    net_pay_total: Optional[Decimal] = None


class PayrollRunOut(PayrollRunBase):
    payroll_run_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# PAYROLL ENTRY
# ============================================================

class PayrollEntryBase(BaseModel):
    payroll_run_id: UUID
    employee_id: UUID
    component_id: UUID
    pay_period_id: UUID
    amount: Decimal
    meta: Optional[dict] = None


class PayrollEntryCreate(PayrollEntryBase):
    pass


class PayrollEntryUpdate(BaseModel):
    amount: Optional[Decimal] = None
    meta: Optional[dict] = None


class PayrollEntryOut(PayrollEntryBase):
    payroll_entry_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)