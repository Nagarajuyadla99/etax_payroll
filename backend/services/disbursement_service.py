"""
Disbursement orchestration: mode locking, payout enqueue guards, advisory locks.
Isolated from payroll calculation modules.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import SalaryBatch

DISBURSEMENT_MODE_BANK_FILE = "bank_file"
DISBURSEMENT_MODE_API = "api"
_VALID_MODES = frozenset({DISBURSEMENT_MODE_BANK_FILE, DISBURSEMENT_MODE_API})

_BATCH_PAYOUT_ACTIVE = frozenset({"payout_in_progress", "paid"})


async def pg_advisory_xact_lock_batch(db: AsyncSession, batch_id: UUID) -> None:
    """Serialize disbursement mutations per batch (PostgreSQL). No-op on other dialects."""
    bind = db.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return
    key = int(batch_id.int % (2**63 - 1))
    await db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": key})


async def assert_disbursement_mode(
    db: AsyncSession,
    batch: SalaryBatch,
    requested_mode: str,
) -> None:
    """
    Lock batch to bank_file or api on first disbursement action.
    Raises 409 if mode conflicts.
    """
    if requested_mode not in _VALID_MODES:
        raise HTTPException(status_code=400, detail="Invalid disbursement mode")

    await pg_advisory_xact_lock_batch(db, batch.batch_id)

    if batch.disbursement_mode and batch.disbursement_mode != requested_mode:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Batch is locked to '{batch.disbursement_mode}' disbursement. "
                f"Cannot use '{requested_mode}' for the same salary batch."
            ),
        )
    if not batch.disbursement_mode:
        batch.disbursement_mode = requested_mode
        batch.disbursement_locked_at = datetime.now(tz=timezone.utc)
        await db.flush()


async def try_acquire_payout_enqueue_lock(db: AsyncSession, batch: SalaryBatch) -> str:
    """
    Prevent duplicate Celery enqueue for the same approved batch.
    Returns job id when lock acquired; raises 409 if already queued/in progress.
    """
    await pg_advisory_xact_lock_batch(db, batch.batch_id)

    if batch.status in _BATCH_PAYOUT_ACTIVE:
        raise HTTPException(
            status_code=409,
            detail=f"Batch payout already active (status={batch.status})",
        )
    if batch.payout_job_id:
        raise HTTPException(
            status_code=409,
            detail="Payout already queued for this batch",
        )

    job_id = str(uuid.uuid4())
    batch.payout_job_id = job_id
    batch.status = "payout_in_progress"
    await db.flush()
    return job_id


def celery_inline_fallback_allowed() -> bool:
    """Production must not run payouts inline when the broker is down."""
    env = (os.getenv("ENVIRONMENT") or os.getenv("ENV") or "development").lower()
    return env not in ("production", "prod", "staging")


async def validate_batch_for_payout(batch: SalaryBatch, org_id: UUID) -> None:
    if str(batch.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status not in {"approved", "failed"}:
        raise HTTPException(
            status_code=409,
            detail=f"Batch not approved for payout (status={batch.status})",
        )
    if batch.disbursement_mode == DISBURSEMENT_MODE_BANK_FILE:
        raise HTTPException(
            status_code=409,
            detail="Batch is locked to bank_file mode; API payout is not allowed",
        )


async def validate_batch_for_bank_file(batch: SalaryBatch, org_id: UUID) -> None:
    if str(batch.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.disbursement_mode == DISBURSEMENT_MODE_API:
        raise HTTPException(
            status_code=409,
            detail="Batch is locked to api payout mode; bank file generation is not allowed",
        )
    if batch.status in _BATCH_PAYOUT_ACTIVE:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot generate bank file after payout started (status={batch.status})",
        )
