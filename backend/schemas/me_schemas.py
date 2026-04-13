# Unified /users/me and organisation summary payloads

from __future__ import annotations

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from schemas.user_schemas import UserRead


class OrganisationMeSummary(BaseModel):
    """Subset used by navbar and session bootstrap."""

    id: UUID
    name: str
    is_setup_complete: bool

    model_config = ConfigDict(from_attributes=True)


class EmployeeMeSummary(BaseModel):
    employee_id: UUID
    organisation_id: UUID
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "employee"

    model_config = ConfigDict(from_attributes=True)


class MeResponse(BaseModel):
    principal_type: Literal["user", "employee"]
    role: str
    organisation: OrganisationMeSummary | None
    user: UserRead | None = None
    employee: EmployeeMeSummary | None = None
