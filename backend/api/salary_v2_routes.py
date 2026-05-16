from __future__ import annotations

from datetime import date
import time
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from crud.salary_version_crud import (
    publish_component_version,
    publish_derived_variable_version,
    publish_group_version,
    publish_template_version,
    save_preview_snapshot,
)
from crud.salary_phase2_crud import (
    add_group_item,
    add_group_to_template,
    create_component_group,
    create_derived_variable,
    create_org_statutory_config,
    create_salary_component_v2,
    get_component_group,
    get_employee_overrides_for_preview,
    get_salary_component_v2,
    list_component_groups,
    list_derived_variables,
    list_group_items,
    list_org_statutory_configs,
    list_salary_components_v2,
    list_template_groups,
    update_component_group,
    update_derived_variable,
    update_employee_salary_overrides,
    update_salary_component_v2,
)
from database import get_async_db
from models.org_models import Organisation
from services.salary_engine_v2 import preview_salary_v2
from services.payroll_run_gather import merge_pay_period_attendance_overrides
from sqlalchemy import select
from services.salary_formula_policy import audit_formula_policy
from services.payroll_phase2_bundle_loader import load_phase2_engine_bundle
from utils.rbac import require_roles
from utils.idempotency import idempotency_replay_or_none, idempotency_store

from schemas.salary_phase2_schemas import (
    EmployeeSalaryStructureOverridesUpdate,
    FormulaValidateRequest,
    FormulaValidateResponse,
    OrgStatutoryConfigCreate,
    OrgStatutoryConfigOut,
    PublishedSalaryComponentVersionOut,
    PublishedSalaryDerivedVariableVersionOut,
    PublishedSalaryGroupVersionOut,
    PublishedSalaryTemplateVersionOut,
    SalaryComponentGroupCreate,
    SalaryComponentGroupItemCreate,
    SalaryComponentGroupOut,
    SalaryComponentGroupUpdate,
    SalaryComponentV2Create,
    SalaryComponentV2Out,
    SalaryComponentV2Update,
    SalaryDerivedVariableCreate,
    SalaryDerivedVariableOut,
    SalaryDerivedVariableUpdate,
    SalaryPreviewRequest,
    SalaryPreviewResponse,
    SalaryTemplateGroupLinkCreate,
    SalaryTemplateGroupLinkOut,
    SalaryTemplateVersionPublishBody,
    SalaryVersionPublishBody,
)


router = APIRouter(prefix="/v2", tags=["Salary V2"])

def _http400(detail: str) -> HTTPException:
    return HTTPException(status_code=400, detail=detail)

def _org_id(current_user):
    return getattr(current_user, "organisation_id", None) or getattr(current_user, "org_id", None)


def _user_id(current_user):
    return getattr(current_user, "user_id", None) or getattr(current_user, "id", None)


# ------------------------------------------------------------------
# Components
# ------------------------------------------------------------------
@router.post(
    "/components",
    response_model=SalaryComponentV2Out,
    status_code=status.HTTP_201_CREATED,
)
async def v2_create_component(
    payload: SalaryComponentV2Create,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
    request: Request = None,
    response: Response = None,
):
    key = (request.headers.get("Idempotency-Key") if request else None) or None
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=_org_id(current_user),
        key=key,
        method="POST",
        path=str(request.url.path) if request else "/api/salary/v2/components",
        payload_dict=payload.model_dump(),
    )
    if replay:
        if response is not None:
            response.status_code = int(replay["status_code"])
            response.headers["x-idempotent-replay"] = "true"
        return replay["data"]
    try:
        obj = await create_salary_component_v2(db, payload, current_user)
        data = jsonable_encoder(obj)
        await idempotency_store(
            db=db,
            organisation_id=_org_id(current_user),
            key=key,
            method="POST",
            path=str(request.url.path) if request else "/api/salary/v2/components",
            payload_dict=payload.model_dump(),
            status_code=201,
            response_json=data,
        )
        return obj
    except ValueError as e:
        raise _http400(str(e))


