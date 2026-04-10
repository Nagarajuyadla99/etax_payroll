# payroll_system/utils/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from database import get_async_db
from utils.auth import decode_token
from crud.user_crud import get_user_by_username
from models.employee_model import Employee

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ============================================================
# GET CURRENT USER
# ============================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_db),
):
    payload = decode_token(token)

    sub: str | None = payload.get("sub")
    token_type: str | None = payload.get("type")

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    # Employee tokens: { sub: employee_id(UUID-as-string), type: "employee" }
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

    # Default/admin tokens: { sub: username }
    user = await get_user_by_username(db, sub)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


# ============================================================
# ADMIN CHECK
# ============================================================

async def get_admin_user(
    current_user=Depends(get_current_user),
):
    # ✅ SIMPLE + SAFE
    if not current_user.is_system_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return current_user