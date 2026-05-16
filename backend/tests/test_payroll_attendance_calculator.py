"""Unit tests for payroll_attendance_calculator (calendar + attendance_units modes)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from services.payroll_attendance_calculator import (
    CANON_ABSENT,
    CANON_PAID_LEAVE,
    CANON_PRESENT,
    CANON_UNKNOWN,
    MISSING_POLICY_TREAT_ABSENT,
    accumulate_attendance_row,
    apply_missing_attendance_policy_to_bucket,
    compute_missing_working_dates,
    compute_payroll_attendance_scalars,
    compute_total_working_days,
    empty_attendance_bucket,
    merge_payroll_cfg,
    normalize_attendance_status,
    prepare_employee_attendance_bucket,
)
def _period():
    return date(2026, 5, 1), date(2026, 5, 31)


def _bucket(**kwargs) -> dict:
    b = empty_attendance_bucket()
    for k, v in kwargs.items():
        b[k] = Decimal(str(v))
    return b


def test_normalize_status_aliases():
    assert normalize_attendance_status("P") == CANON_PRESENT
    assert normalize_attendance_status("UL") == "unpaid_leave"
    assert normalize_attendance_status(None) == CANON_UNKNOWN
    assert normalize_attendance_status("INVALID_XYZ") == CANON_UNKNOWN


def test_accumulate_unknown_not_present():
    b = empty_attendance_bucket()
    accumulate_attendance_row(b, status="INVALID_XYZ", day_fraction=Decimal("1"))
    assert b["unknown_units"] == Decimal("1")
    assert b["present_units"] == Decimal("0")


def test_calendar_mode_unchanged_semantics():
    start, end = _period()
    bucket = _bucket(present_units=20, absent_units=2, lop_leave_units=1, half_day_units=1)
    cfg = {"payable_days_mode": "calendar", "apply_lop_deduction": True}
    s = compute_payroll_attendance_scalars(
        bucket=bucket, period_start=start, period_end=end, payroll_cfg=cfg
    )
    assert s.payable_days == Decimal("31")
    assert s.lop_units == Decimal("3")
    assert s.wage_proration_factor == Decimal("28") / Decimal("31")


def test_attendance_units_capped_factor():
    start, end = _period()
    bucket = _bucket(
        present_units=18,
        paid_leave_units=2,
        half_day_units=Decimal("0.5"),
        holiday_units=2,
        week_off_units=8,
    )
    cfg = {"payable_days_mode": "attendance_units", "apply_lop_deduction": True}
    s = compute_payroll_attendance_scalars(
        bucket=bucket, period_start=start, period_end=end, payroll_cfg=cfg
    )
    assert s.total_working_days == Decimal("21")
    assert s.payable_days == Decimal("20.5")
    assert s.payable_days <= s.total_working_days
    assert s.wage_proration_factor <= Decimal("1")
    assert s.wage_proration_factor == Decimal("20.5") / Decimal("21")


def test_holidays_weekoffs_not_in_payable():
    start, end = _period()
    bucket = _bucket(present_units=10, holiday_units=5, week_off_units=10)
    cfg = {"payable_days_mode": "attendance_units", "apply_lop_deduction": True}
    s = compute_payroll_attendance_scalars(
        bucket=bucket, period_start=start, period_end=end, payroll_cfg=cfg
    )
    assert s.payable_days == Decimal("10")
    assert s.holiday_units == Decimal("5")
    assert s.week_off_units == Decimal("10")


def test_treat_missing_as_absent():
    start, end = date(2026, 5, 1), date(2026, 5, 22)
    present_dates = [date(2026, 5, d) for d in range(1, 19)]
    emp_rows = [SimpleNamespace(work_date=d, status="P") for d in present_dates]
    bucket = empty_attendance_bucket()
    for _d in present_dates:
        accumulate_attendance_row(bucket, status="P", day_fraction=Decimal("1"))

    bucket, missing = prepare_employee_attendance_bucket(
        base_bucket=bucket,
        employee_attendance_rows=emp_rows,
        period_start=start,
        period_end=end,
        org_holiday_dates=frozenset(),
        week_off_weekdays=frozenset({5, 6}),
        payroll_cfg={"missing_attendance_policy": MISSING_POLICY_TREAT_ABSENT},
    )
    assert missing.missing_units > 0
    assert bucket["absent_units"] >= missing.missing_units

    cfg = {
        "payable_days_mode": "attendance_units",
        "apply_lop_deduction": True,
        "missing_attendance_policy": MISSING_POLICY_TREAT_ABSENT,
    }
    s = compute_payroll_attendance_scalars(
        bucket=bucket,
        period_start=start,
        period_end=end,
        payroll_cfg=cfg,
        missing_working_dates=missing.missing_dates,
    )
    assert s.missing_attendance_units == missing.missing_units
    assert s.lop_units >= missing.missing_units


def test_missing_excludes_weekends_and_holidays():
    start, end = date(2026, 5, 1), date(2026, 5, 7)
    # Only mark Monday 5/4 as present; Sat/Sun should not be missing
    rows = [SimpleNamespace(work_date=date(2026, 5, 4), status="P")]
    missing = compute_missing_working_dates(
        period_start=start,
        period_end=end,
        attendance_work_dates=[date(2026, 5, 4)],
        attendance_status_by_date={date(2026, 5, 4): CANON_PRESENT},
        org_holiday_dates=frozenset({date(2026, 5, 1)}),
        week_off_weekdays=frozenset({5, 6}),
    )
    assert date(2026, 5, 2) not in missing.missing_dates  # Saturday
    assert date(2026, 5, 3) not in missing.missing_dates  # Sunday
    assert date(2026, 5, 1) not in missing.missing_dates  # holiday


def test_compute_total_working_days_roster_placeholder():
    cfg = merge_payroll_cfg({"total_working_days_mode": "roster_based"})
    assert compute_total_working_days(
        calendar_days=Decimal("30"),
        holiday_units=Decimal("2"),
        week_off_units=Decimal("8"),
        payroll_cfg=cfg,
        roster_working_days=Decimal("18"),
    ) == Decimal("18")


def test_payroll_breakdown_payload():
    start, end = _period()
    bucket = _bucket(
        present_units=18,
        paid_leave_units=2,
        half_day_units=Decimal("0.5"),
        absent_units=1,
        missing_attendance_units=1,
        holiday_units=2,
        week_off_units=8,
    )
    s = compute_payroll_attendance_scalars(
        bucket=bucket,
        period_start=start,
        period_end=end,
        payroll_cfg={"payable_days_mode": "attendance_units", "apply_lop_deduction": True},
    )
    bd = s.to_payroll_breakdown()
    assert bd["present_units"] == "18"
    assert bd["missing_attendance_units"] == "1"
    assert "wage_proration_factor" in bd
    assert float(bd["wage_proration_factor"]) <= 1.0


def test_attendance_units_working_days_from_org_calendar():
    """30 calendar days, Sat/Sun off, 2 org holidays → 20 working days."""
    start, end = date(2026, 4, 1), date(2026, 4, 30)
    org_hols = frozenset({date(2026, 4, 14), date(2026, 4, 15)})
    week_off = frozenset({5, 6})
    bucket = _bucket(present_units=15, paid_leave_units=2, half_day_units=Decimal("1.5"))
    cfg = {
        "payable_days_mode": "attendance_units",
        "total_working_days_mode": "calendar_minus_weekoffs_holidays",
        "apply_lop_deduction": True,
    }
    s = compute_payroll_attendance_scalars(
        bucket=bucket,
        period_start=start,
        period_end=end,
        payroll_cfg=cfg,
        org_holiday_dates=org_hols,
        week_off_weekdays=week_off,
    )
    assert s.payable_days_mode == "attendance_units"
    assert s.calendar_days == Decimal("30")
    assert s.total_working_days == Decimal("20")
    assert s.payable_days == Decimal("18.5")
    assert s.wage_proration_factor == Decimal("18.5") / Decimal("20")


def test_overtime_counters_no_salary_fields():
    b = empty_attendance_bucket()
    accumulate_attendance_row(b, status="OT", day_fraction=Decimal("1"), work_hours=3.5)
    assert b["overtime_units"] == Decimal("1")
    assert b["overtime_hours"] == Decimal("3.5")
