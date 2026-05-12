"""Phase 2 salary configuration CRUD and preview bundle helpers."""

from __future__ import annotations

from datetime import date
from typing import Any, Optional
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.employee_model import Employee
from models.salary_models import (
    EmployeeSalaryStructure,
    OrgStatutoryConfig,
    SalaryComponent,
    SalaryComponentGroup,
    SalaryComponentGroupItem,
    SalaryDerivedVariable,
    SalaryTemplate,
    SalaryTemplateComponent,
    SalaryTemplateGroup,
)
from schemas.salary_phase2_schemas import (
    OrgStatutoryConfigCreate,
    SalaryComponentGroupCreate,
    SalaryComponentGroupItemCreate,
    SalaryComponentGroupUpdate,
    SalaryComponentV2Create,
    SalaryComponentV2Update,
    SalaryDerivedVariableCreate,
    SalaryDerivedVariableUpdate,
    SalaryTemplateGroupLinkCreate,
)


def _org_id(current_user) -> UUID | None:
    return getattr(current_user, "organisation_id", None) or getattr(current_user, "org_id", None)


def _require_org_id(current_user) -> UUID:
    org_id = _org_id(current_user)
    if org_id is None:
        raise ValueError("Organisation context is required")
    return org_id


def _component_payload(data: dict[str, Any]) -> dict[str, Any]:
    payload = dict(data)
    payload.pop("organisation_id", None)
    category = payload.get("component_category")
    calc_type = payload.get("calculation_type")
    if category and not payload.get("component_type"):
        payload["component_type"] = category
    if calc_type and not payload.get("calc_type"):
        payload["calc_type"] = calc_type
    return payload


async def create_salary_component_v2(
    db: AsyncSession,
    payload: SalaryComponentV2Create,
    current_user,
) -> SalaryComponent:
    data = _component_payload(payload.model_dump())
    comp = SalaryComponent(**data, organisation_id=_require_org_id(current_user))
    try:
        db.add(comp)
        await db.commit()
        await db.refresh(comp)
        return comp
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Component creation failed: {exc}") from exc


async def get_salary_component_v2(
    db: AsyncSession,
    component_id: UUID,
    current_user,
) -> Optional[SalaryComponent]:
    res = await db.execute(
        select(SalaryComponent).where(
            SalaryComponent.component_id == component_id,
            SalaryComponent.organisation_id == _require_org_id(current_user),
        )
    )
    return res.scalar_one_or_none()


async def list_salary_components_v2(
    db: AsyncSession,
    current_user,
    *,
    active: Optional[bool] = None,
    category: Optional[str] = None,
) -> list[SalaryComponent]:
    conds = [SalaryComponent.organisation_id == _require_org_id(current_user)]
    if active is not None:
        conds.append(SalaryComponent.is_active.is_(active))
    if category:
        conds.append(SalaryComponent.component_category == category)
    res = await db.execute(select(SalaryComponent).where(*conds).order_by(SalaryComponent.code))
    return list(res.scalars().all())


async def update_salary_component_v2(
    db: AsyncSession,
    component_id: UUID,
    payload: SalaryComponentV2Update,
    current_user,
) -> Optional[SalaryComponent]:
    comp = await get_salary_component_v2(db, component_id, current_user)
    if not comp:
        return None
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(comp, key, value)
    if payload.component_category is not None:
        comp.component_type = payload.component_category
    if payload.calculation_type is not None:
        comp.calc_type = payload.calculation_type
    try:
        await db.commit()
        await db.refresh(comp)
        return comp
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Component update failed: {exc}") from exc


async def create_component_group(
    db: AsyncSession,
    payload: SalaryComponentGroupCreate,
    current_user,
) -> SalaryComponentGroup:
    data = payload.model_dump()
    data.pop("organisation_id", None)
    group = SalaryComponentGroup(**data, organisation_id=_require_org_id(current_user))
    try:
        db.add(group)
        await db.commit()
        await db.refresh(group)
        return group
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Group creation failed: {exc}") from exc


