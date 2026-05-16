"""Attendance validation tests (requires sqlalchemy / DB models)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

pytest.importorskip("sqlalchemy")

from services.payroll_attendance_validation import (  # noqa: E402
    AttendanceValidationResult,
    PayrollAttendanceValidationError,
    assert_payroll_attendance_allowed,
    collect_payroll_attendance_validation,
)


def test_strict_validation_blocks_on_lock_and_unknown():
    period = SimpleNamespace(
        pay_period_id=uuid4(),
        start_date=date(2026, 5, 1),
        end_date=date(2026, 5, 31),
        attendance_leave_locked=False,
    )
    validation = collect_payroll_attendance_validation(
        pay_period=period,
        payroll_cfg={
            "strict_attendance_validation": True,
            "require_attendance_lock_before_payroll": True,
        },
        units_agg={uuid4(): {"unknown_units": Decimal("1")}},
        attendance_rows=[],
        active_employee_count=1,
        missing_by_employee={uuid4(): Decimal("2")},
    )
    with pytest.raises(PayrollAttendanceValidationError) as exc:
        assert_payroll_attendance_allowed(validation, payroll_cfg={"strict_attendance_validation": True})
    assert exc.value.detail["code"] == "ATTENDANCE_VALIDATION_FAILED"


def test_assert_allows_warnings_only_by_default():
    validation = AttendanceValidationResult(warnings=["no_attendance_records"])
    assert_payroll_attendance_allowed(validation, payroll_cfg={"strict_attendance_validation": False})
