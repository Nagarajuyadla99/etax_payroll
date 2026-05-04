# payroll_system/crud/salary_crud.py

from typing import Optional, List
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
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
# COMMON HELPER
# ============================================================

def clean_payload(payload):
    data = payload.model_dump()
    data.pop("organisation_id", None)
    return data


# ============================================================
# SALARY COMPONENTS
# ============================================================

async def create_salary_component(
    db: AsyncSession,
    payload: SalaryComponentCreate,
    current_user
) -> SalaryComponent:

    data = clean_payload(payload)

    comp = SalaryComponent(
        **data,
        organisation_id=current_user.organisation_id
    )

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
    component_id: UUID,
    current_user
) -> Optional[SalaryComponent]:

    q = await db.execute(
        select(SalaryComponent).where(
            SalaryComponent.component_id == component_id,
            SalaryComponent.organisation_id == current_user.organisation_id
        )
    )

    return q.scalar_one_or_none()


async def find_salary_component_by_name(
    db: AsyncSession,
    organisation_id: UUID,
    name: str,
    *,
    component_type: Optional[str] = "deduction",
) -> Optional[SalaryComponent]:
    """Org-scoped lookup (case-insensitive name). Used for auto LOP payroll lines."""
    name_l = (name or "").strip().lower()
    if not name_l:
        return None
    conds = [
        SalaryComponent.organisation_id == organisation_id,
        SalaryComponent.is_active.is_(True),
        func.lower(SalaryComponent.name) == name_l,
    ]
    if component_type:
        conds.append(SalaryComponent.component_type == component_type)
    q = await db.execute(select(SalaryComponent).where(*conds).limit(1))
    return q.scalar_one_or_none()


async def list_salary_components(
    db: AsyncSession,
    current_user
) -> List[SalaryComponent]:

    q = await db.execute(
        select(SalaryComponent).where(
            SalaryComponent.organisation_id == current_user.organisation_id
        )
    )
    return q.scalars().all()


async def update_salary_component(
    db: AsyncSession,
    component_id: UUID,
    payload: SalaryComponentUpdate,
    current_user
) -> Optional[SalaryComponent]:

    comp = await get_salary_component(db, component_id, current_user)

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
    payload: SalaryTemplateCreate,
    current_user
) -> SalaryTemplate:

    data = clean_payload(payload)

    tpl = SalaryTemplate(
        **data,
        organisation_id=current_user.organisation_id
    )

    try:
        db.add(tpl)
        await db.commit()
        await db.refresh(tpl)
        return tpl

    except IntegrityError:
        await db.rollback()
        raise ValueError("Salary template already exists for this organisation")


async def get_salary_template(
    db: AsyncSession,
    template_id: UUID,
    current_user
) -> Optional[SalaryTemplate]:

    q = await db.execute(
        select(SalaryTemplate).where(
            SalaryTemplate.template_id == template_id,
            SalaryTemplate.organisation_id == current_user.organisation_id
        )
    )

    return q.scalar_one_or_none()


async def list_salary_templates(
    db: AsyncSession,
    current_user
) -> List[SalaryTemplate]:

    q = await db.execute(
        select(SalaryTemplate).where(
            SalaryTemplate.organisation_id == current_user.organisation_id
        )
    )
    return q.scalars().all()


# ============================================================
# TEMPLATE COMPONENTS
# ============================================================

async def add_component_to_template(
    db: AsyncSession,
    payload: SalaryTemplateComponentCreate,
    current_user
) -> SalaryTemplateComponent:

    template = await get_salary_template(db, payload.template_id, current_user)
    component = await get_salary_component(db, payload.component_id, current_user)

    if not template or not component:
        raise ValueError("Invalid template/component")

    q = await db.execute(
        select(SalaryTemplateComponent).where(
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
    template_id: UUID,
    current_user
):

    q = await db.execute(
        select(SalaryTemplateComponent)
        .join(SalaryTemplate)
        .where(
            SalaryTemplateComponent.template_id == template_id,
            SalaryTemplate.organisation_id == current_user.organisation_id
        )
        .order_by(SalaryTemplateComponent.sequence)
    )

    return q.scalars().all()


async def update_template_component(
    db: AsyncSession,
    stc_id: UUID,
    payload: SalaryTemplateComponentUpdate,
    current_user
) -> Optional[SalaryTemplateComponent]:

    q = await db.execute(
        select(SalaryTemplateComponent).where(
            SalaryTemplateComponent.stc_id == stc_id
        )
    )

    stc = q.scalar_one_or_none()

    if not stc:
        return None

    template = await get_salary_template(db, stc.template_id, current_user)

    if not template:
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
    payload: PayStructureCreate,
    current_user
) -> PayStructure:

    template = await get_salary_template(db, payload.template_id, current_user)

    if not template:
        raise ValueError("Invalid template")

    data = clean_payload(payload)

    ps = PayStructure(
        **data,
        organisation_id=current_user.organisation_id
    )

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
    pay_structure_id: UUID,
    current_user
) -> Optional[PayStructure]:

    q = await db.execute(
        select(PayStructure).where(
            PayStructure.pay_structure_id == pay_structure_id,
            PayStructure.organisation_id == current_user.organisation_id
        )
    )

    return q.scalar_one_or_none()


# ============================================================
# EMPLOYEE SALARY STRUCTURE
# ============================================================

async def assign_salary_template(
    db: AsyncSession,
    payload: EmployeeSalaryStructureCreate,
    current_user
) -> EmployeeSalaryStructure:

    template = await get_salary_template(db, payload.template_id, current_user)

    if not template:
        raise ValueError("Invalid template")

    data = clean_payload(payload)

    obj = EmployeeSalaryStructure(
        **data,
        organisation_id=current_user.organisation_id
    )

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
    employee_id: UUID,
    current_user
):

    q = await db.execute(
        select(EmployeeSalaryStructure)
        .where(
            EmployeeSalaryStructure.employee_id == employee_id,
            EmployeeSalaryStructure.organisation_id == current_user.organisation_id
        )
        .order_by(EmployeeSalaryStructure.effective_from.desc())
        .limit(1)
    )

    return q.scalar_one_or_none()


async def list_employee_salary_structures(
    db: AsyncSession,
    current_user
):

    q = await db.execute(
        select(EmployeeSalaryStructure).where(
            EmployeeSalaryStructure.organisation_id == current_user.organisation_id
        )
    )

    records = q.scalars().all()

    for r in records:
        if r.ctc is not None:
            try:
                r.ctc = float(r.ctc)
            except Exception:
                r.ctc = 0.0

    return records