from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from crud.org_crud import (
    create_organisation,
    get_organisation,
    update_organisation_hr_settings,
)
from services.payroll_attendance_calculator import enterprise_attendance_payroll_settings, merge_payroll_cfg
from database import get_async_db
from schemas.org_schemas import (
    HrSettingsPatch,
    OrganisationCreate,
    OrganisationHrSettingsOut,
    OrganisationOut,
)
from schemas.me_schemas import OrganisationMeSummary
from utils.dependencies import AuthSubject, get_current_auth, resolve_organisation_id
from utils.rbac import require_roles

router = APIRouter()


@router.post(
    "/",
    response_model=OrganisationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_org(
    data: OrganisationCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin"])),
):
    org = await create_organisation(db, data)
    return org


# Static path MUST be registered before /{org_id} or "me" is parsed as a UUID (422).
@router.get(
    "/me",
    response_model=OrganisationMeSummary,
)
async def get_my_org(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
):
    principal = auth.principal
    org_id = resolve_organisation_id(principal, auth.payload)
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organisation context missing for this account",
        )

    org = await get_organisation(db, org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organisation not found",
        )

    return OrganisationMeSummary(
        id=org.organisation_id,
        name=org.name,
        is_setup_complete=bool(org.is_setup_complete),
    )


@router.get(
    "/me/hr-settings",
    response_model=OrganisationHrSettingsOut,
)
async def get_my_org_hr_settings(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation context missing")
    org = await get_organisation(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    hr = org.hr_settings or {}
    return OrganisationHrSettingsOut(
        organisation_id=org.organisation_id,
        hr_settings=hr,
        payroll_settings=merge_payroll_cfg(hr.get("payroll")),
        attendance_settings=hr.get("attendance") or {},
    )


@router.patch(
    "/me/hr-settings",
    response_model=OrganisationHrSettingsOut,
)
async def patch_my_org_hr_settings(
    data: HrSettingsPatch,
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation context missing")
    patch = data.model_dump(exclude_unset=True)
    if not patch:
        raise HTTPException(status_code=400, detail="No settings to update")
    org = await update_organisation_hr_settings(db, org_id, patch)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    hr = org.hr_settings or {}
    return OrganisationHrSettingsOut(
        organisation_id=org.organisation_id,
        hr_settings=hr,
        payroll_settings=merge_payroll_cfg(hr.get("payroll")),
        attendance_settings=hr.get("attendance") or {},
    )


@router.post(
    "/me/hr-settings/enable-attendance-payroll",
    response_model=OrganisationHrSettingsOut,
    summary="Apply enterprise working-day payroll defaults (attendance_units mode)",
)
async def enable_attendance_payroll_defaults(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    """One-click: set payable_days_mode=attendance_units and related payroll flags."""
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation context missing")
    org = await update_organisation_hr_settings(db, org_id, enterprise_attendance_payroll_settings())
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    hr = org.hr_settings or {}
    return OrganisationHrSettingsOut(
        organisation_id=org.organisation_id,
        hr_settings=hr,
        payroll_settings=merge_payroll_cfg(hr.get("payroll")),
        attendance_settings=hr.get("attendance") or {},
    )


@router.get(
    "/{org_id}",
    response_model=OrganisationOut,
)
async def read_org(
    org_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin"])),
):
    org = await get_organisation(db, org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organisation not found",
        )
    return org
