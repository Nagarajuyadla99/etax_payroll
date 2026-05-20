"""
Enterprise shift engine: templates, segments, cross-midnight, overlap, fatigue.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import WfRosterAssignment, WfShift, WfShiftTemplate
from models.wf_enterprise_models import WfShiftSegment


@dataclass
class ShiftWindow:
    shift_id: UUID | None
    template_id: UUID | None
    name: str
    start_dt: datetime
    end_dt: datetime
    cross_midnight: bool
    segments: list[dict[str, Any]] = field(default_factory=list)
    is_standby: bool = False
    is_on_call: bool = False


def _parse_hhmm_on_date(d: date, hhmm: str) -> datetime:
    h, m = map(int, hhmm.split(":")[:2])
    return datetime.combine(d, time(h, m), tzinfo=timezone.utc)


def build_shift_window(
    work_date: date,
    *,
    start_time: str,
    end_time: str,
    cross_midnight: bool = False,
    segments: list[dict] | None = None,
) -> ShiftWindow:
    start_dt = _parse_hhmm_on_date(work_date, start_time)
    end_date = work_date
    if cross_midnight or end_time <= start_time:
        end_date = work_date + timedelta(days=1)
    end_dt = _parse_hhmm_on_date(end_date, end_time)
    segs = segments or []
    return ShiftWindow(
        shift_id=None,
        template_id=None,
        name="shift",
        start_dt=start_dt,
        end_dt=end_dt,
        cross_midnight=cross_midnight or end_dt.date() > work_date,
        segments=segs,
        is_standby=any(s.get("is_standby") for s in segs),
        is_on_call=any(s.get("is_on_call") for s in segs),
    )


def resolve_overlap(windows: list[ShiftWindow]) -> list[ShiftWindow]:
    """Keep higher-priority (later start) window on overlap — deterministic."""
    if len(windows) <= 1:
        return windows
    sorted_w = sorted(windows, key=lambda w: w.start_dt)
    out: list[ShiftWindow] = []
    for w in sorted_w:
        if not out:
            out.append(w)
            continue
        prev = out[-1]
        if w.start_dt < prev.end_dt:
            continue
        out.append(w)
    return out


def check_fatigue(
    windows: list[ShiftWindow],
    *,
    min_rest_hours: float = 11.0,
) -> list[str]:
    warnings: list[str] = []
    ordered = sorted(windows, key=lambda x: x.start_dt)
    for i in range(1, len(ordered)):
        gap_h = (ordered[i].start_dt - ordered[i - 1].end_dt).total_seconds() / 3600
        if gap_h < min_rest_hours:
            warnings.append(f"fatigue_rest_violation: {gap_h:.1f}h < {min_rest_hours}h")
    return warnings


def net_work_minutes(window: ShiftWindow, punch_in: datetime | None, punch_out: datetime | None) -> int:
    if not punch_in or not punch_out:
        return 0
    start = max(punch_in, window.start_dt)
    end = min(punch_out, window.end_dt)
    if end <= start:
        return 0
    total = int((end - start).total_seconds() / 60)
    for seg in window.segments:
        total -= int(seg.get("break_after_minutes") or 0)
    return max(0, total)


async def match_shift_for_day(
    db: AsyncSession,
    organisation_id: UUID,
    employee_id: UUID,
    work_date: date,
) -> ShiftWindow | None:
    """Match roster assignment or org default template."""
    q = await db.execute(
        select(WfRosterAssignment, WfShift, WfShiftTemplate)
        .outerjoin(WfShift, WfRosterAssignment.shift_id == WfShift.shift_id)
        .outerjoin(WfShiftTemplate, WfShift.template_id == WfShiftTemplate.template_id)
        .where(
            WfRosterAssignment.organisation_id == organisation_id,
            WfRosterAssignment.employee_id == employee_id,
            WfRosterAssignment.work_date == work_date,
        )
        .limit(1)
    )
    row = q.first()
    if row:
        assign, shift, tmpl = row
        if shift:
            seg_q = await db.execute(
                select(WfShiftSegment).where(WfShiftSegment.shift_id == shift.shift_id).order_by(
                    WfShiftSegment.segment_index.asc()
                )
            )
            segs = [
                {
                    "start_time": s.start_time,
                    "end_time": s.end_time,
                    "break_after_minutes": s.break_after_minutes,
                    "break_paid": s.break_paid,
                    "is_standby": s.is_standby,
                    "is_on_call": s.is_on_call,
                }
                for s in seg_q.scalars().all()
            ]
            cross = tmpl.cross_midnight if tmpl else shift.end_time <= shift.start_time
            return build_shift_window(
                work_date,
                start_time=shift.start_time,
                end_time=shift.end_time,
                cross_midnight=cross,
                segments=segs,
            )
    tmpl_q = await db.execute(
        select(WfShiftTemplate)
        .where(
            WfShiftTemplate.organisation_id == organisation_id,
            WfShiftTemplate.is_active.is_(True),
        )
        .limit(1)
    )
    tmpl = tmpl_q.scalar_one_or_none()
    if tmpl and tmpl.start_time and tmpl.end_time:
        return build_shift_window(
            work_date,
            start_time=tmpl.start_time,
            end_time=tmpl.end_time,
            cross_midnight=tmpl.cross_midnight,
            segments=(tmpl.config_json or {}).get("segments", []),
        )
    return None
