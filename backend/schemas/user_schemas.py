# payroll_system/schemas/user_schemas.py

from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


# ============================================================
# ROLE SCHEMAS
# ============================================================

class RoleBase(BaseModel):
    organisation_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    builtin: Optional[bool] = False


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    builtin: Optional[bool] = None


class RoleOut(RoleBase):
    role_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# USER SCHEMAS
# ============================================================

class UserBase(BaseModel):
    organisation_id: Optional[UUID] = None
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_system_admin: Optional[bool] = False
    status: Optional[str] = "active"  # user_status_t: active | inactive | suspended


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None
    is_system_admin: Optional[bool] = None


class UserRead(UserBase):
    user_id: UUID
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# USER ROLE SCHEMAS
# ============================================================

class UserRoleBase(BaseModel):
    user_id: UUID
    role_id: UUID
    assigned_by: Optional[UUID] = None


class UserRoleCreate(UserRoleBase):
    pass


class UserRoleOut(UserRoleBase):
    user_role_id: UUID
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)
