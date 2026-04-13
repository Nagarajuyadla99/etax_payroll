# payroll_system/utils/dependencies.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.user_crud import get_user_by_username
from database import get_async_db
from models.employee_model import Employee
from utils.auth import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


@dataclass(frozen=True)
class AuthSubject:
    """JWT payload + loaded principal (User or Employee)."""

    principal: Any
    payload: dict[str, Any]


def resolve_organisation_id(principal: Any, payload: dict[str, Any] | None) -> UUID | None:
    """Resolve org id from ORM first, then JWT (legacy tokens)."""
    raw = getattr(principal, "organisation_id", None)
    if raw is not None:
        if isinstance(raw, UUID):
            return raw
        try:
            return UUID(str(raw))
        except (ValueError, TypeError):
            pass

    if payload:
        token_org = payload.get("organisation_id")
        if token_org:
            try:
                return UUID(str(token_org))
            except (ValueError, TypeError):
                pass
    return None


async def _load_principal(db: AsyncSession, payload: dict[str, Any]):
    sub: str | None = payload.get("sub")
    token_type: str | None = payload.get("type")

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    if token_type == "employee":
        try:
            employee_id = UUID(str(sub))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        result = await db.execute(
            select(Employee).where(Employee.employee_id == employee_id)
        )
        employee = result.scalar_one_or_none()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        return employee

    user = await get_user_by_username(db, sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def get_current_auth(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_db),
) -> AuthSubject:
    payload = decode_token(token)
    principal = await _load_principal(db, payload)
    return AuthSubject(principal=principal, payload=payload)


async def get_current_user(auth: AuthSubject = Depends(get_current_auth)):
    return auth.principal


async def get_admin_user(
    current_user=Depends(get_current_user),
):
    if not getattr(current_user, "is_system_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return current_user
