"""Hierarchical freeze: attendance | payroll | financial."""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_enterprise_models import (
    FREEZE_ATTENDANCE,
    FREEZE_FINANCIAL,
    FREEZE_PAYROLL,
    WfFreezeRecord,
    WF_EVENT_ATTENDANCE_LOCKED,
)
from services.wf_event_bus import publish_wf_domain_event


async def is_frozen(
    db: AsyncSession,
    organisation_id: UUID,
    freeze_level: str,
    work_date: date | None = None,
    pay_period_id: UUID | None = None,
) -> bool:
    q = select(WfFreezeRecord.freeze_id).where(
        WfFreezeRecord.organisation_id == organisation_id,
        WfFreezeRecord.freeze_level == freeze_level,
        WfFreezeRecord.is_active.is_(True),
    )
    if pay_period_id:
        q = q.where(WfFreezeRecord.pay_period_id == pay_period_id)
    if work_date:
        q = q.where(
            WfFreezeRecord.range_start <= work_date,
            WfFreezeRecord.range_end >= work_date,
        )
    res = await db.execute(q.limit(1))
    return res.scalar_one_or_none() is not None


async def is_attendance_range_frozen(
    db: AsyncSession,
    organisation_id: UUID,
    range_start: date,
    range_end: date,
) -> bool:
    """True when an active attendance freeze overlaps the given date range."""
    from sqlalchemy import and_, or_

    q = select(WfFreezeRecord.freeze_id).where(
        WfFreezeRecord.organisation_id == organisation_id,
        WfFreezeRecord.freeze_level == FREEZE_ATTENDANCE,
        WfFreezeRecord.is_active.is_(True),
        or_(
            and_(
                WfFreezeRecord.range_start.is_(None),
                WfFreezeRecord.range_end.is_(None),
            ),
            and_(
                WfFreezeRecord.range_start <= range_end,
                WfFreezeRecord.range_end >= range_start,
            ),
        ),
    )
    res = await db.execute(q.limit(1))
    return res.scalar_one_or_none() is not None


async def apply_freeze(
    db: AsyncSession,
    organisation_id: UUID,
    freeze_level: str,
    *,
    range_start: date | None = None,
    range_end: date | None = None,
    pay_period_id: UUID | None = None,
    performed_by: UUID | None = None,
    notes: str | None = None,
    auto_commit: bool = True,
) -> WfFreezeRecord:
    if freeze_level not in (FREEZE_ATTENDANCE, FREEZE_PAYROLL, FREEZE_FINANCIAL):
        raise ValueError("Invalid freeze level")

    row = WfFreezeRecord(
        organisation_id=organisation_id,
        freeze_level=freeze_level,
        pay_period_id=pay_period_id,
        range_start=range_start,
        range_end=range_end,
        is_active=True,
        performed_by=performed_by,
        notes=notes,
    )
    db.add(row)
    await db.flush()

    if freeze_level == FREEZE_ATTENDANCE:
        await publish_wf_domain_event(
            db,
            organisation_id,
            WF_EVENT_ATTENDANCE_LOCKED,
            {
                "freeze_id": str(row.freeze_id),
                "range_start": range_start.isoformat() if range_start else None,
                "range_end": range_end.isoformat() if range_end else None,
            },
            dedupe_key=f"freeze:att:{row.freeze_id}",
        )
    if auto_commit:
        await db.commit()
        await db.refresh(row)
    else:
        await db.flush()
    return row


async def release_freeze(db: AsyncSession, freeze_id: UUID, organisation_id: UUID) -> bool:
    row = await db.get(WfFreezeRecord, freeze_id)
    if not row or row.organisation_id != organisation_id:
        return False
    row.is_active = False
    row.released_at = datetime.now(timezone.utc)
    await db.commit()
    return True
