from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from schemas.employee_schemas import EmployeeCreate, EmployeeOut
from crud.employee_crud import (
    create_employee,
    get_employee,
    list_employees,
)
from utils.dependencies import get_current_user

router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)

# ============================================================
# CREATE EMPLOYEE
# ============================================================
@router.post(
    "/",
    response_model=EmployeeOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Employees"],
)
async def create_new_employee(
    emp: EmployeeCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):
    # 🔒 Organisation MUST exist
    if not getattr(current_user, "organisation_id", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organisation not found. Please create organisation first.",
        )

    return await create_employee(
        db=db,
        emp=emp,
        organisation_id=current_user.organisation_id,
    )


# ============================================================
# LIST EMPLOYEES (ORG SCOPED)
# ============================================================
@router.get(
    "/",
    response_model=list[EmployeeOut],
    tags=["Employees"],
)


async def get_all_employees(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):
    # 🔒 Organisation MUST exist
    if not getattr(current_user, "organisation_id", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organisation not found. Please create organisation first.",
        )

    return await list_employees(
        db=db,
        organisation_id=current_user.organisation_id,
    )


# ============================================================
# GET EMPLOYEE BY ID (ORG SCOPED)
# ============================================================
@router.get(
    "/{emp_id}",
    response_model=EmployeeOut,
    tags=["Employees"],
)
async def get_employee_by_id(
    emp_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):
    emp = await get_employee(
        db=db,
        emp_id=emp_id,
        organisation_id=current_user.organisation_id,
    )

    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    return emp
