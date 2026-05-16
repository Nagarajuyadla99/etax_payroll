"""Attendance validation before payroll (warnings + optional strict blocking)."""

from __future__ import annotations

import logging
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from models.attendance_models import Attendance
from models.payroll_models import PayPeriod

from services.payroll_attendance_calculator import (
    CANON_UNKNOWN,
    compute_payroll_attendance_scalars,
    merge_payroll_cfg,
    normalize_attendance_status,
)

logger = logging.getLogger(__name__)


class PayrollAttendanceValidationError(ValueError):
    """Raised when strict_attendance_validation blocks payroll processing."""

    def __init__(self, detail: dict[str, Any]):
        self.detail = detail
        super().__init__(detail.get("message", "Attendance validation failed"))


@dataclass
class AttendanceValidationResult:
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    blocking_issues: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "warnings": list(self.warnings),
            "errors": list(self.errors),
            "blocking_issues": list(self.blocking_issues),
            "details": dict(self.details),
        }


def _check_row_integrity(
    rows: list[Attendance],
    pay_period: PayPeriod,
    payroll_cfg: dict[str, Any],
    result: AttendanceValidationResult,
) -> None:
    today = date.today()
    dup_keys: Counter[tuple[UUID, date]] = Counter()
    future_dates: list[str] = []
    outside_period: list[str] = []
    bad_fractions: list[str] = []
    invalid_statuses: list[str] = []

    for row in rows:
        dup_keys[(row.employee_id, row.work_date)] += 1
        if row.work_date > pay_period.end_date:
            outside_period.append(f"{row.employee_id}:{row.work_date}")
        if row.work_date < pay_period.start_date:
            outside_period.append(f"{row.employee_id}:{row.work_date}")
        if row.work_date > today:
            future_dates.append(f"{row.employee_id}:{row.work_date}")
        try:
            frac = Decimal(str(row.day_fraction)) if row.day_fraction is not None else Decimal("1")
            if frac < 0:
                bad_fractions.append(f"{row.employee_id}:{row.work_date}")
        except Exception:  # noqa: BLE001
            bad_fractions.append(f"{row.employee_id}:{row.work_date}")
        canon = normalize_attendance_status(row.status, payroll_cfg=payroll_cfg)
        if canon == CANON_UNKNOWN and row.status:
            invalid_statuses.append(f"{row.employee_id}:{row.work_date}:{row.status!r}")

    duplicates = [f"{eid}:{wd}" for (eid, wd), c in dup_keys.items() if c > 1]
    if duplicates:
        msg = f"duplicate_attendance_rows: count={len(duplicates)} sample={duplicates[:5]}"
        result.warnings.append(msg)
        result.errors.append(msg)
        result.details["duplicate_rows"] = duplicates[:50]
        logger.warning("attendance_payroll %s", msg)

    if future_dates:
        msg = f"future_attendance_dates: count={len(future_dates)}"
        result.warnings.append(msg)
        result.details["future_dates"] = future_dates[:50]

    if outside_period:
        msg = f"attendance_outside_pay_period: count={len(outside_period)}"
        result.warnings.append(msg)
        result.errors.append(msg)
        result.details["outside_period"] = outside_period[:50]

    if bad_fractions:
        msg = f"invalid_day_fraction: count={len(bad_fractions)}"
        result.warnings.append(msg)
        result.errors.append(msg)

    if invalid_statuses:
        msg = f"invalid_attendance_status: count={len(invalid_statuses)}"
        result.warnings.append(msg)
        result.errors.append(msg)
        result.details["invalid_statuses"] = invalid_statuses[:50]


