"""Payroll process policy: mode mismatch, already processed, reset eligibility."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from services.payroll_process_policy import (
    PayrollProcessBlockedError,
    append_reprocess_reset_history,
    assert_payroll_process_allowed,
    assert_payroll_reset_allowed,
    attendance_policy_mismatch,
    build_creation_execution_meta,
    snapshot_payable_days_mode,
)


def _run(payroll, cfg):
    assert_payroll_process_allowed(payroll, current_payroll_cfg=cfg)


def test_calendar_run_blocks_when_org_now_attendance_units():
    payroll = SimpleNamespace(
        payroll_run_id=uuid4(),
        status="draft",
        execution_status="draft",
        lifecycle_status="draft",
        execution_meta={
            "payroll_settings_at_creation": {"payable_days_mode": "calendar"},
        },
    )
    with pytest.raises(PayrollProcessBlockedError) as exc:
        _run(payroll, {"payable_days_mode": "attendance_units"})
    assert exc.value.detail["code"] == "PAYROLL_MODE_MISMATCH"
    assert "calendar" in exc.value.detail["message"].lower()
    assert exc.value.detail["details"]["stored_payable_days_mode"] == "calendar"
    assert exc.value.detail["details"]["current_payable_days_mode"] == "attendance_units"


def test_processed_run_requires_regenerate():
    payroll = SimpleNamespace(
        payroll_run_id=uuid4(),
        status="processed",
        execution_status="completed",
        lifecycle_status="draft",
        execution_meta={
            "input_snapshot": {
                "payroll_settings": {"payable_days_mode": "calendar"},
            },
        },
    )
    with pytest.raises(PayrollProcessBlockedError) as exc:
        _run(payroll, {"payable_days_mode": "attendance_units"})
    assert exc.value.detail["code"] == "PAYROLL_ALREADY_PROCESSED"
    assert "regenerate" in exc.value.detail["message"].lower()


def test_matching_settings_allows_draft_process():
    payroll = SimpleNamespace(
        payroll_run_id=uuid4(),
        status="draft",
        execution_status="draft",
        lifecycle_status="draft",
        execution_meta=build_creation_execution_meta({"payable_days_mode": "attendance_units"}),
    )
    _run(payroll, {"payable_days_mode": "attendance_units"})


def test_reset_blocked_when_locked():
    payroll = SimpleNamespace(
        payroll_run_id=uuid4(),
        status="processed",
        execution_status="completed",
        lifecycle_status="locked",
        execution_meta={},
    )
    with pytest.raises(PayrollProcessBlockedError) as exc:
        assert_payroll_reset_allowed(payroll)
    assert exc.value.detail["code"] == "PAYROLL_LIFECYCLE_LOCKED"


def test_append_reprocess_history_clears_snapshot():
    meta = {
        "input_snapshot": {"payroll_settings": {"payable_days_mode": "calendar"}},
        "input_fingerprint": "abc",
    }
    out = append_reprocess_reset_history(meta, reason="test", previous_snapshot=meta["input_snapshot"])
    assert "input_snapshot" not in out
    assert "input_fingerprint" not in out
    assert len(out.get("reprocess_history") or []) == 1


def test_snapshot_payable_days_mode_from_input_snapshot():
    meta = {"input_snapshot": {"payroll_settings": {"payable_days_mode": "calendar"}}}
    assert snapshot_payable_days_mode(meta) == "calendar"


def test_attendance_policy_mismatch_detects_fingerprint_change():
    mismatch = attendance_policy_mismatch(
        stored_settings={"payable_days_mode": "calendar", "apply_lop_deduction": True},
        current_cfg={"payable_days_mode": "attendance_units", "apply_lop_deduction": True},
    )
    assert mismatch is not None
    assert mismatch["stored_payable_days_mode"] == "calendar"
