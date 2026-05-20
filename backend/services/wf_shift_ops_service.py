"""Shift engine operations: inheritance, segments, dynamic allocation (requirement P1)."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import WfRosterAssignment, WfRosterPlan, WfShift, WfShiftTemplate
from models.wf_enterprise_models import WfShiftSegment, WfShiftVersion
from services.wf_shift_engine import build_shift_window, resolve_overlap


async def inherit_shift_template(
    db: AsyncSession,
    organisation_id: UUID,
    parent_template_id: UUID,
    *,
    code: str,
    name: str,
    effective_from: date,
    effective_to: date | None = None,
) -> WfShiftTemplate:
    parent = await db.get(WfShiftTemplate, parent_template_id)
    if not parent or parent.organisation_id != organisation_id:
        raise ValueError("Parent shift template not found")

    child = WfShiftTemplate(
        organisation_id=organisation_id,
        code=code,
        name=name,
        shift_type=parent.shift_type,
        start_time=parent.start_time,
        end_time=parent.end_time,
        break_minutes=parent.break_minutes,
        cross_midnight=parent.cross_midnight,
        night_shift=parent.night_shift,
        capacity=parent.capacity,
        config_json=dict(parent.config_json or {}),
        parent_template_id=parent_template_id,
        effective_from=effective_from,
        effective_to=effective_to,
        version=(parent.version or 1) + 1,
    )
    db.add(child)
    await db.flush()

    db.add(
        WfShiftVersion(
            template_id=child.template_id,
            organisation_id=organisation_id,
            parent_template_id=parent_template_id,
            effective_from=effective_from,
            effective_to=effective_to,
            config_snapshot_json={
                "code": code,
                "name": name,
                "inherited_from": str(parent_template_id),
                "config_json": child.config_json,
            },
        )
    )
    await db.flush()
    return child


async def add_shift_segment(
    db: AsyncSession,
    organisation_id: UUID,
    shift_id: UUID,
    *,
    segment_index: int,
    start_time: str,
    end_time: str,
    break_after_minutes: int = 0,
    break_paid: bool = False,
    is_standby: bool = False,
    is_on_call: bool = False,
) -> WfShiftSegment:
    shift = await db.get(WfShift, shift_id)
    if not shift or shift.organisation_id != organisation_id:
        raise ValueError("Shift not found")
    seg = WfShiftSegment(
        shift_id=shift_id,
        segment_index=segment_index,
        start_time=start_time,
        end_time=end_time,
        break_after_minutes=break_after_minutes,
        break_paid=break_paid,
        is_standby=is_standby,
        is_on_call=is_on_call,
    )
    db.add(seg)
    await db.flush()
    return seg


async def list_shift_segments(
    db: AsyncSession,
    organisation_id: UUID,
    shift_id: UUID,
) -> list[WfShiftSegment]:
    shift = await db.get(WfShift, shift_id)
    if not shift or shift.organisation_id != organisation_id:
        raise ValueError("Shift not found")
    res = await db.execute(
        select(WfShiftSegment)
        .where(WfShiftSegment.shift_id == shift_id)
        .order_by(WfShiftSegment.segment_index.asc())
    )
    return list(res.scalars().all())


async def allocate_shift_for_day(
    db: AsyncSession,
    organisation_id: UUID,
    employee_id: UUID,
    work_date: date,
    *,
    roster_plan_id: UUID | None = None,
    template_id: UUID | None = None,
) -> dict[str, Any]:
    """Dynamic shift allocation: roster assignment + overlap-safe window."""
    plan: WfRosterPlan | None = None
    if roster_plan_id:
        plan = await db.get(WfRosterPlan, roster_plan_id)
    else:
        res = await db.execute(
            select(WfRosterPlan)
            .where(
                WfRosterPlan.organisation_id == organisation_id,
                WfRosterPlan.status == "published",
                WfRosterPlan.period_start <= work_date,
                WfRosterPlan.period_end >= work_date,
            )
            .limit(1)
        )
        plan = res.scalar_one_or_none()

    if not plan:
        raise ValueError("No published roster plan for work_date")

    tmpl: WfShiftTemplate | None = None
    if template_id:
        tmpl = await db.get(WfShiftTemplate, template_id)
    else:
        t_res = await db.execute(
            select(WfShiftTemplate)
            .where(
                WfShiftTemplate.organisation_id == organisation_id,
                WfShiftTemplate.is_active.is_(True),
            )
            .order_by(WfShiftTemplate.effective_from.desc().nullslast())
            .limit(1)
        )
        tmpl = t_res.scalar_one_or_none()

    if not tmpl or not tmpl.start_time or not tmpl.end_time:
        raise ValueError("No active shift template to allocate")

    shift = WfShift(
        organisation_id=organisation_id,
        template_id=tmpl.template_id,
        work_date=work_date,
        name=tmpl.name,
        start_time=tmpl.start_time,
        end_time=tmpl.end_time,
    )
    db.add(shift)
    await db.flush()

    existing_q = await db.execute(
        select(WfRosterAssignment).where(
            WfRosterAssignment.organisation_id == organisation_id,
            WfRosterAssignment.employee_id == employee_id,
            WfRosterAssignment.work_date == work_date,
        )
    )
    assign = existing_q.scalar_one_or_none()
    if assign:
        assign.shift_id = shift.shift_id
        assign.roster_plan_id = plan.roster_plan_id
    else:
        assign = WfRosterAssignment(
            roster_plan_id=plan.roster_plan_id,
            organisation_id=organisation_id,
            employee_id=employee_id,
            work_date=work_date,
            shift_id=shift.shift_id,
        )
        db.add(assign)

    window = build_shift_window(
        work_date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        cross_midnight=tmpl.cross_midnight,
        segments=(tmpl.config_json or {}).get("segments", []),
    )
    resolved = resolve_overlap([window])
    await db.flush()
    return {
        "assignment_id": str(assign.assignment_id),
        "shift_id": str(shift.shift_id),
        "roster_plan_id": str(plan.roster_plan_id),
        "shift_window": {
            "cross_midnight": resolved[0].cross_midnight if resolved else False,
            "is_standby": resolved[0].is_standby if resolved else False,
            "is_on_call": resolved[0].is_on_call if resolved else False,
        },
    }
