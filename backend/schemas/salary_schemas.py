# payroll_system/schemas/salary_schemas.py

from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


# ============================================================
# SALARY COMPONENT SCHEMAS
# ============================================================

class SalaryComponentBase(BaseModel):
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    component_type: str       # 'earning', 'deduction', 'benefit', 'reimbursement'
    is_active: Optional[bool] = True
    calc_type: Optional[str] = "fixed"   # 'fixed', 'percentage', 'formula'
    percentage_of: Optional[str] = None
    formula: Optional[str] = None
    rounding: Optional[Decimal] = Decimal("0.0000")
    is_taxable: Optional[bool] = True
    is_pf_applicable: Optional[bool] = False
    is_allowance: Optional[bool] = False
    is_loan_related: Optional[bool] = False


class SalaryComponentCreate(SalaryComponentBase):
    pass


class SalaryComponentUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    component_type: Optional[str] = None
    is_active: Optional[bool] = None
    calc_type: Optional[str] = None
    percentage_of: Optional[str] = None
    rounding: Optional[Decimal] = None
    is_taxable: Optional[bool] = None
    is_pf_applicable: Optional[bool] = None
    is_allowance: Optional[bool] = None
    is_loan_related: Optional[bool] = None


class SalaryComponentOut(SalaryComponentBase):
    component_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# SALARY TEMPLATE SCHEMAS
# ============================================================

class SalaryTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: Optional[bool] = False


class SalaryTemplateCreate(SalaryTemplateBase):
    pass


class SalaryTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None


class SalaryTemplateOut(SalaryTemplateBase):
    template_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# SALARY TEMPLATE COMPONENT SCHEMAS
# ============================================================

class SalaryTemplateComponentBase(BaseModel):
    template_id: UUID
    component_id: UUID
    sequence: Optional[int] = 1

    amount: Optional[Decimal] = None
    percentage: Optional[Decimal] = None
    percentage_of: Optional[str] = None
    formula: Optional[str] = None
    is_active: Optional[bool] = True

    @model_validator(mode="after")
    def validate_calc_input(self):
        # BUG FIX: Decimal("0") is not None, so amount=0 used to silently pass
        # this check and create a broken ₹0 component. Treat zero as absent.
        has_amount = self.amount is not None and self.amount != Decimal("0")
        has_percentage = self.percentage is not None
        has_formula = self.formula is not None and self.formula.strip() != ""

        if not any([has_amount, has_percentage, has_formula]):
            raise ValueError(
                "Provide one of: amount (non-zero) OR percentage OR formula"
            )

        if has_percentage and not self.percentage_of:
            raise ValueError("percentage_of is required when percentage is used")

        return self


class SalaryTemplateComponentCreate(SalaryTemplateComponentBase):
    pass


class SalaryTemplateComponentUpdate(BaseModel):
    sequence: Optional[int] = None
    amount: Optional[Decimal] = None
    percentage: Optional[Decimal] = None
    # BUG FIX: percentage_of and formula were missing from the update schema.
    # Without them, PUT /templates/components/{stc_id} could never update these
    # fields — the patcher silently dropped them.
    percentage_of: Optional[str] = None
    formula: Optional[str] = None
    is_active: Optional[bool] = None


class SalaryTemplateComponentOut(SalaryTemplateComponentBase):
    stc_id: UUID

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# PAY STRUCTURE SCHEMAS
# ============================================================

class PayStructureBase(BaseModel):
    # BUG FIX: organisation_id removed from the input schema.
    # The CRUD layer (clean_payload) already strips it and re-injects it from
    # current_user.organisation_id, so requiring it from the client was both
    # redundant and an IDOR risk (any caller could supply any org UUID).
    name: str
    template_id: UUID
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None


class PayStructureCreate(PayStructureBase):
    pass


class PayStructureUpdate(BaseModel):
    name: Optional[str] = None
    template_id: Optional[UUID] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None


class PayStructureOut(PayStructureBase):
    pay_structure_id: UUID
    organisation_id: UUID          # safe to expose in read responses
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# EMPLOYEE SALARY STRUCTURE SCHEMAS
# ============================================================

class EmployeeSalaryStructureBase(BaseModel):
    employee_id: UUID
    template_id: UUID
    effective_from: Optional[date] = None


class EmployeeSalaryStructureCreate(EmployeeSalaryStructureBase):
    ctc: Decimal


class EmployeeSalaryStructureOut(BaseModel):
    id: UUID
    employee_id: UUID
    template_id: UUID
    effective_from: date
    ctc: float

    model_config = ConfigDict(from_attributes=True)
