from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_async_db
from models.org_models import Organisation, Department, Designation, WorkLocation
from models.employee_model import Employee  
from models.user_models import User
from schemas.onboarding_schemas import SetupSchema
from utils.dependencies import get_current_user

router = APIRouter(prefix="/setup", tags=["Setup"])


@router.post("/")
async def setup_org(
    payload: SetupSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    # 🔥 FIX START HERE
    result = await db.execute(
        select(Organisation).where(
            Organisation.organisation_id == current_user.organisation_id
        )
    )
    org = result.scalar_one_or_none()
    # 🔥 FIX END

    if not org:
        raise HTTPException(400, "User has no organisation")

    if not org:
        raise HTTPException(400, "User has no organisation")

    if org.is_setup_complete:
        raise HTTPException(400, "Already setup completed")

   
    db.add_all([
        Department(name=d.strip(), organisation_id=org.organisation_id)
        for d in payload.departments if d.strip()
    ])

    
    db.add_all([
        Designation(title=d.strip(), organisation_id=org.organisation_id)
        for d in payload.designations if d.strip()
    ])

    
    db.add_all([
        WorkLocation(name=l.strip(), organisation_id=org.organisation_id)
        for l in payload.locations if l.strip()
    ])

    
    if payload.manager:
        manager = Employee(
            first_name=payload.manager.name,
            work_email=payload.manager.email,
            organisation_id=org.organisation_id
        )
        db.add(manager)

   
    org.is_setup_complete = True

    await db.commit()

    return {"message": "Organisation setup completed successfully"}

@router.get("/departments")
async def get_departments(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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