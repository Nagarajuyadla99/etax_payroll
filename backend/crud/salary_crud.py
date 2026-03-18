# payroll_system/crud/salary_crud.py

from typing import Optional, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from models.salary_models import (
    SalaryComponent,
    SalaryTemplate,
    SalaryTemplateComponent,
    PayStructure,
    EmployeeSalaryStructure
)

from schemas.salary_schemas import (
    SalaryComponentCreate,
    SalaryComponentUpdate,
    SalaryTemplateCreate,
    SalaryTemplateUpdate,
    SalaryTemplateComponentCreate,
    SalaryTemplateComponentUpdate,
    PayStructureCreate,
    EmployeeSalaryStructureCreate
)

# ============================================================
# SALARY COMPONENTS
# ============================================================

async def create_salary_component(
    db: AsyncSession,
    payload: SalaryComponentCreate
) -> SalaryComponent:

    comp = SalaryComponent(**payload.model_dump())

    try:
        db.add(comp)
        await db.commit()
        await db.refresh(comp)
        return comp

    except IntegrityError as e:
        await db.rollback()
        raise ValueError(f"Component creation failed: {str(e)}")


async def get_salary_component(
    db: AsyncSession,
    component_id: UUID
) -> Optional[SalaryComponent]:

    q = await db.execute(
        select(SalaryComponent)
        .filter(SalaryComponent.component_id == component_id)
    )

    return q.scalar_one_or_none()


async def list_salary_components(
    db: AsyncSession
) -> List[SalaryComponent]:

    q = await db.execute(select(SalaryComponent))
    return q.scalars().all()


async def update_salary_component(
    db: AsyncSession,
    component_id: UUID,
    payload: SalaryComponentUpdate
) -> Optional[SalaryComponent]:

    comp = await get_salary_component(db, component_id)

    if not comp:
        return None

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(comp, k, v)

    try:
        await db.commit()
        await db.refresh(comp)
        return comp

    except Exception:
        await db.rollback()
        raise


# ============================================================
# SALARY TEMPLATES
# ============================================================

async def create_salary_template(
    db: AsyncSession,
    payload: SalaryTemplateCreate
) -> SalaryTemplate:

    tpl = SalaryTemplate(**payload.model_dump())

    try:
        db.add(tpl)
        await db.commit()
        await db.refresh(tpl)
        return tpl

    except IntegrityError as e:
        await db.rollback()
        raise ValueError("Salary template already exists for this organisation")


async def get_salary_template(
    db: AsyncSession,
    template_id: UUID
) -> Optional[SalaryTemplate]:

    q = await db.execute(
        select(SalaryTemplate)
        .filter(SalaryTemplate.template_id == template_id)
    )

    return q.scalar_one_or_none()


async def list_salary_templates(
    db: AsyncSession
) -> List[SalaryTemplate]:

    q = await db.execute(select(SalaryTemplate))
    return q.scalars().all()


# ============================================================
# TEMPLATE COMPONENTS
# ============================================================

async def add_component_to_template(
    db: AsyncSession,
    payload: SalaryTemplateComponentCreate
) -> SalaryTemplateComponent:

    q = await db.execute(
        select(SalaryTemplateComponent)
        .filter(
            SalaryTemplateComponent.template_id == payload.template_id,
            SalaryTemplateComponent.component_id == payload.component_id
        )
    )

    if q.scalar_one_or_none():
        raise ValueError("Component already exists in template")

    stc = SalaryTemplateComponent(**payload.model_dump())

    try:
        db.add(stc)
        await db.commit()
        await db.refresh(stc)
        return stc

    except IntegrityError as e:
        await db.rollback()
        raise ValueError(f"Failed to add component to template: {str(e)}")


async def get_template_components(
    db: AsyncSession,
    template_id: UUID
):

    q = await db.execute(
        select(SalaryTemplateComponent)
        .filter(SalaryTemplateComponent.template_id == template_id)
        .order_by(SalaryTemplateComponent.sequence)
    )

    return q.scalars().all()


async def update_template_component(
    db: AsyncSession,
    stc_id: UUID,
    payload: SalaryTemplateComponentUpdate
) -> Optional[SalaryTemplateComponent]:

    q = await db.execute(
        select(SalaryTemplateComponent)
        .filter(SalaryTemplateComponent.stc_id == stc_id)
    )

    stc = q.scalar_one_or_none()

    if not stc:
        return None

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(stc, k, v)

    try:
        await db.commit()
        await db.refresh(stc)
        return stc

    except Exception:
        await db.rollback()
        raise


# ============================================================
# PAY STRUCTURES
# ============================================================

async def create_pay_structure(
    db: AsyncSession,
    payload: PayStructureCreate
) -> PayStructure:

    ps = PayStructure(**payload.model_dump())

    try:
        db.add(ps)
        await db.commit()
        await db.refresh(ps)
        return ps

    except IntegrityError as e:
        await db.rollback()
        raise ValueError(f"PayStructure creation failed: {str(e)}")


async def get_pay_structure(
    db: AsyncSession,
    pay_structure_id: UUID
) -> Optional[PayStructure]:

    q = await db.execute(
        select(PayStructure)
        .filter(PayStructure.pay_structure_id == pay_structure_id)
    )

    return q.scalar_one_or_none()


# ============================================================
# EMPLOYEE SALARY STRUCTURE
# ============================================================

async def assign_salary_template(
    db: AsyncSession,
    payload: EmployeeSalaryStructureCreate
) -> EmployeeSalaryStructure:

    obj = EmployeeSalaryStructure(**payload.model_dump())

    try:
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj

    except IntegrityError:
        await db.rollback()
        raise ValueError("Employee already has a salary structure for this date")


async def get_employee_salary_structure(
    db: AsyncSession,
    employee_id: UUID
):

    q = await db.execute(
        select(EmployeeSalaryStructure)
        .filter(EmployeeSalaryStructure.employee_id == employee_id)
        .order_by(EmployeeSalaryStructure.effective_from.desc())
        .limit(1)
    )

    return q.scalar_one_or_none()


async def list_employee_salary_structures(
    db: AsyncSession
):

    q = await db.execute(select(EmployeeSalaryStructure))
    return q.scalars().all()