# payroll_system/api/user_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_async_db
from schemas.user_schemas import UserRead,ForgotPasswordRequest
from crud.user_crud import get_user_by_id, list_users
from utils.dependencies import get_current_user, get_admin_user

router = APIRouter()

@router.get("/", response_model=list[UserRead], tags=["Users"])
async def get_all_users(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    """Admin: Get list of all users"""
    return await list_users(db)

@router.get("/me", response_model=UserRead, tags=["Users"])
async def get_my_profile(current_user=Depends(get_current_user)):
    """Authenticated user profile"""
    return current_user

@router.get("/{user_id}", response_model=UserRead, tags=["Users"])
async def get_user_by_id_route(
    user_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
