# payroll_system/crud/org_crud.py

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from models.org_models import Organisation, Department, Designation, WorkLocation
from schemas.org_schemas import (
    OrganisationCreate, OrganisationUpdate,
    DepartmentCreate, DepartmentUpdate,
    DesignationCreate, DesignationUpdate,
    WorkLocationCreate, WorkLocationUpdate,
)


# Organisations
async def create_organisation(db: AsyncSession, payload: OrganisationCreate) -> Organisation:
    org = Organisation(**payload.model_dump())
    try:
        db.add(org)
        await db.commit()
        await db.refresh(org)
        return org
    except IntegrityError as e:
        await db.rollback()
        raise ValueError("Organisation creation failed: integrity error") from e


async def get_organisation(db: AsyncSession, organisation_id: UUID) -> Optional[Organisation]:
    q = await db.execute(select(Organisation).filter(Organisation.organisation_id == organisation_id))
    return q.scalar_one_or_none()


async def update_organisation(db: AsyncSession, organisation_id: UUID, payload: OrganisationUpdate) -> Optional[Organisation]:
    org = await get_organisation(db, organisation_id)
    if not org:
        return None
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(org, k, v)
    try:
        await db.commit()
        await db.refresh(org)
        return org
    except Exception:
        await db.rollback()
        raise


# Departments
async def create_department(db: AsyncSession, payload: DepartmentCreate) -> Department:
    dept = Department(**payload.model_dump())
    try:
        db.add(dept)
        await db.commit()
        await db.refresh(dept)
        return dept
    except IntegrityError as e:
        await db.rollback()
        raise ValueError("Department creation failed: duplicate or integrity issue") from e


async def get_department(db: AsyncSession, department_id: UUID) -> Optional[Department]:
    q = await db.execute(select(Department).filter(Department.department_id == department_id))
    return q.scalar_one_or_none()


async def list_departments(db: AsyncSession, organisation_id: UUID) -> List[Department]:
    q = await db.execute(select(Department).filter(Department.organisation_id == organisation_id))
    return q.scalars().all()


async def update_department(db: AsyncSession, department_id: UUID, payload: DepartmentUpdate) -> Optional[Department]:
    dept = await get_department(db, department_id)
    if not dept:
        return None
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(dept, k, v)
    try:
        await db.commit()
        await db.refresh(dept)
        return dept
    except Exception:
        await db.rollback()
        raise


# Designations
async def create_designation(db: AsyncSession, payload: DesignationCreate) -> Designation:
    des = Designation(**payload.model_dump())
    try:
        db.add(des)
        await db.commit()
        await db.refresh(des)
        return des
    except IntegrityError as e:
        await db.rollback()
        raise ValueError("Designation create failed") from e


async def get_designation(db: AsyncSession, designation_id: UUID) -> Optional[Designation]:
    q = await db.execute(select(Designation).filter(Designation.designation_id == designation_id))
    return q.scalar_one_or_none()


async def update_designation(db: AsyncSession, designation_id: UUID, payload: DesignationUpdate) -> Optional[Designation]:
    des = await get_designation(db, designation_id)
    if not des:
        return None
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(des, k, v)
    try:
        await db.commit()
        await db.refresh(des)
        return des
    except Exception:
        await db.rollback()
        raise


# Work Locations
async def create_work_location(db: AsyncSession, payload: WorkLocationCreate) -> WorkLocation:
    loc = WorkLocation(**payload.model_dump())
    try:
        db.add(loc)
        await db.commit()
        await db.refresh(loc)
        return loc
    except IntegrityError as e:
        await db.rollback()
        raise ValueError("Work location creation failed") from e


async def get_work_location(db: AsyncSession, location_id: UUID) -> Optional[WorkLocation]:
    q = await db.execute(select(WorkLocation).filter(WorkLocation.location_id == location_id))
    return q.scalar_one_or_none()


async def update_work_location(db: AsyncSession, location_id: UUID, payload: WorkLocationUpdate) -> Optional[WorkLocation]:
    loc = await get_work_location(db, location_id)
    if not loc:
        return None
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(loc, k, v)
    try:
        await db.commit()
        await db.refresh(loc)
        return loc
    except Exception:
        await db.rollback()
        raise