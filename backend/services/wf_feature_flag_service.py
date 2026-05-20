"""Organisation feature flag resolution."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import FeatureFlag, OrganizationFeatureFlag


async def is_feature_enabled(
    db: AsyncSession,
    organisation_id: UUID,
    flag_code: str,
) -> bool:
    org_flag_q = await db.execute(
        select(OrganizationFeatureFlag).where(
            OrganizationFeatureFlag.organisation_id == organisation_id,
            OrganizationFeatureFlag.flag_code == flag_code,
        )
    )
    org_flag = org_flag_q.scalar_one_or_none()
    if org_flag is not None:
        return bool(org_flag.enabled)

    master = await db.get(FeatureFlag, flag_code)
    return bool(master.default_enabled) if master else False


async def list_org_flags(db: AsyncSession, organisation_id: UUID) -> list[dict]:
    master_q = await db.execute(select(FeatureFlag))
    masters = {f.flag_code: f for f in master_q.scalars().all()}

    org_q = await db.execute(
        select(OrganizationFeatureFlag).where(
            OrganizationFeatureFlag.organisation_id == organisation_id
        )
    )
    org_map = {o.flag_code: o for o in org_q.scalars().all()}

    out = []
    for code, master in masters.items():
        org = org_map.get(code)
        out.append(
            {
                "flag_code": code,
                "description": master.description,
                "enabled": org.enabled if org else master.default_enabled,
                "config_json": org.config_json if org else {},
            }
        )
    return out


async def set_org_flag(
    db: AsyncSession,
    organisation_id: UUID,
    flag_code: str,
    enabled: bool,
    config_json: dict | None = None,
) -> OrganizationFeatureFlag:
    master = await db.get(FeatureFlag, flag_code)
    if not master:
        raise ValueError(f"Unknown feature flag: {flag_code}")

    q = await db.execute(
        select(OrganizationFeatureFlag).where(
            OrganizationFeatureFlag.organisation_id == organisation_id,
            OrganizationFeatureFlag.flag_code == flag_code,
        )
    )
    row = q.scalar_one_or_none()
    if row:
        row.enabled = enabled
        if config_json is not None:
            row.config_json = config_json
        row.enabled_at = datetime.now(timezone.utc) if enabled else None
    else:
        row = OrganizationFeatureFlag(
            organisation_id=organisation_id,
            flag_code=flag_code,
            enabled=enabled,
            config_json=config_json or {},
            enabled_at=datetime.now(timezone.utc) if enabled else None,
        )
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return row
