# payroll_system/api/user_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID

from crud.org_crud import get_organisation
from database import get_async_db
from models.employee_model import Employee
from models.user_models import User
from schemas.user_schemas import UserRead
from schemas.me_schemas import MeResponse, OrganisationMeSummary, EmployeeMeSummary
from crud.user_crud import get_user_by_id, list_users
from utils.dependencies import AuthSubject, get_current_auth, get_admin_user, resolve_organisation_id
from utils.rbac import get_principal_role


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


@router.get("/me", response_model=MeResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
):
    """
    Current principal with organisation summary.
    Works for admin/HR (User) and Employee tokens.
    """
    principal = auth.principal
    payload = auth.payload
    role = get_principal_role(principal)
    org_id = resolve_organisation_id(principal, payload)

    organisation: OrganisationMeSummary | None = None
    if org_id:
        org = await get_organisation(db, org_id)
        if org:
            organisation = OrganisationMeSummary(
                id=org.organisation_id,
                name=org.name,
                is_setup_complete=bool(org.is_setup_complete),
            )

    if isinstance(principal, Employee):
        return MeResponse(
            principal_type="employee",
            role=role,
            organisation=organisation,
            employee=EmployeeMeSummary.model_validate(principal),
            user=None,
        )

    if isinstance(principal, User):
        return MeResponse(
            principal_type="user",
            role=role,
            organisation=organisation,
            user=UserRead.model_validate(principal),
            employee=None,
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unsupported principal type",
    )


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