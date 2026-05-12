"""Aggregate PayrollRun after Celery employee tasks complete."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.payroll_models import PayPeriod, PayrollEntry, PayrollRun

from services.payroll_redis_service import (
    clear_remaining_counter,
    get_redis,
    release_payroll_run_lock,
)


async def finalize_payroll_run_aggregate(payroll_run_id: UUID) -> None:
    from database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await _finalize_payroll_run_aggregate_session(db, payroll_run_id)


async def _finalize_payroll_run_aggregate_session(db: AsyncSession, payroll_run_id: UUID) -> None:
    row = await db.execute(select(PayrollRun).where(PayrollRun.payroll_run_id == payroll_run_id))
    payroll = row.scalar_one_or_none()
    if not payroll:
        return

    q = await db.execute(select(PayrollEntry).where(PayrollEntry.payroll_run_id == payroll_run_id))
    entries = q.scalars().all()

    earnings = Decimal("0")
    deduction_lines = Decimal("0")
    statutory_lines = Decimal("0")
    employer = Decimal("0")

    for en in entries:
        em = en.meta or {}
        cat = (em.get("category") or "").lower()
        amt = Decimal(str(en.amount))
        if cat == "earning":
            earnings += amt
        elif cat == "employer_contribution":
            employer += amt
        elif cat == "statutory":
            statutory_lines += amt
        elif cat == "deduction":
            deduction_lines += amt
        else:
            deduction_lines += amt

    net_pay = earnings - deduction_lines - statutory_lines

    gross_total = earnings
    meta = dict(payroll.execution_meta or {})

    r = get_redis()
    fail_raw = r.lrange(f"payroll:run:{payroll_run_id}:failures", 0, -1)
    failures: list[dict] = []
    for fr in fail_raw or []:
        try:
            failures.append(json.loads(fr))
        except json.JSONDecodeError:
            failures.append({"raw": fr})

    shadow_parts: list[dict] = []
    sr_raw = r.lrange(f"payroll:run:{payroll_run_id}:shadow", 0, -1)
    for sr in sr_raw or []:
        try:
            shadow_parts.append(json.loads(sr))
        except json.JSONDecodeError:
            shadow_parts.append({"raw": sr})

    failed_ct = len(failures)
    ok_emp = {str(e.employee_id) for e in entries}
    ok_ct = len(ok_emp)

    if failed_ct > 0 and ok_ct > 0:
        exec_status = "partial_success"
    elif failed_ct > 0 and ok_ct == 0:
        exec_status = "failed"
    else:
        exec_status = "completed"

    aggregate_totals = {
        "earnings": float(earnings),
        "deductions": float(deduction_lines),
        "statutory_employee": float(statutory_lines),
        "employer_contributions": float(employer),
        "net_pay": float(net_pay),
    }

    meta["aggregate_totals"] = aggregate_totals
    meta["employee_failures"] = failures
    if shadow_parts:
        meta["shadow_report"] = {"employees": shadow_parts}

    payroll.gross_pay_total = gross_total.quantize(Decimal("0.01"))
    payroll.net_pay_total = net_pay.quantize(Decimal("0.01"))
    payroll.status = "processed"
    payroll.processed_at = datetime.now(timezone.utc)
    payroll.execution_status = exec_status
    payroll.execution_meta = meta

    from services.payroll_lifecycle_guard import mark_run_ready_for_review

    mark_run_ready_for_review(payroll)

    await db.execute(
        update(PayPeriod)
        .where(PayPeriod.pay_period_id == payroll.pay_period_id)
        .values(
            attendance_leave_locked=True,
            locked_at=datetime.now(timezone.utc),
            locked_by_payroll_run_id=payroll_run_id,
        )
    )
    db.add(payroll)
    await db.commit()

    clear_remaining_counter(payroll_run_id)
    release_payroll_run_lock(payroll_run_id)
    r.delete(f"payroll:run:{payroll_run_id}:failures")
    r.delete(f"payroll:run:{payroll_run_id}:shadow")
