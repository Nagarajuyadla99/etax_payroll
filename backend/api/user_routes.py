# payroll_system/api/user_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID

from database import get_async_db
from schemas.user_schemas import UserRead
from crud.user_crud import get_user_by_id, list_users
from utils.dependencies import get_current_user, get_admin_user


# ✅ Keep prefix → avoids conflicts with /api/me, /api/setup, etc.
router = APIRouter(prefix="/users", tags=["Users"])


# ✅ 1. STATIC ROUTES FIRST

@router.get("/", response_model=list[UserRead])
async def get_all_users(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    """Admin: Get list of all users"""
    try:
        return await list_users(db)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me", response_model=UserRead)
async def get_my_profile(current_user=Depends(get_current_user)):
    """Authenticated user profile"""
    return current_user


# ✅ 2. DYNAMIC ROUTE LAST (CRITICAL)

@router.get("/{user_id}", response_model=UserRead)
async def get_user_by_id_route(
    user_id: UUID,   # ✅ FIX: enforce UUID (prevents 'employees' crash)
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    try:
        user = await get_user_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return user

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))