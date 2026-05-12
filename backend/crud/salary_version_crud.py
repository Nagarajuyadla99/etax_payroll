"""Salary V2 version publishing and as-of preview bundle resolution."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from crud.salary_phase2_crud import (
    _org_id,
    get_component_group,
    get_group_items_with_components_for_preview,
    get_salary_component_v2,
)
from models.salary_models import (
    SalaryComponentGroupItem,
    SalaryDerivedVariable,
    SalaryTemplate,
    SalaryTemplateComponent,
    SalaryTemplateGroup,
)
from models.salary_version_models import (
    SalaryComponentGroupItemVersion,
    SalaryComponentGroupVersion,
    SalaryComponentVersion,
    SalaryDerivedVariableVersion,
    SalaryPreviewSnapshot,
    SalaryTemplateComponentVersion,
    SalaryTemplateGroupVersion,
    SalaryTemplateVersion,
)
from services.salary_version_utils import (
    assert_publish_start_not_inside_closed_history,
    pick_effective_row,
    previous_day,
)


# --- Effective row loaders -------------------------------------------------

async def _load_component_versions_for_org(
    db: AsyncSession, organisation_id: UUID, component_ids: set[UUID]
) -> dict[UUID, list[SalaryComponentVersion]]:
    if not component_ids:
        return {}
    res = await db.execute(
        select(SalaryComponentVersion).where(
            SalaryComponentVersion.organisation_id == organisation_id,
            SalaryComponentVersion.component_id.in_(component_ids),
        )
    )
    rows = res.scalars().all()
    out: dict[UUID, list[SalaryComponentVersion]] = {}
    for r in rows:
        out.setdefault(r.component_id, []).append(r)
    return out


async def _load_group_versions_for_org(
    db: AsyncSession, organisation_id: UUID, group_ids: set[UUID]
) -> dict[UUID, list[SalaryComponentGroupVersion]]:
    if not group_ids:
        return {}
    res = await db.execute(
        select(SalaryComponentGroupVersion).where(
            SalaryComponentGroupVersion.organisation_id == organisation_id,
            SalaryComponentGroupVersion.group_id.in_(group_ids),
        )
    )
    rows = res.scalars().all()
    out: dict[UUID, list[SalaryComponentGroupVersion]] = {}
    for r in rows:
        out.setdefault(r.group_id, []).append(r)
    return out


async def _load_dv_versions_for_org(
    db: AsyncSession, organisation_id: UUID, variable_ids: set[UUID]
) -> dict[UUID, list[SalaryDerivedVariableVersion]]:
    if not variable_ids:
        return {}
    res = await db.execute(
        select(SalaryDerivedVariableVersion).where(
            SalaryDerivedVariableVersion.organisation_id == organisation_id,
            SalaryDerivedVariableVersion.variable_id.in_(variable_ids),
        )
    )
    rows = res.scalars().all()
    out: dict[UUID, list[SalaryDerivedVariableVersion]] = {}
    for r in rows:
        out.setdefault(r.variable_id, []).append(r)
    return out


def _component_version_to_map(cv: SalaryComponentVersion) -> dict[str, Any]:
    return {
        "component_id": cv.component_id,
        "code": cv.code,
        "name": cv.name,
        "description": cv.description,
        "component_category": cv.component_category,
        "calculation_type": cv.calculation_type,
        "formula_expression": cv.formula_expression,
        "system_code": cv.system_code,
        "rounding_rule": cv.rounding_rule or {},
        "meta": cv.meta or {},
        "component_type": cv.component_type,
        "calc_type": cv.calc_type,
        "percentage_of": cv.percentage_of,
        "formula": cv.formula,
        "is_active": cv.is_active,
    }


async def resolve_versioned_preview_bundle(
    db: AsyncSession,
    *,
    template_id: UUID,
    as_of: date,
    current_user,
) -> Optional[dict[str, Any]]:
    """
    If an effective SalaryTemplateVersion exists for template_id at as_of, return bundle dict.
    Otherwise return None (caller uses legacy live tables).
    """
    org_id = _org_id(current_user)

    tv_res = await db.execute(
        select(SalaryTemplateVersion)
        .where(
            SalaryTemplateVersion.organisation_id == org_id,
            SalaryTemplateVersion.template_id == template_id,
            SalaryTemplateVersion.effective_from <= as_of,
            or_(
                SalaryTemplateVersion.effective_to.is_(None),
                SalaryTemplateVersion.effective_to >= as_of,
            ),
        )
        .order_by(SalaryTemplateVersion.effective_from.desc())
        .limit(1)
    )
    tv = tv_res.scalar_one_or_none()
    if not tv:
        return None

    template_version_id = tv.template_version_id

    stcv_res = await db.execute(
        select(SalaryTemplateComponentVersion)
        .where(SalaryTemplateComponentVersion.template_version_id == template_version_id)
        .order_by(SalaryTemplateComponentVersion.sequence)
    )
    stcvs = stcv_res.scalars().all()

    stgv_res = await db.execute(
        select(SalaryTemplateGroupVersion)
        .where(SalaryTemplateGroupVersion.template_version_id == template_version_id)
        .order_by(SalaryTemplateGroupVersion.sequence)
    )
    stgvs = stgv_res.scalars().all()

    comp_ids: set[UUID] = {row.component_id for row in stcvs}
    group_ids: set[UUID] = {row.group_id for row in stgvs}

    cv_by_comp = await _load_component_versions_for_org(db, org_id, comp_ids)
    gv_by_group = await _load_group_versions_for_org(db, org_id, group_ids)

    # All derived variables in org (active master rows); version effective at as_of
    dv_master = await db.execute(
        select(SalaryDerivedVariable).where(SalaryDerivedVariable.organisation_id == org_id)
    )
    dvs = dv_master.scalars().all()
    var_ids = {d.variable_id for d in dvs}
    dv_ver_by_var = await _load_dv_versions_for_org(db, org_id, var_ids)

    template_components: list[dict] = []
    resolved_component_versions: dict[str, str] = {}

    for row in stcvs:
        rows = cv_by_comp.get(row.component_id, [])
        picked = pick_effective_row(
            rows,
            as_of,
            effective_from_key=lambda x: x.effective_from,
            effective_to_key=lambda x: x.effective_to,
        )
        template_components.append(
            {
                "stc_id": row.id,
                "template_id": template_id,
                "component_id": row.component_id,
                "sequence": int(row.sequence or 1),
                "amount": row.amount,
                "percentage": row.percentage,
                "percentage_of": row.percentage_of,
                "formula": row.formula,
            }
        )
        if picked:
            resolved_component_versions[str(row.component_id)] = str(picked.version_id)

    component_map_by_id: dict[str, Any] = {}
    for cid in comp_ids:
        rows = cv_by_comp.get(cid, [])
        picked = pick_effective_row(
            rows,
            as_of,
            effective_from_key=lambda x: x.effective_from,
            effective_to_key=lambda x: x.effective_to,
        )
        if picked:
            component_map_by_id[str(cid)] = _component_version_to_map(picked)
        else:
            comp = await get_salary_component_v2(db, cid, current_user)
            if comp:
                component_map_by_id[str(cid)] = jsonable_encoder(comp)

    template_groups: list[dict] = []
    resolved_group_versions: dict[str, str] = {}

    for row in stgvs:
        grows = gv_by_group.get(row.group_id, [])
        gpicked = pick_effective_row(
            grows,
            as_of,
            effective_from_key=lambda x: x.effective_from,
            effective_to_key=lambda x: x.effective_to,
        )
        code = ""
        if gpicked:
            code = gpicked.code or ""
            resolved_group_versions[str(row.group_id)] = str(gpicked.group_version_id)
        else:
            grp = await get_component_group(db, row.group_id, current_user)
            code = grp.code if grp else ""

        template_groups.append(
            {
                "id": row.id,
                "template_id": template_id,
                "group_id": row.group_id,
                "sequence": int(row.sequence or 1),
                "is_active": row.is_active,
                "group_code": code,
                "code": code,
            }
        )

    group_items_by_group_id: dict[UUID, list[dict]] = {}
    for gid in group_ids:
        grows = gv_by_group.get(gid, [])
        gpicked = pick_effective_row(
            grows,
            as_of,
            effective_from_key=lambda x: x.effective_from,
            effective_to_key=lambda x: x.effective_to,
        )
        if gpicked:
            it_res = await db.execute(
                select(SalaryComponentGroupItemVersion).where(
                    SalaryComponentGroupItemVersion.group_version_id == gpicked.group_version_id
                ).order_by(SalaryComponentGroupItemVersion.sequence)
            )
            items = it_res.scalars().all()
            out_items = []
            for it in items:
                cid = it.component_id
                comp_dict = component_map_by_id.get(str(cid))
                if not comp_dict:
                    comp = await get_salary_component_v2(db, cid, current_user)
                    comp_dict = jsonable_encoder(comp) if comp else {}
                out_items.append(
                    {
                        "id": it.id,
                        "group_id": gid,
                        "component_id": cid,
                        "sequence": int(it.sequence or 1),
                        "component": comp_dict,
                    }
                )
            group_items_by_group_id[gid] = out_items
        else:
            # fallback: live group items
            gi_map = await get_group_items_with_components_for_preview(db, {gid}, current_user)
            group_items_by_group_id[gid] = gi_map.get(gid, [])

    derived_dicts: list[dict] = []
    resolved_dv_versions: dict[str, str] = {}
    for dv in dvs:
        rows = dv_ver_by_var.get(dv.variable_id, [])
        picked = pick_effective_row(
            rows,
            as_of,
            effective_from_key=lambda x: x.effective_from,
            effective_to_key=lambda x: x.effective_to,
        )
        if picked:
            if picked.is_active:
                derived_dicts.append(
                    {
                        "code": picked.code,
                        "name": picked.name,
                        "expression": picked.expression,
                        "data_type": picked.data_type,
                    }
                )
                resolved_dv_versions[str(dv.variable_id)] = str(picked.version_id)
        else:
            if dv.is_active:
                derived_dicts.append(
                    {
                        "code": dv.code,
                        "name": dv.name,
                        "expression": dv.expression,
                        "data_type": dv.data_type,
                    }
                )

    resolved_versions: dict[str, Any] = {
        "template_version_id": str(template_version_id),
        "component_versions": resolved_component_versions,
        "derived_variable_versions": resolved_dv_versions,
        "group_versions": resolved_group_versions,
    }

    resolved_dag: dict[str, Any] = {
        "template_version_id": str(template_version_id),
        "template_component_rows": len(template_components),
        "template_group_rows": len(template_groups),
        "derived_variables_resolved": len(derived_dicts),
    }

    return {
        "template_components": template_components,
        "component_map_by_id": component_map_by_id,
        "derived_variables": derived_dicts,
        "template_groups": template_groups,
        "group_items_by_group_id": group_items_by_group_id,
        "resolved_versions": resolved_versions,
        "resolved_dag": resolved_dag,
        "template_version_id": template_version_id,
    }


async def save_preview_snapshot(
    db: AsyncSession,
    *,
    trace_id: str,
    organisation_id: UUID,
    template_id: UUID,
    template_version_id: Optional[UUID],
    as_of: date,
    ctc: Decimal,
    employee_id: Optional[UUID],
    overrides: dict,
    resolved_versions: dict,
    resolved_dag: dict,
    result: dict,
    created_by_user_id: Optional[UUID],
) -> UUID:
    snap = SalaryPreviewSnapshot(
        trace_id=UUID(trace_id) if isinstance(trace_id, str) else trace_id,
        organisation_id=organisation_id,
        template_id=template_id,
        template_version_id=template_version_id,
        as_of_date=as_of,
        ctc=ctc,
        employee_id=employee_id,
        overrides=overrides or {},
        resolved_versions=resolved_versions or {},
        resolved_dag=resolved_dag or {},
        result=result or {},
        created_by_user_id=created_by_user_id,
    )
    db.add(snap)
    await db.commit()
    await db.refresh(snap)
    return snap.snapshot_id


# --- Publish ----------------------------------------------------------------

async def publish_component_version(
    db: AsyncSession,
    *,
    component_id: UUID,
    effective_from: date,
    current_user,
    created_by_user_id: Optional[UUID] = None,
) -> SalaryComponentVersion:
    org_id = _org_id(current_user)
    comp = await get_salary_component_v2(db, component_id, current_user)
    if not comp:
        raise ValueError("Component not found")

    hist = await db.execute(
        select(SalaryComponentVersion).where(
            SalaryComponentVersion.organisation_id == org_id,
            SalaryComponentVersion.component_id == component_id,
        )
    )
    assert_publish_start_not_inside_closed_history(
        list(hist.scalars().all()),
        effective_from,
        effective_from_key=lambda r: r.effective_from,
        effective_to_key=lambda r: r.effective_to,
    )

    await db.execute(
        update(SalaryComponentVersion)
        .where(
            SalaryComponentVersion.organisation_id == org_id,
            SalaryComponentVersion.component_id == component_id,
            SalaryComponentVersion.effective_to.is_(None),
        )
        .values(effective_to=previous_day(effective_from))
    )

    row = SalaryComponentVersion(
        organisation_id=org_id,
        component_id=component_id,
        effective_from=effective_from,
        effective_to=None,
        code=comp.code,
        name=comp.name,
        description=comp.description,
        component_category=comp.component_category,
        calculation_type=comp.calculation_type,
        formula_expression=comp.formula_expression,
        system_code=comp.system_code,
        rounding_rule=comp.rounding_rule or {},
        meta=comp.meta or {},
        component_type=comp.component_type,
        calc_type=comp.calc_type,
        percentage_of=comp.percentage_of,
        formula=comp.formula,
        is_active=comp.is_active,
        created_by_user_id=created_by_user_id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def publish_derived_variable_version(
    db: AsyncSession,
    *,
    variable_id: UUID,
    effective_from: date,
    current_user,
    created_by_user_id: Optional[UUID] = None,
) -> SalaryDerivedVariableVersion:
    org_id = _org_id(current_user)
    res = await db.execute(
        select(SalaryDerivedVariable).where(
            SalaryDerivedVariable.variable_id == variable_id,
            SalaryDerivedVariable.organisation_id == org_id,
        )
    )
    dv = res.scalar_one_or_none()
    if not dv:
        raise ValueError("Derived variable not found")

    hist = await db.execute(
        select(SalaryDerivedVariableVersion).where(
            SalaryDerivedVariableVersion.organisation_id == org_id,
            SalaryDerivedVariableVersion.variable_id == variable_id,
        )
    )
    assert_publish_start_not_inside_closed_history(
        list(hist.scalars().all()),
        effective_from,
        effective_from_key=lambda r: r.effective_from,
        effective_to_key=lambda r: r.effective_to,
    )

    await db.execute(
        update(SalaryDerivedVariableVersion)
        .where(
            SalaryDerivedVariableVersion.organisation_id == org_id,
            SalaryDerivedVariableVersion.variable_id == variable_id,
            SalaryDerivedVariableVersion.effective_to.is_(None),
        )
        .values(effective_to=previous_day(effective_from))
    )

    row = SalaryDerivedVariableVersion(
        organisation_id=org_id,
        variable_id=variable_id,
        effective_from=effective_from,
        effective_to=None,
        code=dv.code,
        name=dv.name,
        expression=dv.expression,
        data_type=dv.data_type,
        is_active=dv.is_active,
        created_by_user_id=created_by_user_id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def publish_group_version(
    db: AsyncSession,
    *,
    group_id: UUID,
    effective_from: date,
    current_user,
    created_by_user_id: Optional[UUID] = None,
) -> SalaryComponentGroupVersion:
    org_id = _org_id(current_user)
    grp = await get_component_group(db, group_id, current_user)
    if not grp:
        raise ValueError("Group not found")

    hist = await db.execute(
        select(SalaryComponentGroupVersion).where(
            SalaryComponentGroupVersion.organisation_id == org_id,
            SalaryComponentGroupVersion.group_id == group_id,
        )
    )
    assert_publish_start_not_inside_closed_history(
        list(hist.scalars().all()),
        effective_from,
        effective_from_key=lambda r: r.effective_from,
        effective_to_key=lambda r: r.effective_to,
    )

    await db.execute(
        update(SalaryComponentGroupVersion)
        .where(
            SalaryComponentGroupVersion.organisation_id == org_id,
            SalaryComponentGroupVersion.group_id == group_id,
            SalaryComponentGroupVersion.effective_to.is_(None),
        )
        .values(effective_to=previous_day(effective_from))
    )

    gv = SalaryComponentGroupVersion(
        organisation_id=org_id,
        group_id=group_id,
        effective_from=effective_from,
        effective_to=None,
        code=grp.code,
        name=grp.name,
        description=grp.description,
        is_active=grp.is_active,
        created_by_user_id=created_by_user_id,
    )
    db.add(gv)
    await db.flush()

    res_items = await db.execute(
        select(SalaryComponentGroupItem).where(SalaryComponentGroupItem.group_id == group_id).order_by(
            SalaryComponentGroupItem.sequence
        )
    )
    for it in res_items.scalars().all():
        db.add(
            SalaryComponentGroupItemVersion(
                group_version_id=gv.group_version_id,
                component_id=it.component_id,
                sequence=it.sequence,
            )
        )

    await db.commit()
    await db.refresh(gv)
    return gv


async def publish_template_version(
    db: AsyncSession,
    *,
    template_id: UUID,
    effective_from: date,
    current_user,
    label: Optional[str] = None,
    created_by_user_id: Optional[UUID] = None,
) -> SalaryTemplateVersion:
    org_id = _org_id(current_user)
    tpl = await db.execute(
        select(SalaryTemplate).where(
            SalaryTemplate.template_id == template_id,
            SalaryTemplate.organisation_id == org_id,
        )
    )
    if not tpl.scalar_one_or_none():
        raise ValueError("Template not found")

    hist = await db.execute(
        select(SalaryTemplateVersion).where(
            SalaryTemplateVersion.organisation_id == org_id,
            SalaryTemplateVersion.template_id == template_id,
        )
    )
    assert_publish_start_not_inside_closed_history(
        list(hist.scalars().all()),
        effective_from,
        effective_from_key=lambda r: r.effective_from,
        effective_to_key=lambda r: r.effective_to,
    )

    await db.execute(
        update(SalaryTemplateVersion)
        .where(
            SalaryTemplateVersion.organisation_id == org_id,
            SalaryTemplateVersion.template_id == template_id,
            SalaryTemplateVersion.effective_to.is_(None),
        )
        .values(effective_to=previous_day(effective_from))
    )

    tv = SalaryTemplateVersion(
        organisation_id=org_id,
        template_id=template_id,
        effective_from=effective_from,
        effective_to=None,
        label=label,
        created_by_user_id=created_by_user_id,
    )
    db.add(tv)
    await db.flush()

    stc_res = await db.execute(
        select(SalaryTemplateComponent).where(SalaryTemplateComponent.template_id == template_id).order_by(
            SalaryTemplateComponent.sequence
        )
    )
    for stc in stc_res.scalars().all():
        db.add(
            SalaryTemplateComponentVersion(
                template_version_id=tv.template_version_id,
                component_id=stc.component_id,
                sequence=stc.sequence,
                amount=stc.amount,
                percentage=stc.percentage,
                percentage_of=stc.percentage_of,
                formula=stc.formula,
                is_active=stc.is_active,
            )
        )

    stg_res = await db.execute(
        select(SalaryTemplateGroup).where(SalaryTemplateGroup.template_id == template_id).order_by(
            SalaryTemplateGroup.sequence
        )
    )
    for stg in stg_res.scalars().all():
        db.add(
            SalaryTemplateGroupVersion(
                template_version_id=tv.template_version_id,
                group_id=stg.group_id,
                sequence=stg.sequence,
                is_active=stg.is_active,
            )
        )

    await db.commit()
    await db.refresh(tv)
    return tv
