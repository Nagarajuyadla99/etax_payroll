"""
Read-only aggregation of attendance + approved LOP leave for a pay period.
Also exposes aggregate_attendance_leave_units for payroll LOP integration.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attendance_models import Attendance, Leave
from models.payroll_models import PayPeriod


def _half_day_status(status: str | None) -> bool:
    if not status:
        return False
    s = status.strip().lower()
    return s in ("half_day", "hd")


def _absent_status(status: str | None) -> bool:
    if not status:
        return False
    s = status.strip().lower()
    return s in ("absent", "a")


def _present_like(status: str | None) -> bool:
    if not status:
        return False
    s = status.strip().lower()
    return s in ("present", "p")


def _leave_on_attendance_row(status: str | None) -> bool:
    if not status:
        return False
    s = status.strip().lower()
    return s in ("leave", "l")


def _holiday_status(status: str | None) -> bool:
    if not status:
        return False
    s = status.strip().lower()
    return s in ("holiday", "h")


def _week_off_status(status: str | None) -> bool:
    if not status:
        return False
    s = status.strip().lower()
    return s in ("wo", "week_off")


async def aggregate_attendance_leave_units(
    db: AsyncSession,
    organisation_id: UUID,
    start: date,
    end: date,
) -> Tuple[Dict[UUID, Dict[str, Decimal]], List[Attendance]]:
    """
    Returns (per_employee aggregates, raw attendance rows in range).
    Inner keys: present_units, absent_units, half_day_units, leave_on_attendance_units,
    holiday_units, week_off_units, lop_leave_units.
    """
    att_q = await db.execute(
        select(Attendance).where(
            Attendance.organisation_id == organisation_id,
            Attendance.work_date >= start,
            Attendance.work_date <= end,
        )
    )
    rows: List[Attendance] = list(att_q.scalars().all())

    agg: Dict[UUID, Dict[str, Decimal]] = defaultdict(
        lambda: {
            "present_units": Decimal("0"),
            "absent_units": Decimal("0"),
            "half_day_units": Decimal("0"),
            "leave_on_attendance_units": Decimal("0"),
            "holiday_units": Decimal("0"),
            "week_off_units": Decimal("0"),
            "lop_leave_units": Decimal("0"),
        }
    )

    for a in rows:
        emp = a.employee_id
        frac = a.day_fraction if a.day_fraction is not None else Decimal("1")
        st = a.status

        if _week_off_status(st):
            wu = frac if frac is not None else Decimal("1")
            agg[emp]["week_off_units"] += wu
            continue
        if _holiday_status(st):
            hu = frac if frac is not None else Decimal("1")
            agg[emp]["holiday_units"] += hu
            continue
        if _half_day_status(st):
            agg[emp]["half_day_units"] += frac if frac != Decimal("1") else Decimal("0.5")
            continue
        if _absent_status(st):
            agg[emp]["absent_units"] += frac
            continue
        if _leave_on_attendance_row(st):
            agg[emp]["leave_on_attendance_units"] += frac
            continue
        if _present_like(st):
            agg[emp]["present_units"] += frac
            continue
        agg[emp]["present_units"] += frac

    leave_q = await db.execute(
        select(Leave).where(
            Leave.organisation_id == organisation_id,
            Leave.status == "approved",
            func.upper(func.trim(Leave.leave_type)) == "LOP",
            Leave.start_date <= end,
            Leave.end_date >= start,
            Leave.cancelled_at.is_(None),
        )
    )
    lop_rows: List[Leave] = list(leave_q.scalars().all())

    for lv in lop_rows:
        overlap_start = max(lv.start_date, start)
        overlap_end = min(lv.end_date, end)
        if overlap_start > overlap_end:
            continue
        days = (overlap_end - overlap_start).days + 1
        if lv.days is not None:
            try:
                days_dec = Decimal(str(lv.days))
            except Exception:
                days_dec = Decimal(days)
        else:
            days_dec = Decimal(days)
        agg[lv.employee_id]["lop_leave_units"] += days_dec

    return dict(agg), rows


async def build_pay_period_attendance_summary(
    db: AsyncSession,
    pay_period_id: UUID,
) -> Dict[str, Any]:
    pp = await db.execute(select(PayPeriod).where(PayPeriod.pay_period_id == pay_period_id))
    period = pp.scalar_one_or_none()
    if not period:
        raise ValueError("Pay period not found")

    org_id = period.organisation_id
    start: date = period.start_date
    end: date = period.end_date

    agg, rows = await aggregate_attendance_leave_units(db, org_id, start, end)

    employees_out: List[Dict[str, Any]] = []
    all_emp_ids = set(agg.keys())
    for eid in sorted(all_emp_ids, key=lambda x: str(x)):
        bucket = agg.get(eid, {})
        employees_out.append(
            {
                "employee_id": str(eid),
                "present_units": float(bucket["present_units"]),
                "absent_units": float(bucket["absent_units"]),
                "half_day_units": float(bucket["half_day_units"]),
                "leave_on_attendance_units": float(bucket["leave_on_attendance_units"]),
                "holiday_units": float(bucket["holiday_units"]),
                "week_off_units": float(bucket["week_off_units"]),
                "lop_leave_units": float(bucket["lop_leave_units"]),
                "recorded_attendance_rows": sum(1 for x in rows if x.employee_id == eid),
            }
        )

    return {
        "pay_period_id": str(pay_period_id),
        "organisation_id": str(org_id),
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "attendance_leave_locked": bool(period.attendance_leave_locked),
        "employees": employees_out,
    }
