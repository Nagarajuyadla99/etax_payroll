from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BankBase(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    name: str = Field(min_length=2)
    swift_code: Optional[str] = Field(default=None, max_length=20)
    country: str = Field(default="India", max_length=100)
    is_active: bool = True


class BankCreate(BankBase):
    pass


class BankUpdate(BaseModel):
    code: Optional[str] = Field(default=None, min_length=2, max_length=30)
    name: Optional[str] = Field(default=None, min_length=2)
    swift_code: Optional[str] = Field(default=None, max_length=20)
    country: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None


class BankOut(BankBase):
    bank_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BankBranchBase(BaseModel):
    bank_id: UUID
    branch_name: str
    ifsc_code: Optional[str] = None
    micr_code: Optional[str] = None
    swift_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    is_active: bool = True


class BankBranchCreate(BankBranchBase):
    pass


class BankBranchUpdate(BaseModel):
    branch_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    micr_code: Optional[str] = None
    swift_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None


class BankBranchOut(BankBranchBase):
    branch_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TransferModeBase(BaseModel):
    organisation_id: UUID
    bank_id: Optional[UUID] = None
    mode: str = Field(min_length=2, max_length=20)
    is_enabled: bool = True


class TransferModeCreate(TransferModeBase):
    pass


class TransferModeOut(TransferModeBase):
    mode_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CompanySalaryAccountBase(BaseModel):
    organisation_id: UUID
    bank_branch_id: UUID
    account_holder_name: str
    account_number: str
    account_type: Optional[str] = None
    allowed_modes: list[str] = []
    is_default: bool = False
    is_active: bool = True


class CompanySalaryAccountCreate(CompanySalaryAccountBase):
    pass


class CompanySalaryAccountOut(BaseModel):
    company_account_id: UUID
    organisation_id: UUID
    bank_branch_id: UUID
    account_holder_name: str
    account_number_last4: str
    account_type: Optional[str] = None
    allowed_modes: list[str] = []
    is_default: bool
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class IfscValidateIn(BaseModel):
    ifsc_code: str


class SwiftValidateIn(BaseModel):
    swift_code: str


class ValidateOut(BaseModel):
    ok: bool
    normalized: Optional[str] = None
    details: dict[str, Any] = {}


class EmployeeBankAccountCreate(BaseModel):
    employee_id: UUID
    bank_branch_id: UUID
    account_holder_name: str
    account_number: str
    upi_vpa: Optional[str] = None
    effective_from: date
    is_primary: bool = False


class EmployeeBankAccountOut(BaseModel):
    bank_account_id: UUID
    employee_id: UUID
    bank_branch_id: UUID
    account_holder_name: str
    account_number_last4: str
    upi_vpa: Optional[str] = None
    is_primary: bool
    verification_status: str
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None
    effective_from: date
    effective_to: Optional[date] = None
    created_at: datetime
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class EmployeeBankVerifyIn(BaseModel):
    status: str = Field(pattern="^(verified|rejected)$")
    comment: Optional[str] = None

