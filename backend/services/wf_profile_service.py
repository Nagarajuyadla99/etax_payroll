"""Organisation attendance profile & source activation."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import (
    OrganisationAttendanceProfile,
    OrganisationSourceConfig,
    WfAttendanceSourcePlugin,
)

DEFAULT_LEGACY_MODES = ["manual_hr", "excel_upload", "calendar_auto"]


async def ensure_attendance_profile(
    db: AsyncSession,
    organisation_id: UUID,
) -> OrganisationAttendanceProfile:
    profile = await db.get(OrganisationAttendanceProfile, organisation_id)
    if profile:
        return profile
    profile = OrganisationAttendanceProfile(
        organisation_id=organisation_id,
        engine_version="legacy",
        enabled_modes=DEFAULT_LEGACY_MODES,
        default_source="manual_hr",
    )
    db.add(profile)
    await db.flush()
    return profile


async def activate_attendance_ecosystem(
    db: AsyncSession,
    organisation_id: UUID,
    enabled_modes: list[str],
    *,
    default_source: str | None = None,
    terminology_pack_code: str | None = None,
    engine_version: str = "v2",
) -> OrganisationAttendanceProfile:
    profile = await ensure_attendance_profile(db, organisation_id)
    profile.enabled_modes = enabled_modes
    profile.default_source = default_source or (enabled_modes[0] if enabled_modes else "manual_hr")
    profile.terminology_pack_code = terminology_pack_code
    profile.engine_version = engine_version
    profile.updated_at = datetime.now(timezone.utc)

    plugins_q = await db.execute(
        select(WfAttendanceSourcePlugin.source_code).where(
            WfAttendanceSourcePlugin.source_code.in_(enabled_modes)
        )
    )
    valid_codes = {r[0] for r in plugins_q.all()}
    for mode in enabled_modes:
        if mode not in valid_codes:
            continue
        cfg_q = await db.execute(
            select(OrganisationSourceConfig).where(
                OrganisationSourceConfig.organisation_id == organisation_id,
                OrganisationSourceConfig.source_code == mode,
            )
        )
        cfg = cfg_q.scalar_one_or_none()
        if cfg:
            cfg.enabled = True
        else:
            db.add(
                OrganisationSourceConfig(
                    organisation_id=organisation_id,
                    source_code=mode,
                    enabled=True,
                )
            )

    await db.commit()
    await db.refresh(profile)

    if engine_version == "v2":
        try:
            from services.wf_onboarding_service import bootstrap_org_wf_defaults

            await bootstrap_org_wf_defaults(db, organisation_id)
        except Exception:
            pass

    return profile


async def list_enabled_modes(db: AsyncSession, organisation_id: UUID) -> list[str]:
    profile = await ensure_attendance_profile(db, organisation_id)
    return list(profile.enabled_modes or [])
