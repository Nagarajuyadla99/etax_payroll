from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.provider_config_models import BankingProviderConfig, ProviderHealthLog
from services.provider_config_service import (
    check_provider_health,
    upsert_provider_config,
)
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.rbac import require_roles


router = APIRouter(prefix="/banking/providers", tags=["Banking Providers"])


class ProviderConfigUpsert(BaseModel):
    provider_code: str = Field(default="razorpayx", max_length=30)
    key_id: str
    key_secret: str
    source_account: str
    webhook_secret: str | None = None
    base_url: str | None = None
    is_sandbox: bool = True
    is_active: bool = True
    rotate: bool = False


@router.post("/config", status_code=status.HTTP_201_CREATED)
async def upsert_org_provider_config(
    data: ProviderConfigUpsert,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    async with db.begin():
        row = await upsert_provider_config(
            db,
            organisation_id=org_id,
            provider_code=data.provider_code,
            key_id=data.key_id,
            key_secret=data.key_secret,
            source_account=data.source_account,
            webhook_secret=data.webhook_secret,
            base_url=data.base_url,
            is_sandbox=data.is_sandbox,
            is_active=data.is_active,
            rotate=data.rotate,
        )
    return {
        "config_id": str(row.config_id),
        "provider_code": row.provider_code,
        "is_active": row.is_active,
        "is_sandbox": row.is_sandbox,
        "message": "Credentials stored encrypted; secrets are never returned",
    }


@router.get("/config")
async def list_org_provider_configs(
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    res = await db.execute(
        select(BankingProviderConfig).where(BankingProviderConfig.organisation_id == org_id)
    )
    return [
        {
            "config_id": str(c.config_id),
            "provider_code": c.provider_code,
            "is_active": c.is_active,
            "is_sandbox": c.is_sandbox,
            "updated_at": c.updated_at,
        }
        for c in res.scalars().all()
    ]


@router.post("/config/{provider_code}/health")
async def provider_health_check(
    provider_code: str,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    async with db.begin():
        return await check_provider_health(db, organisation_id=org_id, provider_code=provider_code)


@router.get("/config/health-logs")
async def provider_health_logs(
    limit: int = 20,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    res = await db.execute(
        select(ProviderHealthLog)
        .where(ProviderHealthLog.organisation_id == org_id)
        .order_by(ProviderHealthLog.created_at.desc())
        .limit(min(limit, 100))
    )
    return [
        {
            "health_id": str(h.health_id),
            "provider_code": h.provider_code,
            "ok": h.ok,
            "latency_ms": h.latency_ms,
            "error": h.error,
            "created_at": h.created_at,
        }
        for h in res.scalars().all()
    ]
