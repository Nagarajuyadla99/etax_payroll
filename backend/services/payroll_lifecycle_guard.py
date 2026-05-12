"""Phase 4 lifecycle guards — no CRUD imports (avoids circular imports)."""

from __future__ import annotations

LIFECYCLE_DRAFT = "draft"
LIFECYCLE_VERIFIED = "verified"
LIFECYCLE_APPROVED = "approved"
LIFECYCLE_LOCKED = "locked"


def assert_not_locked_value_error(payroll) -> None:
    if (getattr(payroll, "lifecycle_status", None) or "").lower() == LIFECYCLE_LOCKED:
        raise ValueError(
            "Payroll run is locked; no modifications or re-execution allowed."
        )


def mark_run_ready_for_review(payroll) -> None:
    """After successful Phase 3 execution — first lifecycle step for HR."""
    if getattr(payroll, "lifecycle_status", None) is None:
        payroll.lifecycle_status = LIFECYCLE_DRAFT
