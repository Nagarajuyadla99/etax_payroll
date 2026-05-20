"""Roster assignment and publish helpers."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import WfRosterAssignment, WfRosterPlan
from services.wf_domain_event_service import publish_wf_event


async def add_roster_assignments(
    db: AsyncSession,
    organisation_id: UUID,
    roster_plan_id: UUID,
    assignments: Sequence[dict],
) -> int:
    plan = await db.get(WfRosterPlan, roster_plan_id)
    if not plan or plan.organisation_id != organisation_id:
        raise ValueError("Roster plan not found")
    if plan.status == "frozen":
        raise ValueError("Roster plan is frozen")

    count = 0
    for a in assignments:
        row = WfRosterAssignment(
            roster_plan_id=roster_plan_id,
            organisation_id=organisation_id,
            employee_id=a["employee_id"],
            work_date=a["work_date"],
            shift_id=a.get("shift_id"),
        )
        db.add(row)
        count += 1
    await db.flush()
    return count


async def publish_roster_plan(
    db: AsyncSession,
    organisation_id: UUID,
    roster_plan_id: UUID,
    actor_id: UUID | None = None,
) -> WfRosterPlan:
    from services.wf_roster_state_machine import approve_roster, publish_roster_sm

    plan = await db.get(WfRosterPlan, roster_plan_id)
    if not plan or plan.organisation_id != organisation_id:
        raise ValueError("Roster plan not found")
    if plan.status == "draft":
        await approve_roster(db, organisation_id, roster_plan_id, actor_id)
        plan = await db.get(WfRosterPlan, roster_plan_id)
    return await publish_roster_sm(db, organisation_id, roster_plan_id, actor_id)


async def list_roster_assignments(
    db: AsyncSession,
    organisation_id: UUID,
    roster_plan_id: UUID | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[WfRosterAssignment]:
    q = select(WfRosterAssignment).where(WfRosterAssignment.organisation_id == organisation_id)
    if roster_plan_id:
        q = q.where(WfRosterAssignment.roster_plan_id == roster_plan_id)
    if from_date:
        q = q.where(WfRosterAssignment.work_date >= from_date)
    if to_date:
        q = q.where(WfRosterAssignment.work_date <= to_date)
    res = await db.execute(q.order_by(WfRosterAssignment.work_date.asc()))
    return list(res.scalars().all())
