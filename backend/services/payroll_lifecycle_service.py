"""
Phase 4 — payroll lifecycle (draft → verified → approved → locked).
No salary recomputation; guards + audit only.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.payroll_audit_models import PayrollLifecycleAuditLog
from models.payroll_models import PayrollEntry, PayrollRun
from crud.payroll_crud import get_payroll_by_id
from services.payroll_lifecycle_guard import (
    LIFECYCLE_APPROVED,
    LIFECYCLE_DRAFT,
    LIFECYCLE_LOCKED,
    LIFECYCLE_VERIFIED,
)

ACTION_VERIFY = "VERIFY_PAYROLL"
ACTION_APPROVE = "APPROVE_PAYROLL"
ACTION_LOCK = "LOCK_PAYROLL"
ACTION_DENIED = "MODIFY_DENIED"


async def record_lifecycle_audit(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    user_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID,
    detail: dict[str, Any] | None = None,
) -> None:
    row = PayrollLifecycleAuditLog(
        organisation_id=organisation_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
    )
    db.add(row)
    await db.commit()


def _is_locked(payroll: PayrollRun) -> bool:
    return (payroll.lifecycle_status or "").lower() == LIFECYCLE_LOCKED


def assert_not_locked_value_error(payroll: PayrollRun) -> None:
    if _is_locked(payroll):
        raise ValueError("Payroll run is locked; no modifications or re-execution allowed.")


async def deny_if_locked_with_audit(
    db: AsyncSession,
    payroll: PayrollRun,
    organisation_id: UUID,
    user_id: UUID | None,
    attempted_action: str,
) -> None:
    if not _is_locked(payroll):
        return
    await record_lifecycle_audit(
        db,
        organisation_id=organisation_id,
        user_id=user_id,
        action=ACTION_DENIED,
        entity_type="payroll_run",
        entity_id=payroll.payroll_run_id,
        detail={"attempted": attempted_action},
    )
    raise HTTPException(
        status_code=403,
        detail="Payroll run is locked; no modifications or re-execution allowed.",
    )


async def build_final_snapshot(db: AsyncSession, payroll_run_id: UUID) -> dict[str, Any]:
    """Copy persisted header + lines only (no engine)."""
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise ValueError("Payroll run not found")

    q = await db.execute(
        select(PayrollEntry).where(PayrollEntry.payroll_run_id == payroll_run_id)
    )
    entries = q.scalars().all()
    lines = [
        {
            "payroll_entry_id": str(e.payroll_entry_id),
            "employee_id": str(e.employee_id),
            "component_id": str(e.component_id),
            "pay_period_id": str(e.pay_period_id),
            "amount": str(e.amount),
            "meta": jsonable_encoder(e.meta) if e.meta else None,
        }
        for e in entries
    ]

    return {
        "payroll_run_id": str(payroll.payroll_run_id),
        "organisation_id": str(payroll.organisation_id),
        "pay_period_id": str(payroll.pay_period_id),
        "status": payroll.status,
        "execution_status": payroll.execution_status,
        "gross_pay_total": str(payroll.gross_pay_total),
        "net_pay_total": str(payroll.net_pay_total),
        "processed_at": payroll.processed_at.isoformat() if payroll.processed_at else None,
        "execution_trace_id": str(payroll.execution_trace_id)
        if payroll.execution_trace_id
        else None,
        "execution_meta": jsonable_encoder(payroll.execution_meta)
        if payroll.execution_meta
        else None,
        "entry_count": len(lines),
        "entries": lines,
        "frozen_at": datetime.now(timezone.utc).isoformat(),
    }


async def verify_payroll_lifecycle(
    db: AsyncSession,
    payroll_run_id: UUID,
    organisation_id: UUID,
    user_id: UUID,
) -> PayrollRun:
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if organisation_id and str(payroll.organisation_id) != str(organisation_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    if _is_locked(payroll):
        raise HTTPException(status_code=403, detail="Payroll run is already locked")

    if payroll.status != "processed":
        raise HTTPException(
            status_code=400,
            detail="Payroll must be processed before verification",
        )
    if (payroll.lifecycle_status or "").lower() != LIFECYCLE_DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lifecycle state for verify: expected {LIFECYCLE_DRAFT}",
        )

    now = datetime.now(timezone.utc)
    payroll.lifecycle_status = LIFECYCLE_VERIFIED
    payroll.lifecycle_verified_at = now
    payroll.lifecycle_verified_by = user_id
    db.add(payroll)
    await db.commit()
    await db.refresh(payroll)

    await record_lifecycle_audit(
        db,
        organisation_id=payroll.organisation_id,
        user_id=user_id,
        action=ACTION_VERIFY,
        entity_type="payroll_run",
        entity_id=payroll_run_id,
        detail=None,
    )
    return payroll


async def approve_payroll_lifecycle(
    db: AsyncSession,
    payroll_run_id: UUID,
    organisation_id: UUID,
    user_id: UUID,
) -> PayrollRun:
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if organisation_id and str(payroll.organisation_id) != str(organisation_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    if _is_locked(payroll):
        raise HTTPException(status_code=403, detail="Payroll run is already locked")

    if (payroll.lifecycle_status or "").lower() != LIFECYCLE_VERIFIED:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lifecycle state for approve: expected {LIFECYCLE_VERIFIED}",
        )

    now = datetime.now(timezone.utc)
    payroll.lifecycle_status = LIFECYCLE_APPROVED
    payroll.lifecycle_approved_at = now
    payroll.lifecycle_approved_by = user_id
    db.add(payroll)
    await db.commit()
    await db.refresh(payroll)

    await record_lifecycle_audit(
        db,
        organisation_id=payroll.organisation_id,
        user_id=user_id,
        action=ACTION_APPROVE,
        entity_type="payroll_run",
        entity_id=payroll_run_id,
        detail=None,
    )
    return payroll


async def lock_payroll_lifecycle(
    db: AsyncSession,
    payroll_run_id: UUID,
    organisation_id: UUID,
    user_id: UUID,
) -> PayrollRun:
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if organisation_id and str(payroll.organisation_id) != str(organisation_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    if (payroll.lifecycle_status or "").lower() != LIFECYCLE_APPROVED:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lifecycle state for lock: expected {LIFECYCLE_APPROVED}",
        )

    snapshot = await build_final_snapshot(db, payroll_run_id)
    now = datetime.now(timezone.utc)
    payroll.lifecycle_status = LIFECYCLE_LOCKED
    payroll.payroll_locked_at = now
    payroll.lifecycle_locked_by = user_id
    payroll.final_snapshot = snapshot
    db.add(payroll)
    await db.commit()
    await db.refresh(payroll)

    await record_lifecycle_audit(
        db,
        organisation_id=payroll.organisation_id,
        user_id=user_id,
        action=ACTION_LOCK,
        entity_type="payroll_run",
        entity_id=payroll_run_id,
        detail={"entry_count": snapshot.get("entry_count")},
    )
    return payroll


def require_payroll_locked_for_payslip(payroll: PayrollRun) -> None:
    if (payroll.lifecycle_status or "").lower() != LIFECYCLE_LOCKED:
        raise ValueError(
            "Payslip is only available after payroll is locked (Phase 4 finalization)."
        )


async def list_lifecycle_audit_for_run(
    db: AsyncSession,
    payroll_run_id: UUID,
    organisation_id: UUID,
    limit: int = 100,
) -> list[dict[str, Any]]:
    q = await db.execute(
        select(PayrollLifecycleAuditLog)
        .where(
            PayrollLifecycleAuditLog.entity_type == "payroll_run",
            PayrollLifecycleAuditLog.entity_id == payroll_run_id,
            PayrollLifecycleAuditLog.organisation_id == organisation_id,
        )
        .order_by(PayrollLifecycleAuditLog.created_at.desc())
        .limit(limit)
    )
    rows = q.scalars().all()
    return [
        {
            "audit_id": str(r.audit_id),
            "organisation_id": str(r.organisation_id),
            "user_id": str(r.user_id) if r.user_id else None,
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": str(r.entity_id),
            "detail": r.detail,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
