"""Dynamic label resolution for WF module."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import LabelMaster, OrganizationLabel, OrganisationAttendanceProfile, TerminologyPack


async def resolve_org_labels(
    db: AsyncSession,
    organisation_id: UUID,
    locale: str = "en",
) -> tuple[dict[str, str], int]:
    """Return merged label map and version for cache invalidation."""
    profile = await db.get(OrganisationAttendanceProfile, organisation_id)
    version = profile.label_version if profile else 1

    master_q = await db.execute(select(LabelMaster))
    labels: dict[str, str] = {}
    for row in master_q.scalars().all():
        if locale == "hi" and row.default_hi:
            labels[row.label_key] = row.default_hi
        else:
            labels[row.label_key] = row.default_en

    if profile and profile.terminology_pack_code:
        pack = await db.get(TerminologyPack, profile.terminology_pack_code)
        if pack and pack.labels_json:
            for k, v in pack.labels_json.items():
                if isinstance(v, str):
                    labels[k] = v

    org_q = await db.execute(
        select(OrganizationLabel).where(
            OrganizationLabel.organisation_id == organisation_id,
            OrganizationLabel.locale == locale,
        )
    )
    for ol in org_q.scalars().all():
        labels[ol.label_key] = ol.value

    return labels, version


async def upsert_org_labels(
    db: AsyncSession,
    organisation_id: UUID,
    items: list[dict],
    updated_by: UUID | None,
) -> int:
    profile = await db.get(OrganisationAttendanceProfile, organisation_id)
    if not profile:
        from services.wf_profile_service import ensure_attendance_profile

        profile = await ensure_attendance_profile(db, organisation_id)

    updated = 0
    for item in items:
        key = item["label_key"]
        locale = item.get("locale", "en")
        value = item["value"]
        q = await db.execute(
            select(OrganizationLabel).where(
                OrganizationLabel.organisation_id == organisation_id,
                OrganizationLabel.label_key == key,
                OrganizationLabel.locale == locale,
            )
        )
        row = q.scalar_one_or_none()
        if row:
            row.value = value
            row.updated_by = updated_by
            row.version = row.version + 1
        else:
            db.add(
                OrganizationLabel(
                    organisation_id=organisation_id,
                    label_key=key,
                    locale=locale,
                    value=value,
                    updated_by=updated_by,
                )
            )
        updated += 1

    profile.label_version = profile.label_version + 1
    await db.commit()
    return updated
