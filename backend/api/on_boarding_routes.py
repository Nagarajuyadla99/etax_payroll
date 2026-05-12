from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_async_db
from models.org_models import Organisation, Department, Designation, WorkLocation
from models.employee_model import Employee  
from models.user_models import User
from schemas.onboarding_schemas import SetupSchema
from utils.dependencies import get_current_user
from utils.rbac import require_roles

router = APIRouter(prefix="/setup", tags=["Setup"])


@router.post("/")
async def setup_org(
    payload: SetupSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """
    Phase 1 foundation: transactional organisation initialization.
    Note: tenant/org + admin user are created during /auth/register (Phase 1 Option B).
    This endpoint seeds tenant master data and marks setup complete.
    """
    org_id = getattr(current_user, "organisation_id", None)
    if not org_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    # Transactional: all-or-nothing
    async with db.begin():
        result = await db.execute(
            select(Organisation).where(Organisation.organisation_id == org_id)
        )
        org = result.scalar_one_or_none()

        if not org:
            raise HTTPException(status_code=400, detail="User has no organisation")

        if org.is_setup_complete:
            raise HTTPException(status_code=400, detail="Already setup completed")

        departments = [d.strip() for d in (payload.departments or []) if d and d.strip()]
        designations = [d.strip() for d in (payload.designations or []) if d and d.strip()]
        locations = [l.strip() for l in (payload.locations or []) if l and l.strip()]

        if not departments or not designations or not locations:
            raise HTTPException(
                status_code=400,
                detail="Departments, designations and locations are required",
            )

        db.add_all([Department(name=name, organisation_id=org.organisation_id) for name in departments])
        db.add_all([Designation(title=title, organisation_id=org.organisation_id) for title in designations])
        db.add_all([WorkLocation(name=name, organisation_id=org.organisation_id) for name in locations])

        if payload.manager:
            manager_name = (payload.manager.name or "").strip()
            manager_email = (payload.manager.email or "").strip()
            if not manager_name or not manager_email:
                raise HTTPException(status_code=400, detail="Manager name and email are required")
            manager = Employee(
                first_name=manager_name,
                work_email=manager_email,
                organisation_id=org.organisation_id,
            )
            db.add(manager)

        org.is_setup_complete = True

    return {"message": "Organisation setup completed successfully"}

@router.get("/departments")
async def get_departments(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(["admin", "hr"]))
):
    org_id = current_user.organisation_id

    result = await db.execute(
        select(Department).where(Department.organisation_id == org_id)
    )

    departments = result.scalars().all()

    return [
        {
            "id": str(d.department_id),
            "name": d.name
        }
        for d in departments
    ]

@router.get("/designations")
async def get_designations(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(["admin", "hr"]))
):
    org_id = current_user.organisation_id

    result = await db.execute(
        select(Designation).where(Designation.organisation_id == org_id)
    )

    designations = result.scalars().all()

    return [
        {
            "id": str(d.designation_id),
            "name": d.title
        }
        for d in designations
    ]

@router.get("/locations")
async def get_locations(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(["admin", "hr"]))
):
    org_id = current_user.organisation_id

    result = await db.execute(
        select(WorkLocation).where(WorkLocation.organisation_id == org_id)
    )

    locations = result.scalars().all()

    return [
        {
            "id": str(l.location_id),
            "name": l.name
        }
        for l in locations
    ]