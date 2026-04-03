from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models.employee_model import Employee
from database import get_async_db
from schemas.employee_schemas import EmployeeCreate, EmployeeOut,EmployeeUpdate
from crud.employee_crud import (
    create_employee,
    get_employee,
    list_employees,
    bulk_create_employees
)
from utils.dependencies import get_current_user
from crud.org_crud import get_organisation
from services.employee_service import bulk_create_employees



router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)

# ============================================================
# COMMON DEPENDENCY: REQUIRE ORG + SETUP
# ============================================================
async def require_org_setup(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):
    organisation_id = getattr(current_user, "organisation_id", None)

    if not organisation_id:
        raise HTTPException(
            status_code=400,
            detail="Organisation not found"
        )

    org = await get_organisation(db, organisation_id)

    if not org:
        raise HTTPException(
            status_code=404,
            detail="Organisation not found"
        )

    if not org.is_setup_complete:
        raise HTTPException(
            status_code=400,
            detail="Complete organisation setup first"
        )

    return current_user


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
            status_code=404,
            detail="Employee not found",
        )

    return emp


# ============================================================
# BULK EMPLOYEE UPLOAD (CSV/XLSX)
# ============================================================
@router.post("/bulk-upload")
async def bulk_upload_employees(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_org_setup),
):
    # ✅ Validate filename
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name missing"
        )

    filename = file.filename.lower()

    # ✅ Validate file type
    if filename.endswith(".csv"):
        file_type = "csv"
    elif filename.endswith(".xlsx"):
        file_type = "xlsx"
    else:
        raise HTTPException(
            status_code=400,
            detail="Only CSV or XLSX files are supported"
        )

    # ✅ Read file safely
    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    return await bulk_create_employees(
        db=db,
        file_content=content,
        file_type=file_type,
        organisation_id=current_user.organisation_id,
    )


# ============================================================
# DELETE EMPLOYEE (ORG SCOPED)
# ============================================================
@router.delete(
    "/{emp_id}",
    status_code=status.HTTP_200_OK,
)
async def delete_employee_by_id(
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
            status_code=404,
            detail="Employee not found"
        )

    await db.delete(emp)
    await db.commit()

    return {"message": "Employee deleted successfully"}


   

@router.put("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: UUID,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    # STEP 1: Get employee (simple fetch for update)
    employee = await db.get(Employee, employee_id)

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # STEP 2: Update fields
    for key, value in data.dict(exclude_unset=True).items():
        setattr(employee, key, value)

    # STEP 3: Commit changes
    await db.commit()

    # ❗ IMPORTANT: DO NOT RETURN HERE

    # STEP 4: Re-fetch with relationships (THIS IS YOUR NEW CODE)
    result = await db.execute(
        select(Employee)
        .options(
            selectinload(Employee.manager),
            selectinload(Employee.department),
            selectinload(Employee.designation),
            selectinload(Employee.location),
            selectinload(Employee.pay_structure),
        )
        .where(Employee.employee_id == employee_id)
    )

    employee = result.scalar_one_or_none()

    # STEP 5: Return fully-loaded object
    return employee