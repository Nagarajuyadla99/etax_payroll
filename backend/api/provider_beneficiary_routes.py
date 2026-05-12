from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.provider_models import ProviderBeneficiary
from providers.registry import get_provider
from services.provider_beneficiary_service import ensure_provider_beneficiary
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.idempotency import idempotent_execute, require_idempotency_key
from utils.rbac import require_roles


router = APIRouter(prefix="/providers", tags=["Providers"])


@router.post(
    "/beneficiaries/provision",
    status_code=status.HTTP_201_CREATED,
)
async def provision_beneficiary(
    request: Request,
    employee_bank_account_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
    idempotency_key: str = Depends(require_idempotency_key),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    provider = get_provider()

    async def _exec():
        async with db.begin():
            pb = await ensure_provider_beneficiary(
                db,
                organisation_id=org_id,
                provider=provider,
                employee_bank_account_id=employee_bank_account_id,
            )
        return 201, {"ok": True, "provider": provider.provider_code, "provider_ref": pb.provider_ref}

    status_code, payload = await idempotent_execute(
        request=request,
        db=db,
        idempotency_key=idempotency_key,
        endpoint="provision_beneficiary",
        body={"employee_bank_account_id": str(employee_bank_account_id), "provider": provider.provider_code},
        exec_fn=_exec,
    )
    return payload


@router.get("/beneficiaries/{employee_bank_account_id}")
async def beneficiary_status(
    employee_bank_account_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    provider = get_provider()

    res = await db.execute(
        select(ProviderBeneficiary).where(
            ProviderBeneficiary.organisation_id == org_id,
            ProviderBeneficiary.provider_code == provider.provider_code,
            ProviderBeneficiary.employee_bank_account_id == employee_bank_account_id,
        )
    )
    pb = res.scalar_one_or_none()
    if not pb:
        return {"ok": False, "status": "missing"}
    return {
        "ok": True,
        "status": pb.sync_status,
        "verification_status": pb.verification_status,
        "provider": pb.provider_code,
        "provider_ref": pb.provider_ref,
        "updated_at": pb.updated_at,
    }

