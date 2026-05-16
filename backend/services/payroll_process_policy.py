"""Payroll process guards: mode consistency, stale snapshots, reprocess eligibility."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from models.payroll_models import PayrollRun

from services.payroll_attendance_calculator import merge_payroll_cfg
from services.payroll_lifecycle_guard import LIFECYCLE_DRAFT, LIFECYCLE_LOCKED
from services.payroll_stable_json import stable_json_hash


class PayrollProcessBlockedError(ValueError):
    """Structured block before payroll execution (HTTP 400 with detail dict)."""

    def __init__(self, detail: dict[str, Any]):
        self.detail = detail
        super().__init__(str(detail.get("message") or "Payroll process blocked"))


def payroll_settings_process_fingerprint(payroll_cfg: dict[str, Any] | None) -> str:
    """Hash of settings that affect attendance gather / salary proration."""
    cfg = merge_payroll_cfg(payroll_cfg)
    material = {
        "payable_days_mode": cfg.get("payable_days_mode"),
        "total_working_days_mode": cfg.get("total_working_days_mode"),
        "missing_attendance_policy": cfg.get("missing_attendance_policy"),
        "apply_lop_deduction": cfg.get("apply_lop_deduction"),
        "strict_attendance_validation": cfg.get("strict_attendance_validation"),
        "require_attendance_lock_before_payroll": cfg.get("require_attendance_lock_before_payroll"),
        "prorate_with_attendance": cfg.get("prorate_with_attendance"),
    }
    return stable_json_hash(material)


def snapshot_payroll_settings(execution_meta: dict[str, Any] | None) -> dict[str, Any] | None:
    """Best-effort payroll settings captured on run or last process."""
    meta = execution_meta or {}
    snap = meta.get("input_snapshot") or {}
    if isinstance(snap.get("payroll_settings"), dict):
        return dict(snap["payroll_settings"])
    if isinstance(meta.get("payroll_settings_at_creation"), dict):
        return dict(meta["payroll_settings_at_creation"])
    return None


def snapshot_payable_days_mode(execution_meta: dict[str, Any] | None) -> str | None:
    settings = snapshot_payroll_settings(execution_meta)
    if not settings:
        return None
    mode = settings.get("payable_days_mode")
    return str(mode).strip().lower() if mode is not None else None


def attendance_policy_mismatch(
    *,
    stored_settings: dict[str, Any] | None,
    current_cfg: dict[str, Any],
) -> dict[str, Any] | None:
    """Return mismatch details when stored vs current settings differ materially."""
    if not stored_settings:
        return None
    stored_fp = payroll_settings_process_fingerprint(stored_settings)
    current_fp = payroll_settings_process_fingerprint(current_cfg)
    if stored_fp == current_fp:
        return None
    stored_mode = str(stored_settings.get("payable_days_mode") or "calendar").strip().lower()
    current_mode = str(merge_payroll_cfg(current_cfg).get("payable_days_mode") or "calendar").strip().lower()
    return {
        "stored_payable_days_mode": stored_mode,
        "current_payable_days_mode": current_mode,
        "stored_settings_fingerprint": stored_fp,
        "current_settings_fingerprint": current_fp,
    }


def assert_payroll_process_allowed(
    payroll: PayrollRun,
    *,
    current_payroll_cfg: dict[str, Any] | None,
) -> None:
    """
    Validate payroll run may be processed with current org settings.

    Does not disable attendance safety checks — only blocks inconsistent / illegal process.
    """
    lifecycle = (getattr(payroll, "lifecycle_status", None) or LIFECYCLE_DRAFT).strip().lower()
    if lifecycle == LIFECYCLE_LOCKED:
        raise PayrollProcessBlockedError(
            {
                "code": "PAYROLL_LIFECYCLE_LOCKED",
                "message": "Payroll run is locked. No further processing or regeneration is allowed.",
                "details": {"lifecycle_status": lifecycle},
            }
        )

    current_cfg = merge_payroll_cfg(current_payroll_cfg)
    current_mode = str(current_cfg.get("payable_days_mode") or "calendar").strip().lower()
    meta = payroll.execution_meta or {}
    stored_settings = snapshot_payroll_settings(meta)
    mismatch = attendance_policy_mismatch(stored_settings=stored_settings, current_cfg=current_cfg)

    if (payroll.status or "").lower() == "processed":
        stored_mode = snapshot_payable_days_mode(meta) or "calendar"
        raise PayrollProcessBlockedError(
            {
                "code": "PAYROLL_ALREADY_PROCESSED",
                "message": (
                    "This payroll run was already processed. "
                    "Use “Regenerate payroll using attendance mode” to clear entries and process again "
                    "with current attendance settings."
                ),
                "details": {
                    "stored_payable_days_mode": stored_mode,
                    "current_payable_days_mode": current_mode,
                    "payroll_settings_mismatch": mismatch,
                    "regenerate_endpoint": f"/api/payrolls/{payroll.payroll_run_id}/reset-for-reprocess",
                },
            }
        )

    if getattr(payroll, "execution_status", None) in ("queued", "running"):
        raise PayrollProcessBlockedError(
            {
                "code": "PAYROLL_EXECUTION_IN_PROGRESS",
                "message": "Payroll is already queued or running. Wait for completion or check Celery workers.",
                "details": {"execution_status": payroll.execution_status},
            }
        )

    if mismatch:
        stored_mode = mismatch["stored_payable_days_mode"]
        current_mode = mismatch["current_payable_days_mode"]
        if stored_mode == "calendar" and current_mode == "attendance_units":
            message = (
                "Payroll run was created or last prepared using calendar mode, but the organisation "
                "now uses attendance_units (working-day payroll). Regenerate this run before processing."
            )
        else:
            message = (
                "Organisation payroll attendance settings changed since this run was created. "
                "Regenerate the payroll run to refresh the attendance snapshot before processing."
            )
        raise PayrollProcessBlockedError(
            {
                "code": "PAYROLL_MODE_MISMATCH",
                "message": message,
                "details": {
                    **mismatch,
                    "regenerate_endpoint": f"/api/payrolls/{payroll.payroll_run_id}/reset-for-reprocess",
                },
            }
        )


def assert_payroll_reset_allowed(payroll: PayrollRun) -> None:
    """Eligibility for reset-for-reprocess (clears entries, keeps run id)."""
    lifecycle = (getattr(payroll, "lifecycle_status", None) or LIFECYCLE_DRAFT).strip().lower()
    if lifecycle == LIFECYCLE_LOCKED:
        raise PayrollProcessBlockedError(
            {
                "code": "PAYROLL_LIFECYCLE_LOCKED",
                "message": "Locked payroll runs cannot be regenerated.",
                "details": {"lifecycle_status": lifecycle},
            }
        )
    if lifecycle not in (LIFECYCLE_DRAFT, "", None):
        raise PayrollProcessBlockedError(
            {
                "code": "PAYROLL_LIFECYCLE_BLOCKS_RESET",
                "message": (
                    "Payroll run has progressed past draft review (verified/approved). "
                    "Cannot reset for reprocess."
                ),
                "details": {"lifecycle_status": lifecycle},
            }
        )
    if getattr(payroll, "execution_status", None) in ("queued", "running"):
        raise PayrollProcessBlockedError(
            {
                "code": "PAYROLL_EXECUTION_IN_PROGRESS",
                "message": "Cannot reset while payroll is queued or running.",
                "details": {"execution_status": payroll.execution_status},
            }
        )


def build_creation_execution_meta(payroll_cfg: dict[str, Any] | None) -> dict[str, Any]:
    cfg = merge_payroll_cfg(payroll_cfg)
    return {
        "payroll_settings_at_creation": cfg,
        "payroll_settings_fingerprint": payroll_settings_process_fingerprint(cfg),
        "payroll_settings_captured_at": datetime.now(timezone.utc).isoformat(),
    }


def append_reprocess_reset_history(
    execution_meta: dict[str, Any] | None,
    *,
    reason: str,
    previous_snapshot: dict[str, Any] | None,
) -> dict[str, Any]:
    meta = dict(execution_meta or {})
    history = list(meta.get("reprocess_history") or [])
    history.append(
        {
            "reset_at": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
            "previous_input_fingerprint": meta.get("input_fingerprint"),
            "previous_payroll_settings": (previous_snapshot or {}).get("payroll_settings"),
        }
    )
    meta["reprocess_history"] = history[-20:]
    for key in (
        "input_snapshot",
        "input_fingerprint",
        "attendance_warnings",
        "attendance_validation",
        "shadow_legacy",
    ):
        meta.pop(key, None)
    return meta
