"""CRUD for organisation_holidays (existing table)."""

from __future__ import annotations

from datetime import date
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attendance_models import OrganisationHoliday
from schemas.wf_schemas import HolidayCreate, HolidayUpdate


async def list_holidays(
    db: AsyncSession,
    organisation_id: UUID,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> List[OrganisationHoliday]:
    q = select(OrganisationHoliday).where(
        OrganisationHoliday.organisation_id == organisation_id
    )
    if from_date:
        q = q.where(OrganisationHoliday.holiday_date >= from_date)
    if to_date:
        q = q.where(OrganisationHoliday.holiday_date <= to_date)
    q = q.order_by(OrganisationHoliday.holiday_date.asc())
    res = await db.execute(q)
    return list(res.scalars().all())


async def create_holiday(
    db: AsyncSession,
    organisation_id: UUID,
    payload: HolidayCreate,
) -> OrganisationHoliday:
    row = OrganisationHoliday(
        organisation_id=organisation_id,
        holiday_date=payload.holiday_date,
        name=payload.name,
        is_optional=payload.is_optional,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def update_holiday(
    db: AsyncSession,
    holiday_id: UUID,
    organisation_id: UUID,
    payload: HolidayUpdate,
) -> Optional[OrganisationHoliday]:
    q = await db.execute(
        select(OrganisationHoliday).where(
            OrganisationHoliday.holiday_id == holiday_id,
            OrganisationHoliday.organisation_id == organisation_id,
        )
    )
    row = q.scalar_one_or_none()
    if not row:
        return None
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return row


async def delete_holiday(
    db: AsyncSession,
    holiday_id: UUID,
    organisation_id: UUID,
) -> bool:
    q = await db.execute(
        select(OrganisationHoliday).where(
            OrganisationHoliday.holiday_id == holiday_id,
            OrganisationHoliday.organisation_id == organisation_id,
        )
    )
    row = q.scalar_one_or_none()
    if not row:
        return False
    await db.delete(row)
    await db.commit()
    return True
