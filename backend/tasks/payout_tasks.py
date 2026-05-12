from __future__ import annotations

import asyncio
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from celery.utils.log import get_task_logger
from sqlalchemy import and_, select

from celery_app import celery_app
from database import AsyncSessionLocal
from models.disbursement_models import SalaryBatch, SalaryBatchItem
from models.employee_banking_models import EmployeeBankAccount
from models.provider_models import ProviderBeneficiary, ProviderPayout
from models.payroll_models import PayrollEntry, PayPeriod
from models.salary_models import SalaryComponent
from models.user_models import User
from providers.registry import get_provider
from providers.base.provider import BeneficiaryCreateRequest, PayoutRequest
from services.bank_file_service import generate_bank_file_for_batch
from services.provider_beneficiary_service import ensure_provider_beneficiary
from services.fraud_engine import evaluate_payout_risk
from services.audit_service import audit_log
from services.notification_service import create_notification
from services.event_bus import publish_event


log = get_task_logger(__name__)


@dataclass(frozen=True)
class EmployeeNetPay:
    employee_id: UUID
    net_pay: Decimal


async def _compute_net_pay_by_employee(db, payroll_run_id: UUID) -> list[EmployeeNetPay]:
    res = await db.execute(select(PayrollEntry).where(PayrollEntry.payroll_run_id == payroll_run_id))
    entries = list(res.scalars().all())
    if not entries:
        return []

    component_ids = {e.component_id for e in entries}
    comp_res = await db.execute(select(SalaryComponent).where(SalaryComponent.component_id.in_(component_ids)))
    comps = {c.component_id: c for c in comp_res.scalars().all()}

    by_emp: dict[UUID, Decimal] = {}
    for e in entries:
        comp = comps.get(e.component_id)
        if not comp:
            continue
        amt = Decimal(e.amount)
        # convention: component_type includes "deduction" for deductions
        is_deduction = "deduction" in (comp.component_type or "").lower()
        by_emp.setdefault(e.employee_id, Decimal("0"))
        by_emp[e.employee_id] += (-amt if is_deduction else amt)

    return [EmployeeNetPay(employee_id=k, net_pay=v) for k, v in by_emp.items()]


async def _get_primary_verified_bank_account(db, employee_id: UUID, effective_date) -> EmployeeBankAccount | None:
    res = await db.execute(
        select(EmployeeBankAccount)
        .where(
            and_(
                EmployeeBankAccount.employee_id == employee_id,
                EmployeeBankAccount.is_active.is_(True),
                EmployeeBankAccount.is_primary.is_(True),
                EmployeeBankAccount.verification_status == "verified",
                EmployeeBankAccount.effective_from <= effective_date,
            )
        )
        .order_by(EmployeeBankAccount.effective_from.desc())
    )
    return res.scalars().first()


async def _ensure_items(db, batch: SalaryBatch):
    items_res = await db.execute(select(SalaryBatchItem).where(SalaryBatchItem.batch_id == batch.batch_id))
    if items_res.first():
        return

    period = await db.get(PayPeriod, batch.pay_period_id)
    if not period:
        raise ValueError("Pay period not found")

    netpays = await _compute_net_pay_by_employee(db, batch.payroll_run_id)
    total_amt = Decimal("0")
    total_emp = 0

    for np in netpays:
        if np.net_pay <= 0:
            continue
        acct = await _get_primary_verified_bank_account(db, np.employee_id, period.end_date)
        if not acct:
            item = SalaryBatchItem(
                batch_id=batch.batch_id,
                employee_id=np.employee_id,
                employee_bank_account_id=None,  # type: ignore[arg-type]
                amount=np.net_pay,
                status="failed",
                failure_reason="Missing verified primary bank account",
            )
            db.add(item)
            continue

        item = SalaryBatchItem(
            batch_id=batch.batch_id,
            employee_id=np.employee_id,
            employee_bank_account_id=acct.bank_account_id,
            amount=np.net_pay,
            status="pending",
        )
        total_amt += np.net_pay
        total_emp += 1
        db.add(item)

    batch.total_amount = total_amt
    batch.total_employees = total_emp
    await db.flush()


