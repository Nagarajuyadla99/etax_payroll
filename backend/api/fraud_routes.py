from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.fraud_models import FraudAlert, FraudRule
from schemas.fraud_schemas import FraudAlertOut, FraudAlertStatusUpdate, FraudRuleOut, FraudRuleUpsert
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.rbac import require_roles
from utils.tenant_guard import require_same_org


router = APIRouter(prefix="/fraud", tags=["Fraud & Risk"])


@router.get("/alerts", response_model=list[FraudAlertOut])
async def list_alerts(
    status_filter: str | None = None,
    severity: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    q = select(FraudAlert).where(FraudAlert.organisation_id == org_id).order_by(FraudAlert.created_at.desc())
    if status_filter:
        q = q.where(FraudAlert.status == status_filter)
    if severity:
        q = q.where(FraudAlert.severity == severity)

    res = await db.execute(q)
    return list(res.scalars().all())


@router.get("/alerts/{alert_id}", response_model=FraudAlertOut)
async def get_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    a = await db.get(FraudAlert, alert_id)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    require_same_org(org_id=org_id, resource_org_id=a.organisation_id, not_found_msg="Alert not found")
    return a


@router.patch("/alerts/{alert_id}", response_model=FraudAlertOut)
async def update_alert_status(
    alert_id: UUID,
    data: FraudAlertStatusUpdate,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    a = await db.get(FraudAlert, alert_id)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    require_same_org(org_id=org_id, resource_org_id=a.organisation_id, not_found_msg="Alert not found")

    if data.status not in {"open", "ack", "resolved", "ignored"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    from datetime import datetime, timezone

    async with db.begin():
        a.status = data.status
        if data.status == "ack":
            a.acknowledged_at = datetime.now(tz=timezone.utc)
            a.acknowledged_by = getattr(auth.principal, "user_id", None)
        if data.status in {"resolved", "ignored"}:
            a.resolved_at = datetime.now(tz=timezone.utc)
            a.resolved_by = getattr(auth.principal, "user_id", None)
            a.resolution_note = data.resolution_note

    await db.refresh(a)
    return a


@router.get("/rules", response_model=list[FraudRuleOut])
async def list_rules(
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    res = await db.execute(select(FraudRule).where(FraudRule.organisation_id == org_id).order_by(FraudRule.code.asc()))
    return list(res.scalars().all())


@router.post("/rules", response_model=FraudRuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(
    data: FraudRuleUpsert,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    async with db.begin():
        # prevent duplicates
        exists = await db.execute(
            select(FraudRule).where(FraudRule.organisation_id == org_id, FraudRule.code == data.code)
        )
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Rule code already exists")
        r = FraudRule(
            organisation_id=org_id,
            code=data.code,
            name=data.name,
            description=data.description,
            severity=data.severity,
            config=data.config,
            is_active=data.is_active,
        )
        db.add(r)
        await db.flush()
        await db.refresh(r)
        return r


@router.put("/rules/{rule_id}", response_model=FraudRuleOut)
async def update_rule(
    rule_id: UUID,
    data: FraudRuleUpsert,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    r = await db.get(FraudRule, rule_id)
    if not r or str(r.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Rule not found")

    async with db.begin():
        r.code = data.code
        r.name = data.name
        r.description = data.description
        r.severity = data.severity
        r.config = data.config
        r.is_active = data.is_active

    await db.refresh(r)
    return r

