"""
Shared Phase 2 config → engine input bundle (same shapes as /salary/v2/preview).

Used by salary preview API and payroll execution orchestration so bundle resolution
stays in one place — calculation remains exclusively in preview_salary_v2.
"""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from crud.salary_phase2_crud import (
    get_derived_variables_for_preview,
    get_effective_org_statutory_config,
    get_group_items_with_components_for_preview,
    get_salary_components_by_ids_for_preview,
    get_template_components_for_preview,
    get_template_groups_with_codes_for_preview,
)
from crud.salary_version_crud import resolve_versioned_preview_bundle
from models.salary_models import SalaryTemplateComponent


async def load_phase2_engine_bundle(
    db: AsyncSession,
    *,
    template_id: UUID,
    as_of: date,
    current_user,
) -> dict[str, Any]:
    """
    Returns dict with keys: template_components, component_map_by_id, derived_variables,
    template_groups, group_items_by_group_id, statutory_cfg_by_code,
    template_version_id, resolved_versions, resolved_dag.
    """
    try:
        vbundle = await resolve_versioned_preview_bundle(
            db,
            template_id=template_id,
            as_of=as_of,
            current_user=current_user,
        )
    except ValueError:
        raise

    template_version_id = None
    resolved_versions_meta: dict[str, Any] | None = None
    resolved_dag_meta: dict[str, Any] | None = None

    if vbundle:
        template_version_id = vbundle.get("template_version_id")
        resolved_versions_meta = vbundle.get("resolved_versions")
        resolved_dag_meta = vbundle.get("resolved_dag")

        template_components = [jsonable_encoder(x) for x in vbundle["template_components"]]
        component_map_by_id = {str(k): jsonable_encoder(v) for k, v in vbundle["component_map_by_id"].items()}
        derived_dicts = [jsonable_encoder(x) for x in vbundle["derived_variables"]]
        template_groups = jsonable_encoder(vbundle["template_groups"])
        group_items_by_group_id = jsonable_encoder(vbundle["group_items_by_group_id"])

        if not template_components and not template_groups:
            raise ValueError("Template version has no components or groups")
    else:
        template_components_raw = await get_template_components_for_preview(db, template_id, current_user)
        if not template_components_raw:
            raise ValueError("Template not found or has no components")

        component_ids = {
            tc.component_id for tc in template_components_raw if isinstance(tc, SalaryTemplateComponent)
        }
        comps = await get_salary_components_by_ids_for_preview(db, component_ids, current_user)
        component_map_by_id = {str(c.component_id): jsonable_encoder(c) for c in comps}

        derived = await get_derived_variables_for_preview(db, current_user)
        derived_dicts = [jsonable_encoder(x) for x in derived]

        template_groups = await get_template_groups_with_codes_for_preview(db, template_id, current_user)
        group_ids = {g.get("group_id") for g in template_groups if g.get("group_id")}
        group_items_by_group_id = await get_group_items_with_components_for_preview(db, group_ids, current_user)

        template_components = [jsonable_encoder(x) for x in template_components_raw]
        template_groups = jsonable_encoder(template_groups)
        group_items_by_group_id = jsonable_encoder(group_items_by_group_id)

    statutory_cfg_by_code: dict[str, dict] = {}
    for g in template_groups:
        gc = str(g.get("group_code") or g.get("code") or "")
        if not gc.upper().endswith("_GROUP"):
            continue
        st_code = gc.upper().removesuffix("_GROUP")
        if st_code in statutory_cfg_by_code:
            continue
        eff = await get_effective_org_statutory_config(db, current_user, statutory_code=st_code, as_of=as_of)
        statutory_cfg_by_code[st_code] = jsonable_encoder(eff) if eff else {}

    return {
        "template_components": template_components,
        "component_map_by_id": component_map_by_id,
        "derived_variables": derived_dicts,
        "template_groups": template_groups,
        "group_items_by_group_id": group_items_by_group_id,
        "statutory_cfg_by_code": statutory_cfg_by_code,
        "template_version_id": template_version_id,
        "resolved_versions": resolved_versions_meta,
        "resolved_dag": resolved_dag_meta,
    }
