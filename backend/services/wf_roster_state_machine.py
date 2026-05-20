"""Roster plan state machine — enterprise lifecycle."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import WfRosterPlan
from models.wf_enterprise_models import (
    ROSTER_APPROVED,
    ROSTER_ARCHIVED,
    ROSTER_DRAFT,
    ROSTER_FROZEN,
    ROSTER_PENDING_APPROVAL,
    ROSTER_PUBLISHED,
    ROSTER_TRANSITIONS,
    WfRosterStateLog,
    WF_EVENT_ROSTER_PUBLISHED,
)
from services.wf_event_bus import publish_wf_domain_event


def can_transition(current: str, target: str) -> bool:
    return target in ROSTER_TRANSITIONS.get(current, set())


async def transition_roster(
    db: AsyncSession,
    plan: WfRosterPlan,
    target_status: str,
    *,
    actor_id: UUID | None = None,
    notes: str | None = None,
) -> WfRosterPlan:
    current = plan.status or ROSTER_DRAFT
    if not can_transition(current, target_status):
        raise ValueError(f"Invalid roster transition: {current} -> {target_status}")

    db.add(
        WfRosterStateLog(
            roster_plan_id=plan.roster_plan_id,
            from_status=current,
            to_status=target_status,
            actor_id=actor_id,
            notes=notes,
        )
    )
    plan.status = target_status
    now = datetime.now(timezone.utc)

    if target_status == ROSTER_PUBLISHED:
        plan.published_at = now
        plan.version = (plan.version or 1) + 1
        await publish_wf_domain_event(
            db,
            plan.organisation_id,
            WF_EVENT_ROSTER_PUBLISHED,
            {"roster_plan_id": str(plan.roster_plan_id), "version": plan.version},
            dedupe_key=f"roster:{plan.roster_plan_id}:v{plan.version}",
        )
    elif target_status == ROSTER_FROZEN:
        plan.frozen_at = now
    elif target_status == ROSTER_ARCHIVED:
        plan.frozen_at = plan.frozen_at or now

    await db.commit()
    await db.refresh(plan)
    return plan


async def submit_for_approval(db: AsyncSession, organisation_id: UUID, roster_plan_id: UUID, actor_id: UUID | None):
    plan = await db.get(WfRosterPlan, roster_plan_id)
    if not plan or plan.organisation_id != organisation_id:
        raise ValueError("Roster not found")
    return await transition_roster(db, plan, ROSTER_PENDING_APPROVAL, actor_id=actor_id)


async def approve_roster(db: AsyncSession, organisation_id: UUID, roster_plan_id: UUID, actor_id: UUID | None):
    plan = await db.get(WfRosterPlan, roster_plan_id)
    if not plan or plan.organisation_id != organisation_id:
        raise ValueError("Roster not found")
    return await transition_roster(db, plan, ROSTER_APPROVED, actor_id=actor_id)


async def publish_roster_sm(db: AsyncSession, organisation_id: UUID, roster_plan_id: UUID, actor_id: UUID | None):
    plan = await db.get(WfRosterPlan, roster_plan_id)
    if not plan or plan.organisation_id != organisation_id:
        raise ValueError("Roster not found")
    return await transition_roster(db, plan, ROSTER_PUBLISHED, actor_id=actor_id)


async def freeze_roster_sm(db: AsyncSession, organisation_id: UUID, roster_plan_id: UUID, actor_id: UUID | None):
    plan = await db.get(WfRosterPlan, roster_plan_id)
    if not plan or plan.organisation_id != organisation_id:
        raise ValueError("Roster not found")
    return await transition_roster(db, plan, ROSTER_FROZEN, actor_id=actor_id)


async def archive_roster(db: AsyncSession, organisation_id: UUID, roster_plan_id: UUID, actor_id: UUID | None):
    plan = await db.get(WfRosterPlan, roster_plan_id)
    if not plan or plan.organisation_id != organisation_id:
        raise ValueError("Roster not found")
    return await transition_roster(db, plan, ROSTER_ARCHIVED, actor_id=actor_id)