async def get_component_group(
    db: AsyncSession,
    group_id: UUID,
    current_user,
) -> Optional[SalaryComponentGroup]:
    res = await db.execute(
        select(SalaryComponentGroup).where(
            SalaryComponentGroup.group_id == group_id,
            SalaryComponentGroup.organisation_id == _require_org_id(current_user),
        )
    )
    return res.scalar_one_or_none()


async def list_component_groups(db: AsyncSession, current_user) -> list[SalaryComponentGroup]:
    res = await db.execute(
        select(SalaryComponentGroup)
        .where(SalaryComponentGroup.organisation_id == _require_org_id(current_user))
        .order_by(SalaryComponentGroup.code)
    )
    return list(res.scalars().all())


async def update_component_group(
    db: AsyncSession,
    group_id: UUID,
    payload: SalaryComponentGroupUpdate,
    current_user,
) -> Optional[SalaryComponentGroup]:
    group = await get_component_group(db, group_id, current_user)
    if not group:
        return None
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(group, key, value)
    try:
        await db.commit()
        await db.refresh(group)
        return group
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Group update failed: {exc}") from exc


async def add_group_item(
    db: AsyncSession,
    group_id: UUID,
    payload: SalaryComponentGroupItemCreate,
    current_user,
) -> SalaryComponentGroupItem:
    group = await get_component_group(db, group_id, current_user)
    if not group:
        raise ValueError("Group not found")
    comp = await get_salary_component_v2(db, payload.component_id, current_user)
    if not comp:
        raise ValueError("Component not found")
    item = SalaryComponentGroupItem(
        group_id=group_id,
        component_id=payload.component_id,
        sequence=payload.sequence,
    )
    try:
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Group item creation failed: {exc}") from exc


async def list_group_items(
    db: AsyncSession,
    group_id: UUID,
    current_user,
) -> list[SalaryComponentGroupItem]:
    group = await get_component_group(db, group_id, current_user)
    if not group:
        return []
    res = await db.execute(
        select(SalaryComponentGroupItem)
        .where(SalaryComponentGroupItem.group_id == group_id)
        .order_by(SalaryComponentGroupItem.sequence)
    )
    return list(res.scalars().all())


async def create_derived_variable(
    db: AsyncSession,
    payload: SalaryDerivedVariableCreate,
    current_user,
) -> SalaryDerivedVariable:
    data = payload.model_dump()
    data.pop("organisation_id", None)
    row = SalaryDerivedVariable(**data, organisation_id=_require_org_id(current_user))
    try:
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Derived variable creation failed: {exc}") from exc


async def list_derived_variables(db: AsyncSession, current_user) -> list[SalaryDerivedVariable]:
    res = await db.execute(
        select(SalaryDerivedVariable)
        .where(SalaryDerivedVariable.organisation_id == _require_org_id(current_user))
        .order_by(SalaryDerivedVariable.code)
    )
    return list(res.scalars().all())


async def update_derived_variable(
    db: AsyncSession,
    variable_id: UUID,
    payload: SalaryDerivedVariableUpdate,
    current_user,
) -> Optional[SalaryDerivedVariable]:
    res = await db.execute(
        select(SalaryDerivedVariable).where(
            SalaryDerivedVariable.variable_id == variable_id,
            SalaryDerivedVariable.organisation_id == _require_org_id(current_user),
        )
    )
    row = res.scalar_one_or_none()
    if not row:
        return None
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    try:
        await db.commit()
        await db.refresh(row)
        return row
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Derived variable update failed: {exc}") from exc


async def create_org_statutory_config(
    db: AsyncSession,
    payload: OrgStatutoryConfigCreate,
    current_user,
) -> OrgStatutoryConfig:
    data = payload.model_dump()
    data.pop("organisation_id", None)
    row = OrgStatutoryConfig(**data, organisation_id=_require_org_id(current_user))
    try:
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Statutory config creation failed: {exc}") from exc


