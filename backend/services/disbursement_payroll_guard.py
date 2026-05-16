"""
Payroll ↔ disbursement guards (isolated; does not modify payroll calculations).
"""

from __future__ import annotations

import os

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import SalaryBatch
from models.payroll_models import PayrollRun
from services.payroll_lifecycle_guard import LIFECYCLE_APPROVED, LIFECYCLE_LOCKED
from services.payroll_process_policy import PayrollProcessBlockedError

# approved = minimum; set DISBURSEMENT_REQUIRE_PAYROLL_LOCKED=true for locked-only
_REQUIRE_LOCKED = os.getenv("DISBURSEMENT_REQUIRE_PAYROLL_LOCKED", "false").lower() == "true"
_ALLOWED_LIFECYCLE = {LIFECYCLE_LOCKED} if _REQUIRE_LOCKED else {LIFECYCLE_APPROVED, LIFECYCLE_LOCKED}

_PAYROLL_MUTATION_BLOCK_STATUSES = frozenset(
    {"approved", "payout_in_progress", "paid"}
)


async def assert_payroll_eligible_for_disbursement_batch(
    db: AsyncSession,
    *,
    payroll_run_id,
    organisation_id,
    pay_period_id,
) -> PayrollRun:
    """Validate payroll run before creating a salary disbursement batch."""
    payroll = await db.get(PayrollRun, payroll_run_id)
    if not payroll or str(payroll.organisation_id) != str(organisation_id):
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if str(payroll.pay_period_id) != str(pay_period_id):
        raise HTTPException(
            status_code=400,
            detail="pay_period_id does not match the payroll run",
        )
    if (payroll.status or "").lower() != "processed":
        raise HTTPException(
            status_code=409,
            detail=f"Payroll run must be processed before disbursement (status={payroll.status})",
        )
    lifecycle = (payroll.lifecycle_status or "").strip().lower()
    if lifecycle not in _ALLOWED_LIFECYCLE:
        need = "locked" if _REQUIRE_LOCKED else "approved or locked"
        raise HTTPException(
            status_code=409,
            detail=f"Payroll lifecycle must be {need} before disbursement (current={lifecycle or 'unset'})",
        )

    dup = await db.execute(
        select(SalaryBatch.batch_id).where(
            SalaryBatch.organisation_id == organisation_id,
            SalaryBatch.payroll_run_id == payroll_run_id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="A salary batch already exists for this payroll run",
        )
    return payroll


async def assert_payroll_not_disbursement_locked(
    db: AsyncSession,
    payroll_run_id,
) -> None:
    """
    Block payroll re-processing when disbursement has started or batch is fully approved.
    Called from payroll gather / process path only.
    """
    res = await db.execute(
        select(SalaryBatch.status, SalaryBatch.disbursement_locked_at, SalaryBatch.batch_ref).where(
            SalaryBatch.payroll_run_id == payroll_run_id
        )
    )
    for status, locked_at, batch_ref in res.all():
        if locked_at or status in _PAYROLL_MUTATION_BLOCK_STATUSES:
            raise PayrollProcessBlockedError(
                {
                    "code": "PAYROLL_DISBURSEMENT_LOCKED",
                    "message": (
                        "Payroll run is tied to an active or approved disbursement batch; "
                        "cannot reprocess payroll."
                    ),
                    "details": {
                        "batch_ref": batch_ref,
                        "batch_status": status,
                        "disbursement_locked": bool(locked_at),
                    },
                }
            )
