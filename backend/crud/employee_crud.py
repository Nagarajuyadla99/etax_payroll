# payroll_system/crud/employee_crud.py

from typing import Optional, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from models.employee_model import (
    Employee,
    EmployeeDocument,
    EmployeeSalaryAssignment,
)
from models.org_models import Organisation  # ✅ IMPORTANT

from schemas.employee_schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeDocumentCreate,
    EmployeeSalaryAssignmentCreate,
)

# ============================================================
# INTERNAL HELPERS
# ============================================================

async def _ensure_organisation_exists(
    db: AsyncSession,
    organisation_id: UUID,
):
    """
    Ensure organisation exists before any employee operation.
    """
    result = await db.execute(
        select(Organisation).where(
            Organisation.organisation_id == organisation_id
        )
    )
    org = result.scalar_one_or_none()

    if not org:
        raise ValueError(
            "Organisation not created. Please create organisation first."
        )


# ============================================================
# EMPLOYEE CRUD
# ============================================================

async def create_employee(
    db: AsyncSession,
    emp: EmployeeCreate,
    organisation_id: UUID,
) -> Employee:
    """
    Create a new employee under a specific organisation.
    Organisation is enforced server-side.
    """
    await _ensure_organisation_exists(db, organisation_id)

    emp_data = emp.model_dump(exclude_unset=True)
    emp_data["organisation_id"] = organisation_id

    employee = Employee(**emp_data)

    try:
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        return employee
    except IntegrityError as e:
        await db.rollback()
        raise ValueError(
            "Employee creation failed (duplicate email or employee code)"
        ) from e


async def get_employee(
    db: AsyncSession,
    emp_id: UUID,
    organisation_id: UUID,
) -> Optional[Employee]:
    """
    Fetch a single employee by ID within organisation scope.
    """
    await _ensure_organisation_exists(db, organisation_id)

    result = await db.execute(
        select(Employee).where(
            Employee.employee_id == emp_id,
            Employee.organisation_id == organisation_id,
        )
    )
    return result.scalar_one_or_none()


async def list_employees(
    db: AsyncSession,
    organisation_id: UUID,
    department_id: Optional[UUID] = None,
    designation_id: Optional[UUID] = None,
    active_only: bool = True,
) -> List[Employee]:
    """
    List employees for an organisation with optional filters.
    """
    await _ensure_organisation_exists(db, organisation_id)

    query = select(Employee).where(
        Employee.organisation_id == organisation_id
    )

    if department_id:
        query = query.where(Employee.department_id == department_id)

    if designation_id:
        query = query.where(Employee.designation_id == designation_id)

    if active_only:
        query = query.where(Employee.is_active.is_(True))

    result = await db.execute(query)
    return result.scalars().all()


async def update_employee(
    db: AsyncSession,
    emp_id: UUID,
    payload: EmployeeUpdate,
    organisation_id: UUID,
) -> Optional[Employee]:
    """
    Update an employee within organisation scope.
    """
    await _ensure_organisation_exists(db, organisation_id)

    employee = await get_employee(db, emp_id, organisation_id)
    if not employee:
        return None

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(employee, key, value)

    try:
        await db.commit()
        await db.refresh(employee)
        return employee
    except IntegrityError as e:
        await db.rollback()
        raise ValueError(
            "Employee update failed due to integrity error"
        ) from e


# ============================================================
# EMPLOYEE DOCUMENTS
# ============================================================

async def upload_employee_document(
    db: AsyncSession,
    payload: EmployeeDocumentCreate,
) -> EmployeeDocument:
    """
    Upload a document for an employee.
    """
    document = EmployeeDocument(**payload.model_dump())

    try:
        db.add(document)
        await db.commit()
        await db.refresh(document)
        return document
    except Exception as e:
        await db.rollback()
        raise ValueError("Employee document upload failed") from e


# ============================================================
# EMPLOYEE SALARY ASSIGNMENTS
# ============================================================

async def assign_salary_structure(
    db: AsyncSession,
    payload: EmployeeSalaryAssignmentCreate,
) -> EmployeeSalaryAssignment:
    """
    Assign a salary structure to an employee.
    Prevent duplicate effective_from entries.
    """
    existing = await db.execute(
        select(EmployeeSalaryAssignment).where(
            EmployeeSalaryAssignment.employee_id == payload.employee_id,
            EmployeeSalaryAssignment.effective_from == payload.effective_from,
        )
    )

    if existing.scalar_one_or_none():
        raise ValueError(
            "Salary assignment with the same effective date already exists"
        )

    assignment = EmployeeSalaryAssignment(**payload.model_dump())

    try:
        db.add(assignment)
        await db.commit()
        await db.refresh(assignment)
        return assignment
    except IntegrityError as e:
        await db.rollback()
        raise ValueError("Failed to assign salary structure") from e