async def list_org_statutory_configs(db: AsyncSession, current_user) -> list[OrgStatutoryConfig]:
    res = await db.execute(
        select(OrgStatutoryConfig)
        .where(OrgStatutoryConfig.organisation_id == _require_org_id(current_user))
        .order_by(OrgStatutoryConfig.statutory_code, OrgStatutoryConfig.effective_from.desc())
    )
    return list(res.scalars().all())


async def add_group_to_template(
    db: AsyncSession,
    template_id: UUID,
    payload: SalaryTemplateGroupLinkCreate,
    current_user,
) -> SalaryTemplateGroup:
    org_id = _require_org_id(current_user)
    tpl_res = await db.execute(
        select(SalaryTemplate).where(
            SalaryTemplate.template_id == template_id,
            SalaryTemplate.organisation_id == org_id,
        )
    )
    if not tpl_res.scalar_one_or_none():
        raise ValueError("Template not found")
    group = await get_component_group(db, payload.group_id, current_user)
    if not group:
        raise ValueError("Group not found")
    row = SalaryTemplateGroup(
        template_id=template_id,
        group_id=payload.group_id,
        sequence=payload.sequence,
        is_active=payload.is_active,
    )
    try:
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"Template group link failed: {exc}") from exc


async def list_template_groups(
    db: AsyncSession,
    template_id: UUID,
    current_user,
) -> list[SalaryTemplateGroup]:
    org_id = _require_org_id(current_user)
    tpl_res = await db.execute(
        select(SalaryTemplate).where(
            SalaryTemplate.template_id == template_id,
            SalaryTemplate.organisation_id == org_id,
        )
    )
    if not tpl_res.scalar_one_or_none():
        return []
    res = await db.execute(
        select(SalaryTemplateGroup)
        .where(SalaryTemplateGroup.template_id == template_id)
        .order_by(SalaryTemplateGroup.sequence)
    )
    return list(res.scalars().all())


async def get_template_components_for_preview(
    db: AsyncSession,
    template_id: UUID,
    current_user,
) -> list[SalaryTemplateComponent]:
    org_id = _require_org_id(current_user)
    tpl_res = await db.execute(
        select(SalaryTemplate).where(
            SalaryTemplate.template_id == template_id,
            SalaryTemplate.organisation_id == org_id,
        )
    )
    if not tpl_res.scalar_one_or_none():
        return []
    res = await db.execute(
        select(SalaryTemplateComponent)
        .where(
            SalaryTemplateComponent.template_id == template_id,
            SalaryTemplateComponent.is_active.is_(True),
        )
        .order_by(SalaryTemplateComponent.sequence)
    )
    return list(res.scalars().all())


async def get_salary_components_by_ids_for_preview(
    db: AsyncSession,
    component_ids: set[UUID],
    current_user,
) -> list[SalaryComponent]:
    if not component_ids:
        return []
    res = await db.execute(
        select(SalaryComponent).where(
            SalaryComponent.organisation_id == _require_org_id(current_user),
            SalaryComponent.component_id.in_(component_ids),
        )
    )
    return list(res.scalars().all())


async def get_derived_variables_for_preview(
    db: AsyncSession,
    current_user,
) -> list[SalaryDerivedVariable]:
    res = await db.execute(
        select(SalaryDerivedVariable).where(
            SalaryDerivedVariable.organisation_id == _require_org_id(current_user),
            SalaryDerivedVariable.is_active.is_(True),
        )
    )
    return list(res.scalars().all())


