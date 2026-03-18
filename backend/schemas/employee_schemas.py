# payroll_system/schemas/employee_schemas.py

from pydantic import BaseModel, ConfigDict, EmailStr,Field
from typing import Optional, Dict
from uuid import UUID
from datetime import date, datetime


# ============================================================
# REFERENCE SCHEMAS
# ============================================================


class DepartmentRef(BaseModel):
    department_id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class DesignationRef(BaseModel):
    designation_id: UUID
    title: str
    model_config = ConfigDict(from_attributes=True)


class WorkLocationRef(BaseModel):
    location_id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class PayStructureRef(BaseModel):
    pay_structure_id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class EmployeeRef(BaseModel):
    employee_id: UUID
    first_name: str
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# EMPLOYEE SCHEMAS
# ============================================================

class EmployeeBase(BaseModel):
    organisation_id: Optional[UUID] = None
    employee_code: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    work_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[str] = None
    fathers_name: Optional[str] = None
    date_of_joining: Optional[date] = None
    date_of_leaving: Optional[date] = None
    status: Optional[str] = "active"
    department_id: Optional[UUID] = None
    designation_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    business_unit: Optional[str] = None
    manager_id: Optional[UUID] = None
    pay_structure_id: Optional[UUID] = None
    annual_ctc: Optional[float] = None
    pay_frequency: Optional[str] = "Monthly"
    uan_link_status: Optional[str] = "Unlinked"
    metadata: Optional[Dict] = Field(default=None, alias="extra_metadata")
    is_active: Optional[bool] = True


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    employee_code: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    work_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[str] = None
    fathers_name: Optional[str] = None
    date_of_joining: Optional[date] = None
    date_of_leaving: Optional[date] = None
    status: Optional[str] = None
    department_id: Optional[UUID] = None
    designation_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    business_unit: Optional[str] = None
    manager_id: Optional[UUID] = None
    pay_structure_id: Optional[UUID] = None
    annual_ctc: Optional[float] = None
    pay_frequency: Optional[str] = None
    uan_link_status: Optional[str] = None
    metadata: Optional[Dict] = None
    is_active: Optional[bool] = None


class EmployeeOut(EmployeeBase):
    employee_id: UUID
    created_at: datetime
    updated_at: datetime
    organisation_id: UUID   # ✅ visible in response only
    # Nested references
    department: Optional[DepartmentRef] = None
    designation: Optional[DesignationRef] = None
    location: Optional[WorkLocationRef] = None
    pay_structure: Optional[PayStructureRef] = None
    manager: Optional[EmployeeRef] = None

    model_config = ConfigDict(from_attributes=True,populate_by_name=True)


# ============================================================
# EMPLOYEE DOCUMENT SCHEMAS
# ============================================================

class EmployeeDocumentBase(BaseModel):
    employee_id: UUID
    organisation_id: UUID
    document_type: Optional[str] = None
    document_url: Optional[str] = None
    metadata: Optional[Dict] = None


class EmployeeDocumentCreate(EmployeeDocumentBase):
    uploaded_by: Optional[UUID] = None


class EmployeeDocumentOut(EmployeeDocumentBase):
    document_id: UUID
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# EMPLOYEE SALARY ASSIGNMENT SCHEMAS
# ============================================================

class EmployeeSalaryAssignmentBase(BaseModel):
    employee_id: UUID
    pay_structure_id: UUID
    effective_from: date
    effective_to: Optional[date] = None
    created_by: Optional[UUID] = None


class EmployeeSalaryAssignmentCreate(EmployeeSalaryAssignmentBase):
    pass


class EmployeeSalaryAssignmentOut(EmployeeSalaryAssignmentBase):
    assignment_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)