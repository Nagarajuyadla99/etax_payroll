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
    PayStructure
)
from schemas.salary_schemas import (
    SalaryComponentCreate, SalaryComponentUpdate,
    SalaryTemplateCreate, SalaryTemplateUpdate,
    SalaryTemplateComponentCreate,
    PayStructureCreate, PayStructureUpdate
)

# ============================================================
# SALARY COMPONENTS
# ============================================================

async def create_salary_component(db: AsyncSession, payload: SalaryComponentCreate) -> SalaryComponent:
    """Create a new salary component."""
    comp = SalaryComponent(**payload.model_dump())
    try:
        db.add(comp)
        await db.commit()
        await db.refresh(comp)
        return comp
    except IntegrityError:
        await db.rollback()
        raise ValueError("Component creation failed (maybe duplicate)")

async def get_salary_component(db: AsyncSession, component_id: UUID) -> Optional[SalaryComponent]:
    """Retrieve a salary component by its ID."""
    q = await db.execute(select(SalaryComponent).filter(SalaryComponent.component_id == component_id))
    return q.scalar_one_or_none()

async def list_salary_components(db: AsyncSession) -> List[SalaryComponent]:
    """List all salary components."""
    q = await db.execute(select(SalaryComponent))
    return q.scalars().all()

async def update_salary_component(db: AsyncSession, component_id: UUID, payload: SalaryComponentUpdate) -> Optional[SalaryComponent]:
    """Update an existing salary component."""
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

async def create_salary_template(db: AsyncSession, payload: SalaryTemplateCreate) -> SalaryTemplate:
    """Create a new salary template."""
    tpl = SalaryTemplate(**payload.model_dump())
    try:
        db.add(tpl)
        await db.commit()
        await db.refresh(tpl)
        return tpl
    except IntegrityError:
        await db.rollback()
        raise ValueError("Salary template create failed")

async def get_salary_template(db: AsyncSession, template_id: UUID) -> Optional[SalaryTemplate]:
    """Retrieve a salary template by ID."""
    q = await db.execute(select(SalaryTemplate).filter(SalaryTemplate.template_id == template_id))
    return q.scalar_one_or_none()

async def list_salary_templates(db: AsyncSession) -> List[SalaryTemplate]:
    """List all salary templates."""
    q = await db.execute(select(SalaryTemplate))
    return q.scalars().all()

async def add_component_to_template(db: AsyncSession, payload: SalaryTemplateComponentCreate) -> SalaryTemplateComponent:
    """Add a salary component to a template."""
    q = await db.execute(select(SalaryTemplateComponent).filter(
        SalaryTemplateComponent.template_id == payload.template_id,
        SalaryTemplateComponent.component_id == payload.component_id
    ))
    if q.scalar_one_or_none():
        raise ValueError("Component already exists in template")

    stc = SalaryTemplateComponent(**payload.model_dump())
    try:
        db.add(stc)
        await db.commit()
        await db.refresh(stc)
        return stc
    except IntegrityError:
        await db.rollback()
        raise ValueError("Failed to add component to template")

# ============================================================
# PAY STRUCTURES
# ============================================================

async def create_pay_structure(db: AsyncSession, payload: PayStructureCreate) -> PayStructure:
    """Create a new pay structure."""
    ps = PayStructure(**payload.model_dump())
    try:
        db.add(ps)
        await db.commit()
        await db.refresh(ps)
        return ps
    except IntegrityError:
        await db.rollback()
        raise ValueError("PayStructure create failed")

async def get_pay_structure(db: AsyncSession, pay_structure_id: UUID) -> Optional[PayStructure]:
    """Retrieve a pay structure by ID."""
    q = await db.execute(select(PayStructure).filter(PayStructure.pay_structure_id == pay_structure_id))
    return q.scalar_one_or_none()