@router.get("/components", response_model=list[SalaryComponentV2Out])
async def v2_list_components(
    active: Optional[bool] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_salary_components_v2(db, current_user, active=active, category=category)


@router.get("/components/{component_id}", response_model=SalaryComponentV2Out)
async def v2_get_component(
    component_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    obj = await get_salary_component_v2(db, component_id, current_user)
    if not obj:
        raise HTTPException(status_code=404, detail="Component not found")
    return obj


@router.put("/components/{component_id}", response_model=SalaryComponentV2Out)
async def v2_update_component(
    component_id: UUID,
    payload: SalaryComponentV2Update,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        obj = await update_salary_component_v2(db, component_id, payload, current_user)
        if not obj:
            raise HTTPException(status_code=404, detail="Component not found")
        return obj
    except ValueError as e:
        raise _http400(str(e))


# ------------------------------------------------------------------
# Groups (aliases supported: /groups and /component-groups)
# ------------------------------------------------------------------
@router.post(
    "/component-groups",
    response_model=SalaryComponentGroupOut,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/groups",
    response_model=SalaryComponentGroupOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def v2_create_group(
    payload: SalaryComponentGroupCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
    request: Request = None,
    response: Response = None,
):
    key = (request.headers.get("Idempotency-Key") if request else None) or None
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=_org_id(current_user),
        key=key,
        method="POST",
        path=str(request.url.path) if request else "/api/salary/v2/component-groups",
        payload_dict=payload.model_dump(),
    )
    if replay:
        if response is not None:
            response.status_code = int(replay["status_code"])
            response.headers["x-idempotent-replay"] = "true"
        return replay["data"]
    try:
        obj = await create_component_group(db, payload, current_user)
        data = jsonable_encoder(obj)
        await idempotency_store(
            db=db,
            organisation_id=_org_id(current_user),
            key=key,
            method="POST",
            path=str(request.url.path) if request else "/api/salary/v2/component-groups",
            payload_dict=payload.model_dump(),
            status_code=201,
            response_json=data,
        )
        return obj
    except ValueError as e:
        raise _http400(str(e))


@router.get("/component-groups", response_model=list[SalaryComponentGroupOut])
@router.get("/groups", response_model=list[SalaryComponentGroupOut], include_in_schema=False)
async def v2_list_groups(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_component_groups(db, current_user)


@router.get("/component-groups/{group_id}", response_model=SalaryComponentGroupOut)
@router.get("/groups/{group_id}", response_model=SalaryComponentGroupOut, include_in_schema=False)
async def v2_get_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    obj = await get_component_group(db, group_id, current_user)
    if not obj:
        raise HTTPException(status_code=404, detail="Group not found")
    return obj


@router.put("/component-groups/{group_id}", response_model=SalaryComponentGroupOut)
@router.put("/groups/{group_id}", response_model=SalaryComponentGroupOut, include_in_schema=False)
async def v2_update_group(
    group_id: UUID,
    payload: SalaryComponentGroupUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        obj = await update_component_group(db, group_id, payload, current_user)
        if not obj:
            raise HTTPException(status_code=404, detail="Group not found")
        return obj
    except ValueError as e:
        raise _http400(str(e))


@router.post(
    "/component-groups/{group_id}/items",
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/groups/{group_id}/items",
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def v2_add_group_item(
    group_id: UUID,
    payload: SalaryComponentGroupItemCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
    request: Request = None,
    response: Response = None,
):
    key = (request.headers.get("Idempotency-Key") if request else None) or None
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=_org_id(current_user),
        key=key,
        method="POST",
        path=str(request.url.path) if request else f"/api/salary/v2/component-groups/{group_id}/items",
        payload_dict={**payload.model_dump(), "group_id": str(group_id)},
    )
    if replay:
        if response is not None:
            response.status_code = int(replay["status_code"])
            response.headers["x-idempotent-replay"] = "true"
        return replay["data"]
    try:
        obj = await add_group_item(db, group_id, payload, current_user)
        data = jsonable_encoder(obj)
        await idempotency_store(
            db=db,
            organisation_id=_org_id(current_user),
            key=key,
            method="POST",
            path=str(request.url.path) if request else f"/api/salary/v2/component-groups/{group_id}/items",
            payload_dict={**payload.model_dump(), "group_id": str(group_id)},
            status_code=201,
            response_json=data,
        )
        return obj
    except ValueError as e:
        raise _http400(str(e))


@router.get("/component-groups/{group_id}/items")
@router.get("/groups/{group_id}/items", include_in_schema=False)
async def v2_list_group_items(
    group_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_group_items(db, group_id, current_user)


# ------------------------------------------------------------------
# Derived variables (aliases supported: /derived-variables and /derived-vars)
# ------------------------------------------------------------------
@router.post(
    "/derived-variables",
    response_model=SalaryDerivedVariableOut,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/derived-vars",
    response_model=SalaryDerivedVariableOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def v2_create_derived_variable(
    payload: SalaryDerivedVariableCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
    request: Request = None,
    response: Response = None,
):
    key = (request.headers.get("Idempotency-Key") if request else None) or None
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=_org_id(current_user),
        key=key,
        method="POST",
        path=str(request.url.path) if request else "/api/salary/v2/derived-variables",
        payload_dict=payload.model_dump(),
    )
    if replay:
        if response is not None:
            response.status_code = int(replay["status_code"])
            response.headers["x-idempotent-replay"] = "true"
        return replay["data"]
    try:
        obj = await create_derived_variable(db, payload, current_user)
        data = jsonable_encoder(obj)
        await idempotency_store(
            db=db,
            organisation_id=_org_id(current_user),
            key=key,
            method="POST",
            path=str(request.url.path) if request else "/api/salary/v2/derived-variables",
            payload_dict=payload.model_dump(),
            status_code=201,
            response_json=data,
        )
        return obj
    except ValueError as e:
        raise _http400(str(e))


@router.get("/derived-variables", response_model=list[SalaryDerivedVariableOut])
@router.get("/derived-vars", response_model=list[SalaryDerivedVariableOut], include_in_schema=False)
async def v2_list_derived_variables(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_derived_variables(db, current_user)


@router.put("/derived-variables/{variable_id}", response_model=SalaryDerivedVariableOut)
@router.put("/derived-vars/{variable_id}", response_model=SalaryDerivedVariableOut, include_in_schema=False)
async def v2_update_derived_variable(
    variable_id: UUID,
    payload: SalaryDerivedVariableUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        obj = await update_derived_variable(db, variable_id, payload, current_user)
        if not obj:
            raise HTTPException(status_code=404, detail="Derived variable not found")
        return obj
    except ValueError as e:
        raise _http400(str(e))


# ------------------------------------------------------------------
# Statutory configs (effective dated)
# ------------------------------------------------------------------
@router.post(
    "/statutory-configs",
    response_model=OrgStatutoryConfigOut,
    status_code=status.HTTP_201_CREATED,
)
async def v2_create_statutory_config(
    payload: OrgStatutoryConfigCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
    request: Request = None,
    response: Response = None,
):
    key = (request.headers.get("Idempotency-Key") if request else None) or None
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=_org_id(current_user),
        key=key,
        method="POST",
        path=str(request.url.path) if request else "/api/salary/v2/statutory-configs",
        payload_dict=payload.model_dump(),
    )
    if replay:
        if response is not None:
            response.status_code = int(replay["status_code"])
            response.headers["x-idempotent-replay"] = "true"
        return replay["data"]
    try:
        obj = await create_org_statutory_config(db, payload, current_user)
        data = jsonable_encoder(obj)
        await idempotency_store(
            db=db,
            organisation_id=_org_id(current_user),
            key=key,
            method="POST",
            path=str(request.url.path) if request else "/api/salary/v2/statutory-configs",
            payload_dict=payload.model_dump(),
            status_code=201,
            response_json=data,
        )
        return obj
    except ValueError as e:
        raise _http400(str(e))


@router.get("/statutory-configs", response_model=list[OrgStatutoryConfigOut])
async def v2_list_statutory_configs(
    statutory_code: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_org_statutory_configs(db, current_user, statutory_code=statutory_code)


# ------------------------------------------------------------------
# Formula validation (AST)
# ------------------------------------------------------------------
@router.post("/formulas/validate", response_model=FormulaValidateResponse)
@router.post("/formula/validate", response_model=FormulaValidateResponse, include_in_schema=False)
async def v2_validate_formula(
    payload: FormulaValidateRequest,
    current_user=Depends(require_roles(["admin", "hr"])),
):
    known = {str(x) for x in (payload.known_identifiers or []) if str(x).strip()}
    pol = audit_formula_policy(
        payload.expression,
        known_identifiers=known,
        strict_unknown=payload.strict_unknown_identifiers,
    )
    return FormulaValidateResponse(
        is_valid=pol.is_valid,
        dependencies=pol.dependencies,
        error=pol.error,
        warnings=pol.warnings,
        unknown_dependencies=pol.unknown_dependencies,
        risk_hints=pol.risk_hints,
    )


# ------------------------------------------------------------------
# Template group links
# ------------------------------------------------------------------
@router.post(
    "/templates/{template_id}/groups",
    response_model=SalaryTemplateGroupLinkOut,
    status_code=status.HTTP_201_CREATED,
)
async def v2_add_group_to_template(
    template_id: UUID,
    payload: SalaryTemplateGroupLinkCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
    request: Request = None,
    response: Response = None,
):
    key = (request.headers.get("Idempotency-Key") if request else None) or None
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=_org_id(current_user),
        key=key,
        method="POST",
        path=str(request.url.path) if request else f"/api/salary/v2/templates/{template_id}/groups",
        payload_dict={**payload.model_dump(), "template_id": str(template_id)},
    )
    if replay:
        if response is not None:
            response.status_code = int(replay["status_code"])
            response.headers["x-idempotent-replay"] = "true"
        return replay["data"]
    try:
        obj = await add_group_to_template(db, template_id, payload, current_user)
        data = jsonable_encoder(obj)
        await idempotency_store(
            db=db,
            organisation_id=_org_id(current_user),
            key=key,
            method="POST",
            path=str(request.url.path) if request else f"/api/salary/v2/templates/{template_id}/groups",
            payload_dict={**payload.model_dump(), "template_id": str(template_id)},
            status_code=201,
            response_json=data,
        )
        return obj
    except ValueError as e:
        raise _http400(str(e))


@router.get("/templates/{template_id}/groups", response_model=list[SalaryTemplateGroupLinkOut])
async def v2_list_template_groups(
    template_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_template_groups(db, template_id, current_user)


# ------------------------------------------------------------------
# Preview (calculation-only)
# ------------------------------------------------------------------
@router.post("/preview", response_model=SalaryPreviewResponse)
async def v2_preview(
    payload: SalaryPreviewRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
    response: Response = None,
):
    trace_id = str(uuid4())
    t0 = time.perf_counter()
    as_of: date = payload.as_of_date

    try:
        bundle = await load_phase2_engine_bundle(
            db,
            template_id=payload.template_id,
            as_of=as_of,
            current_user=current_user,
        )
    except ValueError as e:
        msg = str(e)
        code = 409 if "closed history" in msg.lower() or "publish" in msg.lower() else 404
        raise HTTPException(status_code=code, detail=msg)

    template_version_id = bundle.get("template_version_id")
    resolved_versions_meta = bundle.get("resolved_versions")
    resolved_dag_meta = bundle.get("resolved_dag")
    template_components = bundle["template_components"]
    component_map_by_id = bundle["component_map_by_id"]
    derived_dicts = bundle["derived_variables"]
    template_groups = bundle["template_groups"]
    group_items_by_group_id = bundle["group_items_by_group_id"]
    statutory_cfg_by_code = bundle["statutory_cfg_by_code"]

    overrides = payload.overrides or {}
    wage_pf: Decimal | None = None
    att_breakdown: dict | None = None
    if payload.employee_id:
        stored = await get_employee_overrides_for_preview(db, payload.employee_id, payload.template_id, current_user)
        overrides = {**(stored or {}), **(payload.overrides or {})}

    if payload.pay_period_id is not None and payload.employee_id is not None:
        org_id = _org_id(current_user)
        if not org_id:
            raise HTTPException(status_code=400, detail="Organisation scope required for pay-period attendance merge")
        try:
            overrides, wage_pf, att_breakdown = await merge_pay_period_attendance_overrides(
                db,
                org_id,
                payload.employee_id,
                payload.pay_period_id,
                overrides,
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e

    tmpl_meta = dict(bundle.get("template_engine_meta") or {})

    payroll_cfg: dict[str, Any] = {}
    org_id = _org_id(current_user)
    if org_id:
        org_row = await db.execute(select(Organisation).where(Organisation.organisation_id == org_id))
        org = org_row.scalar_one_or_none()
        payroll_cfg = ((org.hr_settings or {}) if org else {}).get("payroll") or {}

    res = preview_salary_v2(
        as_of=as_of,
        ctc=Decimal(str(payload.ctc)),
        template_components=template_components,
        component_map_by_id=component_map_by_id,
        derived_variables=derived_dicts,
        template_groups=template_groups,
        group_items_by_group_id=group_items_by_group_id,
        statutory_cfg_by_code=statutory_cfg_by_code,
        employee_overrides=overrides,
        wage_proration_factor=wage_pf,
        template_engine_meta=tmpl_meta or None,
        payroll_cfg=payroll_cfg,
    )
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    try:
        import json as _json
        import logging

        log_payload = {
            "event": "salary_v2_preview",
            "trace_id": trace_id,
            "org_id": str(_org_id(current_user)),
            "template_id": str(payload.template_id),
            "as_of_date": str(as_of),
            "elapsed_ms": elapsed_ms,
            "lines": len(res.lines or []),
            "errors": len(res.errors or []),
            "template_version_id": str(template_version_id) if template_version_id else None,
            "template_components": len(template_components),
            "derived_variables": len(derived_dicts),
            "template_groups": len(template_groups) if isinstance(template_groups, list) else 0,
        }
        logging.getLogger("payroll.salary_v2").info(_json.dumps(log_payload, separators=(",", ":")))
    except Exception:
        pass
    if response is not None:
        response.headers["x-preview-trace-id"] = trace_id

    preview_audit = None
    include_audit = payload.include_engine_audit or (
        wage_pf is not None and wage_pf < Decimal("1")
    )
    if include_audit:
        preview_audit = {
            "pay_period_id": str(payload.pay_period_id) if payload.pay_period_id else None,
            "attendance_merged": bool(payload.pay_period_id and payload.employee_id),
            "wage_proration_factor": float(wage_pf) if wage_pf is not None else None,
            "template_prorate_with_attendance": bool(tmpl_meta.get("prorate_with_attendance")),
            "attendance_breakdown": att_breakdown if payload.pay_period_id and payload.employee_id else None,
        }
        if res.proration_audit:
            preview_audit = {**preview_audit, **res.proration_audit}
        elif preview_audit.get("wage_proration_factor") is not None and preview_audit["wage_proration_factor"] < 1:
            preview_audit["attendance_proration_suppressed_reason"] = (
                "Wage factor is below 1 but no earning lines were prorated. "
                "Check template prorate_with_attendance and component attendance_proratable flags."
            )

    preview_body = SalaryPreviewResponse(
        as_of_date=as_of,
        template_id=payload.template_id,
        ctc=float(payload.ctc),
        trace_id=trace_id,
        template_version_id=template_version_id,
        resolved_versions=(resolved_versions_meta if payload.include_versions else None),
        template_engine_meta=tmpl_meta if tmpl_meta else None,
        preview_audit=preview_audit,
        variables={k: float(v) for k, v in (res.variables or {}).items()},
        lines=[
            {
                "component_id": ln.component_id,
                "component_code": ln.component_code,
                "name": ln.name,
                "category": ln.category,
                "amount": float(ln.amount),
                "source": ln.source,
                "breakdown": ln.breakdown,
            }
            for ln in res.lines
        ],
        totals={k: float(v) for k, v in (res.totals or {}).items()},
        errors=res.errors or [],
    )

    if payload.save_snapshot:
        snap_result = preview_body.model_dump(mode="json")
        snap_result.pop("trace_id", None)
        await save_preview_snapshot(
            db,
            trace_id=trace_id,
            organisation_id=_org_id(current_user),
            template_id=payload.template_id,
            template_version_id=template_version_id,
            as_of=as_of,
            ctc=Decimal(str(payload.ctc)),
            employee_id=payload.employee_id,
            overrides=dict(payload.overrides or {}),
            resolved_versions=resolved_versions_meta or {},
            resolved_dag=resolved_dag_meta or {},
            result=snap_result,
            created_by_user_id=_user_id(current_user),
        )

    return preview_body


# ------------------------------------------------------------------
# Publish configuration versions (effective-dated snapshots)
# ------------------------------------------------------------------
@router.post(
    "/components/{component_id}/versions",
    response_model=PublishedSalaryComponentVersionOut,
    status_code=status.HTTP_201_CREATED,
)
async def v2_publish_component_version(
    component_id: UUID,
    payload: SalaryVersionPublishBody,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        row = await publish_component_version(
            db,
            component_id=component_id,
            effective_from=payload.effective_from,
            current_user=current_user,
            created_by_user_id=_user_id(current_user),
        )
        return PublishedSalaryComponentVersionOut(
            version_id=row.version_id,
            component_id=row.component_id,
            effective_from=row.effective_from,
            effective_to=row.effective_to,
        )
    except ValueError as e:
        raise _http400(str(e))


@router.post(
    "/derived-variables/{variable_id}/versions",
    response_model=PublishedSalaryDerivedVariableVersionOut,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/derived-vars/{variable_id}/versions",
    response_model=PublishedSalaryDerivedVariableVersionOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def v2_publish_derived_variable_version(
    variable_id: UUID,
    payload: SalaryVersionPublishBody,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        row = await publish_derived_variable_version(
            db,
            variable_id=variable_id,
            effective_from=payload.effective_from,
            current_user=current_user,
            created_by_user_id=_user_id(current_user),
        )
        return PublishedSalaryDerivedVariableVersionOut(
            version_id=row.version_id,
            variable_id=row.variable_id,
            effective_from=row.effective_from,
            effective_to=row.effective_to,
        )
    except ValueError as e:
        raise _http400(str(e))


@router.post(
    "/component-groups/{group_id}/versions",
    response_model=PublishedSalaryGroupVersionOut,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/groups/{group_id}/versions",
    response_model=PublishedSalaryGroupVersionOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def v2_publish_group_version(
    group_id: UUID,
    payload: SalaryVersionPublishBody,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        row = await publish_group_version(
            db,
            group_id=group_id,
            effective_from=payload.effective_from,
            current_user=current_user,
            created_by_user_id=_user_id(current_user),
        )
        return PublishedSalaryGroupVersionOut(
            group_version_id=row.group_version_id,
            group_id=row.group_id,
            effective_from=row.effective_from,
            effective_to=row.effective_to,
        )
    except ValueError as e:
        raise _http400(str(e))


@router.post(
    "/templates/{template_id}/versions",
    response_model=PublishedSalaryTemplateVersionOut,
    status_code=status.HTTP_201_CREATED,
)
async def v2_publish_template_version(
    template_id: UUID,
    payload: SalaryTemplateVersionPublishBody,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        row = await publish_template_version(
            db,
            template_id=template_id,
            effective_from=payload.effective_from,
            current_user=current_user,
            label=payload.label,
            created_by_user_id=_user_id(current_user),
            version_engine_meta_patch=payload.engine_meta,
        )
        return PublishedSalaryTemplateVersionOut(
            template_version_id=row.template_version_id,
            template_id=row.template_id,
            effective_from=row.effective_from,
            effective_to=row.effective_to,
            label=row.label,
        )
    except ValueError as e:
        raise _http400(str(e))


# ------------------------------------------------------------------
# Employee overrides (helper endpoint for v2 preview workflows)
# ------------------------------------------------------------------
@router.put("/employee-salary-structures/{employee_salary_structure_id}/overrides")
async def v2_update_employee_overrides(
    employee_salary_structure_id: UUID,
    payload: EmployeeSalaryStructureOverridesUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    obj = await update_employee_salary_overrides(db, employee_salary_structure_id, payload.overrides, current_user)
    if not obj:
        raise HTTPException(status_code=404, detail="Employee salary structure not found")
    return {"ok": True, "employee_salary_structure_id": str(employee_salary_structure_id)}

