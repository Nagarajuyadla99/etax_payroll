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

from models.attendance_models import Attendance, Leave, OrganisationHoliday
from models.org_models import Organisation
from models.payroll_models import PayPeriod
from services.payroll_attendance_calculator import (
    accumulate_attendance_row,
    empty_attendance_bucket,
    merge_payroll_cfg,
    prepare_employee_attendance_bucket,
)


async def _load_org_calendar(
    db: AsyncSession,
    organisation_id: UUID,
    start: date,
    end: date,
) -> tuple[frozenset[date], frozenset[int], dict[str, Any]]:
    org_r = await db.execute(select(Organisation).where(Organisation.organisation_id == organisation_id))
    org = org_r.scalar_one_or_none()
    hr_settings = (org.hr_settings or {}) if org else {}
    payroll_cfg = hr_settings.get("payroll") or {}
    att = hr_settings.get("attendance") or {}
    raw_wo = att.get("week_off_weekdays") or []
    try:
        week_off_weekdays = frozenset(int(x) for x in raw_wo)
    except (TypeError, ValueError):
        week_off_weekdays = frozenset()
    hol_q = await db.execute(
        select(OrganisationHoliday.holiday_date).where(
            OrganisationHoliday.organisation_id == organisation_id,
            OrganisationHoliday.holiday_date >= start,
            OrganisationHoliday.holiday_date <= end,
        )
    )
    org_holidays = frozenset(row[0] for row in hol_q.all())
    return org_holidays, week_off_weekdays, payroll_cfg


async def aggregate_attendance_leave_units(
    db: AsyncSession,
    organisation_id: UUID,
    start: date,
    end: date,
    *,
    payroll_cfg: dict[str, Any] | None = None,
) -> Tuple[Dict[UUID, Dict[str, Decimal]], List[Attendance]]:
    """
    Returns (per_employee aggregates, raw attendance rows in range).
    """
    cfg = merge_payroll_cfg(payroll_cfg)

    att_q = await db.execute(
        select(Attendance).where(
            Attendance.organisation_id == organisation_id,
            Attendance.work_date >= start,
            Attendance.work_date <= end,
        )
    )
    rows: List[Attendance] = list(att_q.scalars().all())

    agg: Dict[UUID, Dict[str, Decimal]] = defaultdict(empty_attendance_bucket)

    for a in rows:
        emp = a.employee_id
        if emp not in agg:
            agg[emp] = empty_attendance_bucket()
        accumulate_attendance_row(
            agg[emp],
            status=a.status,
            day_fraction=a.day_fraction if a.day_fraction is not None else Decimal("1"),
            payroll_cfg=cfg,
            work_hours=float(a.work_hours) if a.work_hours is not None else None,
        )

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
        if lv.employee_id not in agg:
            agg[lv.employee_id] = empty_attendance_bucket()
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

    org_holidays, week_off_weekdays, payroll_cfg = await _load_org_calendar(db, org_id, start, end)
    agg, rows = await aggregate_attendance_leave_units(db, org_id, start, end, payroll_cfg=payroll_cfg)

    employees_out: List[Dict[str, Any]] = []
    all_emp_ids = set(agg.keys())
    for eid in sorted(all_emp_ids, key=lambda x: str(x)):
        emp_rows = [x for x in rows if x.employee_id == eid]
        bucket, missing = prepare_employee_attendance_bucket(
            base_bucket=agg.get(eid),
            employee_attendance_rows=emp_rows,
            period_start=start,
            period_end=end,
            org_holiday_dates=org_holidays,
            week_off_weekdays=week_off_weekdays,
            payroll_cfg=payroll_cfg,
        )
        employees_out.append(
            {
                "employee_id": str(eid),
                "present_units": float(bucket["present_units"]),
                "absent_units": float(bucket["absent_units"]),
                "half_day_units": float(bucket["half_day_units"]),
                "paid_leave_units": float(bucket["paid_leave_units"]),
                "unpaid_leave_units": float(bucket["unpaid_leave_units"]),
                "leave_on_attendance_units": float(bucket["leave_on_attendance_units"]),
                "holiday_units": float(bucket["holiday_units"]),
                "week_off_units": float(bucket["week_off_units"]),
                "lop_leave_units": float(bucket["lop_leave_units"]),
                "unknown_units": float(bucket["unknown_units"]),
                "missing_attendance_units": float(bucket["missing_attendance_units"]),
                "overtime_units": float(bucket["overtime_units"]),
                "overtime_hours": float(bucket["overtime_hours"]),
                "missing_working_dates": [d.isoformat() for d in missing.missing_dates],
                "recorded_attendance_rows": sum(1 for x in rows if x.employee_id == eid),
            }
        )

    return {
        "pay_period_id": str(pay_period_id),
        "organisation_id": str(org_id),
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "attendance_leave_locked": bool(period.attendance_leave_locked),
        "payroll_settings": merge_payroll_cfg(payroll_cfg),
        "employees": employees_out,
    }
