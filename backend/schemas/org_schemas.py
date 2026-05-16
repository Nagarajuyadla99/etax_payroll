# payroll_system/schemas/org_schemas.py

from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Optional
from uuid import UUID
from datetime import datetime


# ============================================================
# ORGANISATION
# ============================================================

class OrganisationCreate(BaseModel):
    name: str
    legal_name: Optional[str] = None
    registration_no: Optional[str] = None
    tax_id: Optional[str] = None
    pan: Optional[str] = None
    tds_circle: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    postal_code: Optional[str] = None
    timezone: Optional[str] = "Asia/Kolkata"
    is_active: Optional[bool] = True


class OrganisationUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    registration_no: Optional[str] = None
    tax_id: Optional[str] = None
    pan: Optional[str] = None
    tds_circle: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None


class HrSettingsPatch(BaseModel):
    """Partial update for organisations.hr_settings (deep-merged by section)."""

    payroll: Optional[dict[str, Any]] = Field(
        default=None,
        description="e.g. payable_days_mode=attendance_units, prorate_with_attendance=true",
    )
    attendance: Optional[dict[str, Any]] = Field(
        default=None,
        description="e.g. week_off_weekdays=[5,6] (Mon=0 … Sun=6)",
    )


class OrganisationHrSettingsOut(BaseModel):
    organisation_id: UUID
    hr_settings: dict[str, Any]
    payroll_settings: dict[str, Any] = Field(default_factory=dict)
    attendance_settings: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class OrganisationOut(BaseModel):
    organisation_id: UUID
    name: str
    legal_name: Optional[str] = None
    registration_no: Optional[str] = None
    tax_id: Optional[str] = None
    pan: Optional[str] = None
    tds_circle: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# DEPARTMENT
# ============================================================

class DepartmentCreate(BaseModel):
    organisation_id: UUID
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = True


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentOut(DepartmentCreate):
    department_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# DESIGNATION
# ============================================================

class DesignationCreate(BaseModel):
    organisation_id: UUID
    title: str
    level: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = True


class DesignationUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DesignationOut(DesignationCreate):
    designation_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# WORK LOCATION
# ============================================================

class WorkLocationCreate(BaseModel):
    organisation_id: UUID
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = True


class WorkLocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class WorkLocationOut(WorkLocationCreate):
    location_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)