def collect_payroll_attendance_validation(
    *,
    pay_period: PayPeriod,
    payroll_cfg: dict[str, Any] | None,
    units_agg: dict[UUID, dict[str, Decimal]],
    attendance_rows: list[Attendance],
    active_employee_count: int,
    missing_by_employee: dict[UUID, Decimal] | None = None,
) -> AttendanceValidationResult:
    """Full validation pass (warnings + errors; blocking decided by assert function)."""
    result = AttendanceValidationResult()
    cfg = merge_payroll_cfg(payroll_cfg)
    missing_by_employee = missing_by_employee or {}

    if not bool(pay_period.attendance_leave_locked):
        result.warnings.append(
            "attendance_leave_unlocked: pay period attendance/leave is not locked yet "
            "(expected after a prior finalized payroll run)"
        )

    if bool(cfg.get("require_attendance_lock_before_payroll")) and not pay_period.attendance_leave_locked:
        result.blocking_issues.append("attendance_lock_required: pay period must be attendance_leave_locked")

    if not attendance_rows:
        result.warnings.append(
            f"no_attendance_records: no attendance rows for period {pay_period.start_date} "
            f"to {pay_period.end_date}"
        )

    employees_with_rows = {r.employee_id for r in attendance_rows}
    if active_employee_count > 0 and len(employees_with_rows) == 0:
        result.warnings.append(
            "no_employee_attendance: active employees exist but no per-employee attendance rows in range"
        )

    unknown_total = Decimal("0")
    missing_total = Decimal("0")
    for eid, bucket in units_agg.items():
        unknown_total += Decimal(str(bucket.get("unknown_units") or 0))
        missing_total += Decimal(str(bucket.get("missing_attendance_units") or missing_by_employee.get(eid, 0)))

    if unknown_total > 0:
        result.warnings.append(
            f"unknown_attendance_statuses: total unknown_units={format(unknown_total, 'f')}"
        )
        result.errors.append("unknown_attendance_statuses_present")

    if missing_total > 0:
        result.warnings.append(
            f"missing_attendance_days: total missing_units={format(missing_total, 'f')}"
        )
        per_emp = {str(k): format(Decimal(str(v)), "f") for k, v in missing_by_employee.items() if v > 0}
        if per_emp:
            result.details["missing_by_employee"] = per_emp

    mode = str(cfg.get("payable_days_mode") or "calendar")
    if mode == "attendance_units" and not attendance_rows:
        result.warnings.append(
            "attendance_units_mode_without_rows: payable days may be zero without attendance rows"
        )

    for eid, bucket in units_agg.items():
        scalars = compute_payroll_attendance_scalars(
            bucket=bucket,
            period_start=pay_period.start_date,
            period_end=pay_period.end_date,
            payroll_cfg=cfg,
        )
        if mode == "attendance_units" and scalars.payable_days > scalars.total_working_days:
            result.warnings.append(
                f"excess_payable_units: employee={eid} payable={scalars.payable_days} "
                f"working={scalars.total_working_days}"
            )

    _check_row_integrity(attendance_rows, pay_period, cfg, result)

    if result.blocking_issues:
        for issue in result.blocking_issues:
            logger.warning("attendance_payroll strict_blocker %s", issue)

    return result


def collect_payroll_attendance_warnings(**kwargs: Any) -> list[str]:
    """Backward-compatible warning list."""
    return collect_payroll_attendance_validation(**kwargs).warnings


def assert_payroll_attendance_allowed(
    validation: AttendanceValidationResult,
    *,
    payroll_cfg: dict[str, Any] | None,
) -> None:
    """Raise PayrollAttendanceValidationError when strict mode blocks processing."""
    cfg = merge_payroll_cfg(payroll_cfg)
    strict = bool(cfg.get("strict_attendance_validation"))

    blocking = list(validation.blocking_issues)
    if strict:
        if "unknown_attendance_statuses_present" in validation.errors:
            blocking.append("strict: unknown attendance statuses")
        if validation.details.get("duplicate_rows"):
            blocking.append("strict: duplicate attendance rows")
        if validation.details.get("missing_by_employee"):
            blocking.append("strict: missing attendance on working days")

    if not blocking:
        return

    payload = {
        "message": "Payroll blocked by attendance validation",
        "code": "ATTENDANCE_VALIDATION_FAILED",
        "blocking_issues": blocking,
        "validation": validation.to_dict(),
    }
    logger.warning("attendance_payroll strict_validation_failed %s", blocking)
    raise PayrollAttendanceValidationError(payload)