async def _run_payout(db, batch: SalaryBatch, *, max_attempts: int = 3):
    if batch.status not in {"approved", "payout_in_progress"}:
        raise ValueError("Batch not approved for payout")

    batch.status = "payout_in_progress"
    await db.flush()

    res = await db.execute(select(SalaryBatchItem).where(SalaryBatchItem.batch_id == batch.batch_id))
    items = list(res.scalars().all())
    any_failed = False

    from datetime import datetime, timezone

    provider = get_provider()

    for item in items:
        if item.status == "success":
            continue
        if item.attempts >= max_attempts:
            any_failed = True
            continue
        if item.status == "held":
            continue

        item.attempts += 1
        item.last_attempt_at = datetime.now(tz=timezone.utc)

        # Provider-backed payout (Phase 2A)
        if not item.employee_bank_account_id:
            item.status = "failed"
            item.failure_reason = "Missing bank account"
            any_failed = True
            continue

        acct = await db.get(EmployeeBankAccount, item.employee_bank_account_id)
        if not acct:
            item.status = "failed"
            item.failure_reason = "Bank account not found"
            any_failed = True
            continue

        # Ensure beneficiary exists for this bank account in provider
        ben = await ensure_provider_beneficiary(
            db,
            organisation_id=batch.organisation_id,
            provider=provider,
            employee_bank_account_id=item.employee_bank_account_id,
        )

        # Idempotent payout per batch item (unique constraint on salary_batch_item_id)
        existing_payout = await db.execute(
            select(ProviderPayout).where(ProviderPayout.salary_batch_item_id == item.item_id)
        )
        pp = existing_payout.scalar_one_or_none()
        if pp:
            item.payout_ref = pp.provider_payout_ref
            if pp.status in {"processed", "success"}:
                item.status = "success"
            elif pp.status in {"failed", "reversed"}:
                item.status = "failed"
                item.failure_reason = pp.failure_reason
                any_failed = True
            continue

        try:
            # Phase 2C: baseline fraud checks pre-payout. If high/critical, hold for review.
            rs = await evaluate_payout_risk(
                db,
                organisation_id=batch.organisation_id,
                batch_id=batch.batch_id,
                item=item,
                provider_payout=None,
            )
            if rs.band in {"high", "critical"}:
                item.status = "held"
                item.failure_reason = f"Held for fraud review (risk={rs.band}:{rs.score})"
                await audit_log(
                    db,
                    organisation_id=batch.organisation_id,
                    actor_id=None,
                    actor_role="system",
                    action="fraud.held_batch_item",
                    entity="salary_batch_item",
                    entity_id=item.item_id,
                    before={},
                    after={"status": "held", "risk": {"score": rs.score, "band": rs.band}},
                    extra={"rule_signals": rs.signals},
                )
                # Notify finance users in org (best-effort)
                fin = await db.execute(
                    select(User).where(User.organisation_id == batch.organisation_id, User.role == "finance")
                )
                for u in fin.scalars().all():
                    await create_notification(
                        db,
                        organisation_id=batch.organisation_id,
                        user_id=u.user_id,
                        kind="fraud_alert",
                        title="Payout held for fraud review",
                        body=f"Batch {batch.batch_ref} item {item.item_id} held (risk={rs.band}:{rs.score}).",
                        data={"batch_id": str(batch.batch_id), "item_id": str(item.item_id)},
                    )
                any_failed = True
                continue

            resp = await provider.initiate_payout(
                PayoutRequest(
                    amount_inr=int(item.amount),
                    beneficiary_id=ben.provider_ref,
                    reference_id=f"{batch.batch_ref}:{item.item_id}",
                    narration="Salary payout",
                )
            )
            pp = ProviderPayout(
                organisation_id=batch.organisation_id,
                provider_code=provider.provider_code,
                salary_batch_id=batch.batch_id,
                salary_batch_item_id=item.item_id,
                provider_beneficiary_ref=ben.provider_ref,
                provider_payout_ref=resp.provider_payout_id,
                status=resp.status,
                utr=resp.utr,
                raw=resp.raw,
            )
            db.add(pp)
            item.payout_ref = resp.provider_payout_id
            item.status = "success" if resp.status in {"processed", "success"} else "pending"

            await publish_event(
                db,
                organisation_id=batch.organisation_id,
                event_type="payout.initiated",
                dedupe_key=f"payout.initiated:{item.item_id}",
                payload={
                    "batch_id": str(batch.batch_id),
                    "item_id": str(item.item_id),
                    "provider_payout_id": str(pp.provider_payout_id),
                    "provider_payout_ref": pp.provider_payout_ref,
                    "status": pp.status,
                },
            )

            # attach risk score after provider response as well (captures provider_payout_id for linking)
            await evaluate_payout_risk(
                db,
                organisation_id=batch.organisation_id,
                batch_id=batch.batch_id,
                item=item,
                provider_payout=pp,
            )
        except Exception as e:
            item.status = "failed"
            item.failure_reason = str(e)
            any_failed = True

    await db.flush()

    # finalize batch status
    res2 = await db.execute(select(SalaryBatchItem.status).where(SalaryBatchItem.batch_id == batch.batch_id))
    statuses = [r[0] for r in res2.all()]
    if statuses and all(s == "success" for s in statuses):
        batch.status = "paid"
    elif any(s == "failed" for s in statuses):
        batch.status = "failed"
    else:
        batch.status = "payout_in_progress"
    await db.flush()

    await publish_event(
        db,
        organisation_id=batch.organisation_id,
        event_type="payout.completed",
        dedupe_key=f"payout.completed:{batch.batch_id}:{batch.status}",
        payload={"batch_id": str(batch.batch_id), "batch_ref": batch.batch_ref, "status": batch.status},
    )


class TransientPayoutError(Exception):
    pass


class PermanentPayoutError(Exception):
    pass


@celery_app.task(
    name="payout.process_salary_batch",
    autoretry_for=(TransientPayoutError,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=5,
    soft_time_limit=60,
    time_limit=90,
)
def process_salary_batch(batch_id: str):
    async def _go():
        async with AsyncSessionLocal() as db:
            async with db.begin():
                batch = await db.get(SalaryBatch, UUID(batch_id))
                if not batch:
                    raise PermanentPayoutError("Batch not found")
                await _ensure_items(db, batch)
                await _run_payout(db, batch)

    log.info("Processing salary batch %s", batch_id)
    try:
        return asyncio.run(_go())
    except PermanentPayoutError:
        raise
    except Exception as e:
        # Default to transient to prevent drops on infra glitches.
        raise TransientPayoutError(str(e)) from e


@celery_app.task(
    name="payout.retry_failed_items",
    autoretry_for=(TransientPayoutError,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=5,
    soft_time_limit=60,
    time_limit=90,
)
def retry_failed_items(batch_id: str):
    async def _go():
        async with AsyncSessionLocal() as db:
            async with db.begin():
                batch = await db.get(SalaryBatch, UUID(batch_id))
                if not batch:
                    raise PermanentPayoutError("Batch not found")
                await _run_payout(db, batch)

    log.info("Retrying failed items for batch %s", batch_id)
    try:
        return asyncio.run(_go())
    except PermanentPayoutError:
        raise
    except Exception as e:
        raise TransientPayoutError(str(e)) from e