async def get_template_groups_with_codes_for_preview(
    db: AsyncSession,
    template_id: UUID,
    current_user,
) -> list[dict[str, Any]]:
    links = await list_template_groups(db, template_id, current_user)
    out: list[dict[str, Any]] = []
    for link in links:
        if not link.is_active:
            continue
        group = await get_component_group(db, link.group_id, current_user)
        code = group.code if group else ""
        out.append(
            {
                "id": link.id,
                "template_id": template_id,
                "group_id": link.group_id,
                "sequence": int(link.sequence or 1),
                "is_active": link.is_active,
                "group_code": code,
                "code": code,
            }
        )
    return out


async def get_group_items_with_components_for_preview(
    db: AsyncSession,
    group_ids: set[UUID],
    current_user,
) -> dict[UUID, list[dict[str, Any]]]:
    out: dict[UUID, list[dict[str, Any]]] = {}
    if not group_ids:
        return out
    for group_id in group_ids:
        items = await list_group_items(db, group_id, current_user)
        rows: list[dict[str, Any]] = []
        for item in items:
            comp = await get_salary_component_v2(db, item.component_id, current_user)
            rows.append(
                {
                    "id": item.id,
                    "group_id": group_id,
                    "component_id": item.component_id,
                    "sequence": int(item.sequence or 1),
                    "component": jsonable_encoder(comp) if comp else {},
                }
            )
        out[group_id] = rows
    return out


async def get_effective_org_statutory_config(
    db: AsyncSession,
    current_user,
    *,
    statutory_code: str,
    as_of: date,
) -> Optional[OrgStatutoryConfig]:
    res = await db.execute(
        select(OrgStatutoryConfig)
        .where(
            OrgStatutoryConfig.organisation_id == _require_org_id(current_user),
            OrgStatutoryConfig.statutory_code == statutory_code,
            OrgStatutoryConfig.is_enabled.is_(True),
            OrgStatutoryConfig.effective_from <= as_of,
        )
        .order_by(OrgStatutoryConfig.effective_from.desc())
    )
    for row in res.scalars().all():
        if row.effective_to is None or row.effective_to >= as_of:
            return row
    return None


def _overrides_bucket(metadata: dict[str, Any] | None) -> dict[str, Any]:
    root = dict(metadata or {})
    bucket = root.get("salary_v2_overrides")
    if not isinstance(bucket, dict):
        bucket = {}
    return bucket


async def get_employee_overrides_for_preview(
    db: AsyncSession,
    employee_id: UUID,
    template_id: UUID,
    current_user,
) -> dict[str, Any]:
    org_id = _require_org_id(current_user)
    emp_res = await db.execute(
        select(Employee).where(
            Employee.employee_id == employee_id,
            Employee.organisation_id == org_id,
        )
    )
    employee = emp_res.scalar_one_or_none()
    if employee is None:
        return {}
    bucket = _overrides_bucket(employee.extra_metadata)
    stored = bucket.get(str(template_id)) or bucket.get("default") or {}
    return dict(stored) if isinstance(stored, dict) else {}


async def update_employee_salary_overrides(
    db: AsyncSession,
    employee_salary_structure_id: UUID,
    overrides: dict[str, Any],
    current_user,
) -> Optional[EmployeeSalaryStructure]:
    org_id = _require_org_id(current_user)
    res = await db.execute(
        select(EmployeeSalaryStructure).where(
            EmployeeSalaryStructure.id == employee_salary_structure_id,
            EmployeeSalaryStructure.organisation_id == org_id,
        )
    )
    structure = res.scalar_one_or_none()
    if not structure:
        return None

    emp_res = await db.execute(
        select(Employee).where(
            Employee.employee_id == structure.employee_id,
            Employee.organisation_id == org_id,
        )
    )
    employee = emp_res.scalar_one_or_none()
    if employee is None:
        return None

    metadata = dict(employee.extra_metadata or {})
    bucket = _overrides_bucket(metadata)
    bucket[str(structure.template_id)] = dict(overrides or {})
    metadata["salary_v2_overrides"] = bucket
    employee.extra_metadata = metadata
    await db.commit()
    await db.refresh(structure)
    return structure
