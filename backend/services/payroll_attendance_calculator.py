"""
Central attendance → payroll scalar logic (calendar default, opt-in attendance_units).

Used by payroll gather, salary preview merge, and attendance summary aggregation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Iterable, Sequence

logger = logging.getLogger(__name__)

# Canonical normalized status tokens (internal)
CANON_PRESENT = "present"
CANON_ABSENT = "absent"
CANON_HALF_DAY = "half_day"
CANON_PAID_LEAVE = "paid_leave"
CANON_UNPAID_LEAVE = "unpaid_leave"
CANON_HOLIDAY = "holiday"
CANON_WEEK_OFF = "week_off"
CANON_UNKNOWN = "unknown"
CANON_OVERTIME = "overtime"

_STATUS_ALIASES: dict[str, str] = {
    "p": CANON_PRESENT,
    "present": CANON_PRESENT,
    "a": CANON_ABSENT,
    "absent": CANON_ABSENT,
    "hd": CANON_HALF_DAY,
    "half_day": CANON_HALF_DAY,
    "halfday": CANON_HALF_DAY,
    "l": CANON_PAID_LEAVE,
    "leave": CANON_PAID_LEAVE,
    "paid_leave": CANON_PAID_LEAVE,
    "ul": CANON_UNPAID_LEAVE,
    "unpaid_leave": CANON_UNPAID_LEAVE,
    "unpaid": CANON_UNPAID_LEAVE,
    "wo": CANON_WEEK_OFF,
    "week_off": CANON_WEEK_OFF,
    "weekoff": CANON_WEEK_OFF,
    "week-off": CANON_WEEK_OFF,
    "h": CANON_HOLIDAY,
    "holiday": CANON_HOLIDAY,
    "ot": CANON_OVERTIME,
    "overtime": CANON_OVERTIME,
}

DEFAULT_PAID_LEAVE_STATUSES = ("l", "leave", "paid_leave")
DEFAULT_UNPAID_LEAVE_STATUSES = ("ul", "unpaid_leave")
MISSING_POLICY_NONE = "none"
MISSING_POLICY_TREAT_ABSENT = "treat_missing_as_absent"

TOTAL_WORKING_MODE_CALENDAR = "calendar"
TOTAL_WORKING_MODE_CAL_MINUS = "calendar_minus_weekoffs_holidays"
TOTAL_WORKING_MODE_ROSTER = "roster_based"  # future — not implemented


def default_payroll_cfg() -> dict[str, Any]:
    return {
        "apply_lop_deduction": True,
        "lop_include_half_day_units": False,
        "payable_days_override": None,
        "payable_days_mode": "calendar",
        "total_working_days_mode": TOTAL_WORKING_MODE_CAL_MINUS,
        "count_holidays_as_payable": True,
        "count_weekoffs_as_payable": True,
        "missing_attendance_policy": MISSING_POLICY_NONE,
        "strict_attendance_validation": False,
        "require_attendance_lock_before_payroll": False,
        "paid_leave_statuses": list(DEFAULT_PAID_LEAVE_STATUSES),
        "unpaid_leave_statuses": list(DEFAULT_UNPAID_LEAVE_STATUSES),
    }


def merge_payroll_cfg(raw: dict[str, Any] | None) -> dict[str, Any]:
    cfg = default_payroll_cfg()
    if raw:
        cfg.update(raw)
    return cfg


def enterprise_attendance_payroll_settings() -> dict[str, Any]:
    """
    Recommended org ``hr_settings`` slice for working-day payroll (attendance_units).
    Merge via ``merge_organisation_hr_settings`` or PATCH ``/organisation/me/hr-settings``.
    """
    return {
        "payroll": {
            "payable_days_mode": "attendance_units",
            "total_working_days_mode": "calendar_minus_weekoffs_holidays",
            "missing_attendance_policy": MISSING_POLICY_TREAT_ABSENT,
            "count_holidays_as_payable": False,
            "count_weekoffs_as_payable": False,
            "apply_lop_deduction": True,
            "prorate_with_attendance": True,
        },
        "attendance": {
            "week_off_weekdays": [5, 6],
        },
    }


def count_period_calendar_non_working(
    *,
    period_start: date,
    period_end: date,
    org_holiday_dates: frozenset[date] | None,
    week_off_weekdays: frozenset[int] | None,
) -> tuple[Decimal, Decimal]:
    """Count org-calendar holidays and configured week-off days in the pay period."""
    hol = org_holiday_dates or frozenset()
    wo = week_off_weekdays or frozenset()
    holiday_days = Decimal("0")
    week_off_days = Decimal("0")
    for d in iter_period_dates(period_start, period_end):
        if d in hol:
            holiday_days += Decimal("1")
        elif d.weekday() in wo:
            week_off_days += Decimal("1")
    return holiday_days, week_off_days


def _norm_status_key(raw: str | None) -> str:
    if raw is None:
        return ""
    return str(raw).strip().lower().replace(" ", "_").replace("-", "_")


def _paid_unpaid_sets(payroll_cfg: dict[str, Any]) -> tuple[frozenset[str], frozenset[str]]:
    paid = {_norm_status_key(x) for x in (payroll_cfg.get("paid_leave_statuses") or DEFAULT_PAID_LEAVE_STATUSES)}
    unpaid = {
        _norm_status_key(x) for x in (payroll_cfg.get("unpaid_leave_statuses") or DEFAULT_UNPAID_LEAVE_STATUSES)
    }
    return frozenset(paid), frozenset(unpaid)


def normalize_attendance_status(
    raw: str | None,
    *,
    payroll_cfg: dict[str, Any] | None = None,
) -> str:
    """Map raw DB/UI status to a canonical token (unknown if unrecognized)."""
    key = _norm_status_key(raw)
    if not key:
        return CANON_UNKNOWN

    cfg = merge_payroll_cfg(payroll_cfg)
    paid_set, unpaid_set = _paid_unpaid_sets(cfg)

    if key in paid_set:
        return CANON_PAID_LEAVE
    if key in unpaid_set:
        return CANON_UNPAID_LEAVE

    canon = _STATUS_ALIASES.get(key)
    if canon:
        return canon

    logger.warning("attendance_payroll unknown_status raw=%r key=%s", raw, key)
    return CANON_UNKNOWN


def _bucket_decimal(bucket: dict | None, key: str) -> Decimal:
    if not bucket:
        return Decimal("0")
    v = bucket.get(key)
    if v is None:
        return Decimal("0")
    return Decimal(str(v))


def _calendar_days_inclusive(period_start: date, period_end: date) -> Decimal:
    return Decimal((period_end - period_start).days + 1)


def iter_period_dates(period_start: date, period_end: date) -> list[date]:
    out: list[date] = []
    cur = period_start
    while cur <= period_end:
        out.append(cur)
        cur += timedelta(days=1)
    return out


@dataclass(frozen=True)
class MissingWorkingDatesResult:
    missing_dates: tuple[date, ...]
    missing_units: Decimal
    working_dates: tuple[date, ...]
    working_units: Decimal


def compute_missing_working_dates(
    *,
    period_start: date,
    period_end: date,
    attendance_work_dates: Iterable[date],
    attendance_status_by_date: dict[date, str],
    org_holiday_dates: frozenset[date] | None = None,
    week_off_weekdays: frozenset[int] | None = None,
    payroll_cfg: dict[str, Any] | None = None,
) -> MissingWorkingDatesResult:
    """
  Identify working dates in the pay period with no attendance row.

  Holidays (org calendar + row status H) and week-offs (configured weekdays + row WO)
  are excluded from the working-day set and never counted as missing.
    """
    _ = merge_payroll_cfg(payroll_cfg)
    hol = org_holiday_dates or frozenset()
    wo_days = week_off_weekdays or frozenset()

    covered = set(attendance_work_dates)
    working: list[date] = []
    missing: list[date] = []

    for d in iter_period_dates(period_start, period_end):
        canon = attendance_status_by_date.get(d)
        if d in hol or d.weekday() in wo_days:
            continue
        if canon in (CANON_HOLIDAY, CANON_WEEK_OFF):
            continue
        working.append(d)
        if d not in covered:
            missing.append(d)

    working_units = Decimal(len(working))
    missing_units = Decimal(len(missing))
    return MissingWorkingDatesResult(
        missing_dates=tuple(missing),
        missing_units=missing_units,
        working_dates=tuple(working),
        working_units=working_units,
    )


def compute_total_working_days(
    *,
    calendar_days: Decimal,
    holiday_units: Decimal,
    week_off_units: Decimal,
    payroll_cfg: dict[str, Any] | None,
    roster_working_days: Decimal | None = None,
) -> Decimal:
    """
    Abstraction for total working days (roster-ready).

    Supported: ``calendar``, ``calendar_minus_weekoffs_holidays``.
    ``roster_based``: uses ``roster_working_days`` when provided, else falls back to cal-minus.
    """
    cfg = merge_payroll_cfg(payroll_cfg)
    mode = str(cfg.get("total_working_days_mode") or TOTAL_WORKING_MODE_CAL_MINUS).strip().lower()

    if mode == TOTAL_WORKING_MODE_CALENDAR:
        return calendar_days

    if mode == TOTAL_WORKING_MODE_ROSTER:
        if roster_working_days is not None:
            return roster_working_days
        logger.warning(
            "attendance_payroll roster_based mode without roster_working_days; "
            "falling back to calendar_minus_weekoffs_holidays"
        )

    total = calendar_days - holiday_units - week_off_units
    return total if total > 0 else Decimal("0")


def prepare_employee_attendance_bucket(
    *,
    base_bucket: dict[str, Decimal] | None,
    employee_attendance_rows: Sequence[Any],
    period_start: date,
    period_end: date,
    org_holiday_dates: frozenset[date] | None,
    week_off_weekdays: frozenset[int] | None,
    payroll_cfg: dict[str, Any] | None,
) -> tuple[dict[str, Decimal], MissingWorkingDatesResult]:
    """Merge aggregate bucket with per-employee missing-day policy."""
    bucket = dict(base_bucket or empty_attendance_bucket())
    for key in empty_attendance_bucket():
        bucket.setdefault(key, Decimal("0"))

    status_by_date: dict[date, str] = {}
    work_dates: list[date] = []
    for row in employee_attendance_rows:
        wd = row.work_date if hasattr(row, "work_date") else row["work_date"]
        st = row.status if hasattr(row, "status") else row.get("status")
        work_dates.append(wd)
        status_by_date[wd] = normalize_attendance_status(st, payroll_cfg=payroll_cfg)

    missing = compute_missing_working_dates(
        period_start=period_start,
        period_end=period_end,
        attendance_work_dates=work_dates,
        attendance_status_by_date=status_by_date,
        org_holiday_dates=org_holiday_dates,
        week_off_weekdays=week_off_weekdays,
        payroll_cfg=payroll_cfg,
    )
    apply_missing_attendance_policy_to_bucket(
        bucket, missing_units=missing.missing_units, payroll_cfg=payroll_cfg
    )
    return bucket, missing


def apply_missing_attendance_policy_to_bucket(
    bucket: dict[str, Decimal],
    *,
    missing_units: Decimal,
    payroll_cfg: dict[str, Any] | None,
) -> bool:
    """Apply missing-as-absent policy. Returns True if units were applied."""
    cfg = merge_payroll_cfg(payroll_cfg)
    policy = str(cfg.get("missing_attendance_policy") or MISSING_POLICY_NONE).strip().lower()
    bucket["missing_attendance_units"] = missing_units
    if policy != MISSING_POLICY_TREAT_ABSENT or missing_units <= 0:
        return False
    bucket["absent_units"] = _bucket_decimal(bucket, "absent_units") + missing_units
    logger.info(
        "attendance_payroll missing_policy=treat_missing_as_absent units=%s",
        format(missing_units, "f"),
    )
    return True


@dataclass
class AttendancePayrollScalars:
    """Scalars passed to Salary Engine v2 via employee_overrides."""

    payable_days: Decimal
    total_working_days: Decimal
    worked_days: Decimal
    lop_units: Decimal
    wage_proration_factor: Decimal
    calendar_days: Decimal
    present_units: Decimal
    absent_units: Decimal
    half_day_units: Decimal
    paid_leave_units: Decimal
    unpaid_leave_units: Decimal
    leave_on_attendance_units: Decimal
    holiday_units: Decimal
    week_off_units: Decimal
    lop_leave_units: Decimal
    unknown_units: Decimal
    missing_attendance_units: Decimal
    overtime_units: Decimal
    overtime_hours: Decimal
    payable_days_mode: str
    missing_working_dates: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    derived_scalar_flags: dict[str, Any] = field(default_factory=dict)

    def to_formula_variables(self) -> dict[str, Decimal]:
        return {
            "PAYABLE_DAYS": self.payable_days,
            "TOTAL_WORKING_DAYS": self.total_working_days,
            "PRESENT_UNITS": self.present_units,
            "ABSENT_UNITS": self.absent_units,
            "HALF_DAY_UNITS": self.half_day_units,
            "PAID_LEAVE_UNITS": self.paid_leave_units,
            "UNPAID_LEAVE_UNITS": self.unpaid_leave_units,
            "LEAVE_ON_ATTENDANCE_UNITS": self.leave_on_attendance_units,
            "HOLIDAY_UNITS": self.holiday_units,
            "WEEK_OFF_UNITS": self.week_off_units,
            "LOP_LEAVE_UNITS": self.lop_leave_units,
            "UNKNOWN_UNITS": self.unknown_units,
            "MISSING_ATTENDANCE_UNITS": self.missing_attendance_units,
            "OVERTIME_UNITS": self.overtime_units,
            "LOP_UNITS": self.lop_units,
            "WORKED_DAYS": self.worked_days,
            "WAGE_PRORATION_FACTOR": self.wage_proration_factor,
            "NIGHT_SHIFT_ALLOWANCE_UNITS": Decimal(
                "1" if self.derived_scalar_flags.get("night_shift_allowance_enabled") else "0"
            ),
            "HOLIDAY_SHIFT_ALLOWANCE_UNITS": Decimal(
                "1" if self.derived_scalar_flags.get("holiday_shift_allowance_enabled") else "0"
            ),
            "SHIFT_DIFFERENTIAL_UNITS": Decimal(
                "1" if self.derived_scalar_flags.get("shift_differential_enabled") else "0"
            ),
        }

    def to_payroll_breakdown(self) -> dict[str, str]:
        """JSON-safe payroll UI / audit breakdown."""
        return {
            "calendar_days": format(self.calendar_days, "f"),
            "total_working_days": format(self.total_working_days, "f"),
            "present_units": format(self.present_units, "f"),
            "paid_leave_units": format(self.paid_leave_units, "f"),
            "half_day_units": format(self.half_day_units, "f"),
            "absent_units": format(self.absent_units, "f"),
            "unpaid_leave_units": format(self.unpaid_leave_units, "f"),
            "missing_attendance_units": format(self.missing_attendance_units, "f"),
            "holiday_units": format(self.holiday_units, "f"),
            "week_off_units": format(self.week_off_units, "f"),
            "unknown_units": format(self.unknown_units, "f"),
            "overtime_units": format(self.overtime_units, "f"),
            "overtime_hours": format(self.overtime_hours, "f"),
            "payable_days": format(self.payable_days, "f"),
            "lop_units": format(self.lop_units, "f"),
            "worked_days": format(self.worked_days, "f"),
            "wage_proration_factor": format(self.wage_proration_factor, "f"),
            "payable_days_mode": self.payable_days_mode,
            "missing_working_dates": list(self.missing_working_dates),
        }


def _cap_wage_factor(raw_factor: Decimal, warnings: list[str]) -> Decimal:
    if raw_factor > Decimal("1"):
        warnings.append(f"wage_proration_factor_capped: {format(raw_factor, 'f')} -> 1")
        return Decimal("1")
    return raw_factor


def _log_attendance_payroll(
    *,
    employee_id: str | None,
    period_start: date,
    period_end: date,
    mode: str,
    scalars: AttendancePayrollScalars,
) -> None:
    if not employee_id:
        return
    logger.info(
        "attendance_payroll employee=%s period=%s..%s mode=%s "
        "working=%s payable=%s absent=%s missing=%s factor=%s",
        employee_id,
        period_start,
        period_end,
        mode,
        format(scalars.total_working_days, "f"),
        format(scalars.payable_days, "f"),
        format(scalars.absent_units, "f"),
        format(scalars.missing_attendance_units, "f"),
        format(scalars.wage_proration_factor, "f"),
    )


def compute_payroll_attendance_scalars(
    *,
    bucket: dict | None,
    period_start: date,
    period_end: date,
    payroll_cfg: dict[str, Any] | None,
    wage_proration_factor_override: Decimal | None = None,
    employee_id: str | None = None,
    missing_working_dates: Sequence[date] | None = None,
    org_holiday_dates: frozenset[date] | None = None,
    week_off_weekdays: frozenset[int] | None = None,
    roster_working_days: Decimal | None = None,
    derived_payroll_flags: dict[str, Any] | None = None,
) -> AttendancePayrollScalars:
    """Compute payroll attendance scalars (see module docstring for modes)."""
    cfg = merge_payroll_cfg(payroll_cfg)
    mode = str(cfg.get("payable_days_mode") or "calendar").strip().lower()
    apply_lop = bool(cfg.get("apply_lop_deduction", True))
    lop_half = bool(cfg.get("lop_include_half_day_units", False))
    override_payable = cfg.get("payable_days_override")

    present = _bucket_decimal(bucket, "present_units")
    absent = _bucket_decimal(bucket, "absent_units")
    half_day = _bucket_decimal(bucket, "half_day_units")
    paid_leave = _bucket_decimal(bucket, "paid_leave_units")
    if paid_leave == 0:
        paid_leave = _bucket_decimal(bucket, "leave_on_attendance_units")
    unpaid_leave = _bucket_decimal(bucket, "unpaid_leave_units")
    holiday = _bucket_decimal(bucket, "holiday_units")
    week_off = _bucket_decimal(bucket, "week_off_units")
    lop_leave = _bucket_decimal(bucket, "lop_leave_units")
    unknown = _bucket_decimal(bucket, "unknown_units")
    missing_att = _bucket_decimal(bucket, "missing_attendance_units")
    overtime_units = _bucket_decimal(bucket, "overtime_units")
    overtime_hours = _bucket_decimal(bucket, "overtime_hours")
    leave_on_att = paid_leave

    calendar_days = _calendar_days_inclusive(period_start, period_end)
    warnings: list[str] = []
    missing_iso = [d.isoformat() for d in (missing_working_dates or ())]

    if unknown > 0:
        warnings.append(f"unknown_attendance_units={format(unknown, 'f')}")
    if missing_att > 0:
        warnings.append(f"missing_attendance_units={format(missing_att, 'f')}")

    if mode == "attendance_units":
        period_hol, period_wo = count_period_calendar_non_working(
            period_start=period_start,
            period_end=period_end,
            org_holiday_dates=org_holiday_dates,
            week_off_weekdays=week_off_weekdays,
        )
        # Denominator uses org calendar + marked H/WO (whichever is higher per category).
        hol_for_total = holiday if holiday >= period_hol else period_hol
        wo_for_total = week_off if week_off >= period_wo else period_wo
        total_working = compute_total_working_days(
            calendar_days=calendar_days,
            holiday_units=hol_for_total,
            week_off_units=wo_for_total,
            payroll_cfg=cfg,
            roster_working_days=roster_working_days,
        )

        if override_payable is not None:
            payable_days = Decimal(str(override_payable))
        else:
            # half_day_units already stores day-fractions (0.5 per half-day row).
            payable_days = present + paid_leave + half_day

        if total_working > 0 and payable_days > total_working:
            warnings.append(
                f"payable_days_capped_to_total_working: "
                f"{format(payable_days, 'f')} -> {format(total_working, 'f')}"
            )
            payable_days = total_working

        lop_units = absent + unpaid_leave + lop_leave
        worked_days = payable_days if payable_days > 0 else Decimal("0")

        if wage_proration_factor_override is not None:
            wpf = wage_proration_factor_override
        elif apply_lop:
            if total_working > 0:
                wpf = _cap_wage_factor(payable_days / total_working, warnings)
            else:
                wpf = Decimal("0")
                warnings.append("total_working_days_zero_wage_factor_set_to_0")
                logger.warning(
                    "attendance_payroll total_working_days=0 employee=%s period=%s..%s",
                    employee_id,
                    period_start,
                    period_end,
                )
        else:
            wpf = Decimal("1")

        result = AttendancePayrollScalars(
            payable_days=payable_days,
            total_working_days=total_working,
            worked_days=worked_days,
            lop_units=lop_units,
            wage_proration_factor=wpf,
            calendar_days=calendar_days,
            present_units=present,
            absent_units=absent,
            half_day_units=half_day,
            paid_leave_units=paid_leave,
            unpaid_leave_units=unpaid_leave,
            leave_on_attendance_units=leave_on_att,
            holiday_units=hol_for_total,
            week_off_units=wo_for_total,
            lop_leave_units=lop_leave,
            unknown_units=unknown,
            missing_attendance_units=missing_att,
            overtime_units=overtime_units,
            overtime_hours=overtime_hours,
            payable_days_mode=mode,
            missing_working_dates=missing_iso,
            warnings=warnings,
        )
        _log_attendance_payroll(
            employee_id=employee_id,
            period_start=period_start,
            period_end=period_end,
            mode=mode,
            scalars=result,
        )
        return result

    # --- calendar mode (legacy) ---
    if override_payable is not None:
        payable_days = Decimal(str(override_payable))
    else:
        payable_days = calendar_days

    lop_units = absent + lop_leave
    if lop_half:
        lop_units += half_day

    worked_days = payable_days - lop_units
    if worked_days < 0:
        worked_days = Decimal("0")

    if wage_proration_factor_override is not None:
        wpf = wage_proration_factor_override
    elif apply_lop:
        if payable_days > 0:
            wpf = worked_days / payable_days
        else:
            wpf = Decimal("0")
            warnings.append("payable_days_zero_wage_factor_set_to_0")
    else:
        wpf = Decimal("1")

    result = AttendancePayrollScalars(
        payable_days=payable_days,
        total_working_days=calendar_days,
        worked_days=worked_days,
        lop_units=lop_units,
        wage_proration_factor=wpf,
        calendar_days=calendar_days,
        present_units=present,
        absent_units=absent,
        half_day_units=half_day,
        paid_leave_units=paid_leave,
        unpaid_leave_units=unpaid_leave,
        leave_on_attendance_units=leave_on_att,
        holiday_units=holiday,
        week_off_units=week_off,
        lop_leave_units=lop_leave,
        unknown_units=unknown,
        missing_attendance_units=missing_att,
        overtime_units=overtime_units,
        overtime_hours=overtime_hours,
        payable_days_mode=mode,
        missing_working_dates=missing_iso,
        warnings=warnings,
    )
    _log_attendance_payroll(
        employee_id=employee_id,
        period_start=period_start,
        period_end=period_end,
        mode=mode,
        scalars=result,
    )
    return result


def wage_proration_factor_for_job(
    scalars: AttendancePayrollScalars,
    *,
    payroll_cfg: dict[str, Any] | None,
) -> Decimal | None:
    """Value passed to preview_salary_v2 wage_proration_factor (None when LOP disabled)."""
    cfg = merge_payroll_cfg(payroll_cfg)
    if not bool(cfg.get("apply_lop_deduction", True)):
        return None
    return scalars.wage_proration_factor


def empty_attendance_bucket() -> dict[str, Decimal]:
    return {
        "present_units": Decimal("0"),
        "absent_units": Decimal("0"),
        "half_day_units": Decimal("0"),
        "paid_leave_units": Decimal("0"),
        "unpaid_leave_units": Decimal("0"),
        "leave_on_attendance_units": Decimal("0"),
        "holiday_units": Decimal("0"),
        "week_off_units": Decimal("0"),
        "lop_leave_units": Decimal("0"),
        "unknown_units": Decimal("0"),
        "missing_attendance_units": Decimal("0"),
        "overtime_units": Decimal("0"),
        "overtime_hours": Decimal("0"),
    }


def accumulate_attendance_row(
    bucket: dict[str, Decimal],
    *,
    status: str | None,
    day_fraction: Decimal | None,
    payroll_cfg: dict[str, Any] | None = None,
    work_hours: float | None = None,
) -> str:
    """Add one attendance row into unit buckets. Returns canonical status applied."""
    frac = day_fraction if day_fraction is not None else Decimal("1")
    canon = normalize_attendance_status(status, payroll_cfg=payroll_cfg)

    if canon == CANON_OVERTIME:
        bucket["overtime_units"] += frac if frac != Decimal("1") else Decimal("1")
        if work_hours is not None and work_hours > 0:
            bucket["overtime_hours"] += Decimal(str(work_hours))
        return canon
    if canon == CANON_WEEK_OFF:
        bucket["week_off_units"] += frac if frac != Decimal("1") else Decimal("1")
    elif canon == CANON_HOLIDAY:
        bucket["holiday_units"] += frac if frac != Decimal("1") else Decimal("1")
    elif canon == CANON_HALF_DAY:
        bucket["half_day_units"] += frac if frac != Decimal("1") else Decimal("0.5")
    elif canon == CANON_ABSENT:
        bucket["absent_units"] += frac
    elif canon == CANON_PAID_LEAVE:
        bucket["paid_leave_units"] += frac
        bucket["leave_on_attendance_units"] += frac
    elif canon == CANON_UNPAID_LEAVE:
        bucket["unpaid_leave_units"] += frac
    elif canon == CANON_PRESENT:
        bucket["present_units"] += frac
    else:
        bucket["unknown_units"] += frac

    return canon
