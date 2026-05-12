from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SalaryBatchCreate(BaseModel):
    payroll_run_id: UUID
    pay_period_id: UUID
    batch_ref: str = Field(min_length=3, max_length=50)


class SalaryBatchOut(BaseModel):
    batch_id: UUID
    organisation_id: UUID
    payroll_run_id: UUID
    pay_period_id: UUID
    batch_ref: str
    total_employees: int
    total_amount: Decimal
    status: str
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SalaryBatchItemOut(BaseModel):
    item_id: UUID
    batch_id: UUID
    employee_id: UUID
    employee_bank_account_id: Optional[UUID] = None
    amount: Decimal
    status: str
    payout_ref: Optional[str] = None
    failure_reason: Optional[str] = None
    attempts: int
    last_attempt_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SalaryBatchDetailOut(SalaryBatchOut):
    items: list[SalaryBatchItemOut] = []


class ApproveIn(BaseModel):
    comment: Optional[str] = None


class ApprovalOut(BaseModel):
    approval_id: UUID
    organisation_id: UUID
    entity_type: str
    entity_id: UUID
    step: str
    status: str
    actor_user_id: Optional[UUID]
    decided_at: Optional[datetime]
    comment: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

