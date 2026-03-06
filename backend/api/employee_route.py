from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from schemas.employee_schemas import EmployeeCreate, EmployeeOut
from crud.employee_crud import create_employee, get_employee, list_employees
from utils.dependencies import get_current_user
from fastapi import UploadFile, File
from crud.employee_crud import bulk_create_employees
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
)
async def create_new_employee(
    emp: EmployeeCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):
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
)
async def get_all_employees(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):
    if not getattr(current_user, "organisation_id", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organisation not found. Please create organisation first.",
        )

    # This now returns employees with nested references (department, designation, etc.)
    employees = await list_employees(
        db=db,
        organisation_id=current_user.organisation_id,
    )
    return employees


# ============================================================
# GET EMPLOYEE BY ID (ORG SCOPED)
# ============================================================
@router.get(
    "/{emp_id}",
    response_model=EmployeeOut,
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

# ============================================================
# BULK EMPLOYEE UPLOAD (CSV)
# ============================================================
@router.post("/bulk-upload")
async def bulk_upload_employees(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):

    if not getattr(current_user, "organisation_id", None):
        raise HTTPException(
            status_code=400,
            detail="Organisation not found"
        )

    content = await file.read()

    filename = file.filename.lower()

    if filename.endswith(".csv"):
        file_type = "csv"
    elif filename.endswith(".xlsx"):
        file_type = "xlsx"
    else:
        raise HTTPException(
            status_code=400,
            detail="Only CSV or XLSX files are supported"
        )

    result = await bulk_create_employees(
        db=db,
        file_content=content,
        file_type=file_type,
        organisation_id=current_user.organisation_id,
    )

    return result