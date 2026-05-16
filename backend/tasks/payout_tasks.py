from __future__ import annotations

import asyncio
import time
from uuid import UUID

import httpx
from celery.utils.log import get_task_logger
from sqlalchemy import select

from celery_app import celery_app
from database import AsyncSessionLocal
from models.disbursement_models import SalaryBatch, SalaryBatchItem
from models.employee_banking_models import EmployeeBankAccount
from models.provider_models import ProviderPayout
from models.user_models import User
from providers.registry import resolve_provider
from providers.base.provider import PayoutRequest
from services.disbursement_batch_items import ensure_batch_items_from_payroll
from services.provider_beneficiary_service import ensure_provider_beneficiary
from services.fraud_engine import evaluate_payout_risk
from services.audit_service import audit_log
from services.notification_service import create_notification
from services.event_bus import publish_event
from services.payout_sync_service import (
    map_provider_status_to_item_status,
    recompute_batch_status_from_items,
    sync_provider_payout_to_batch,
)
from utils.currency_inr import decimal_to_paise
from services.banking_metrics import PAYOUT_TASK_DURATION
from providers.razorpayx.errors import RazorpayXAPIError
from utils.celery_dedup import acquire_task_slot, release_task_slot
from utils.banking_log import log_banking, new_correlation_id


log = get_task_logger(__name__)


async def _run_payout(db, batch: SalaryBatch, *, max_attempts: int = 3):
    if batch.status not in {"approved", "payout_in_progress", "failed"}:
        raise ValueError("Batch not approved for payout")

    if batch.disbursement_mode and batch.disbursement_mode != "api":
        raise ValueError("Batch is not in API disbursement mode")

    batch.status = "payout_in_progress"
    await db.flush()

    res = await db.execute(select(SalaryBatchItem).where(SalaryBatchItem.batch_id == batch.batch_id))
    items = list(res.scalars().all())
    any_failed = False
    transient_errors: list[Exception] = []

    from datetime import datetime, timezone

    provider = await resolve_provider(db, batch.organisation_id)

    for item in items:
        if item.status == "success":
            continue
        if item.attempts >= max_attempts:
            any_failed = True
            continue
        if item.status == "held":
            any_failed = True
            continue

        item.attempts += 1
        item.last_attempt_at = datetime.now(tz=timezone.utc)

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

        ben = await ensure_provider_beneficiary(
            db,
            organisation_id=batch.organisation_id,
            provider=provider,
            employee_bank_account_id=item.employee_bank_account_id,
        )

        existing_payout = await db.execute(
            select(ProviderPayout).where(ProviderPayout.salary_batch_item_id == item.item_id)
        )
        pp = existing_payout.scalar_one_or_none()
        if pp:
            item.payout_ref = pp.provider_payout_ref
            item.status = map_provider_status_to_item_status(pp.status)
            if item.status == "failed":
                item.failure_reason = pp.failure_reason
                any_failed = True
            continue

        try:
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

            amount_paise = decimal_to_paise(item.amount)
            resp = await provider.initiate_payout(
                PayoutRequest(
                    amount_inr=amount_paise,
                    beneficiary_id=ben.provider_ref,
                    reference_id=f"{batch.organisation_id}:{batch.batch_id}:{item.item_id}",
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
            await sync_provider_payout_to_batch(
                db,
                provider_payout=pp,
                provider_status=resp.status,
                utr=resp.utr,
                raw=resp.raw,
            )
            if item.status == "failed":
                any_failed = True

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

            await evaluate_payout_risk(
                db,
                organisation_id=batch.organisation_id,
                batch_id=batch.batch_id,
                item=item,
                provider_payout=pp,
            )
        except RazorpayXAPIError as e:
            item.status = "failed"
            item.failure_reason = f"{e.error_code or 'provider_error'}: {e}"
            any_failed = True
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            item.status = "failed"
            item.failure_reason = f"network_error: {e}"
            any_failed = True
            transient_errors.append(e)
        except Exception as e:
            item.status = "failed"
            item.failure_reason = str(e)
            any_failed = True

    await db.flush()
    await recompute_batch_status_from_items(db, batch)

    if batch.status == "payout_in_progress" and not any_failed:
        res2 = await db.execute(
            select(SalaryBatchItem.status).where(SalaryBatchItem.batch_id == batch.batch_id)
        )
        statuses = [r[0] for r in res2.all()]
        if statuses and all(s == "success" for s in statuses):
            batch.status = "paid"
        elif any(s == "failed" for s in statuses):
            batch.status = "failed"
    await db.flush()

    await publish_event(
        db,
        organisation_id=batch.organisation_id,
        event_type="payout.completed",
        dedupe_key=f"payout.completed:{batch.batch_id}:{batch.status}",
        payload={"batch_id": str(batch.batch_id), "batch_ref": batch.batch_ref, "status": batch.status},
    )

    if transient_errors:
        raise TransientPayoutError(str(transient_errors[0]))


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
    soft_time_limit=120,
    time_limit=180,
)
def process_salary_batch(batch_id: str):
    dedup_key = f"payout:process:{batch_id}"
    if not acquire_task_slot(dedup_key, ttl_seconds=7200):
        log.info("Skipping duplicate payout task for batch %s", batch_id)
        return {"skipped": True, "batch_id": batch_id}

    new_correlation_id()

    async def _go():
        async with AsyncSessionLocal() as db:
            async with db.begin():
                batch = await db.get(SalaryBatch, UUID(batch_id))
                if not batch:
                    raise PermanentPayoutError("Batch not found")
                await ensure_batch_items_from_payroll(db, batch)
                await _run_payout(db, batch)

    log.info("Processing salary batch %s", batch_id)
    started = time.perf_counter()
    try:
        result = asyncio.run(_go())
        PAYOUT_TASK_DURATION.observe(time.perf_counter() - started)
        log_banking(log, "payout.task_completed", batch_id=batch_id)
        return result
    except PermanentPayoutError:
        release_task_slot(dedup_key)
        raise
    except TransientPayoutError:
        release_task_slot(dedup_key)
        raise
    except Exception:
        log.exception("Permanent payout failure for batch %s", batch_id)
        release_task_slot(dedup_key)
        raise


@celery_app.task(
    name="payout.retry_failed_items",
    autoretry_for=(TransientPayoutError,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=5,
    soft_time_limit=120,
    time_limit=180,
)
def retry_failed_items(batch_id: str):
    async def _go():
        async with AsyncSessionLocal() as db:
            async with db.begin():
                batch = await db.get(SalaryBatch, UUID(batch_id))
                if not batch:
                    raise PermanentPayoutError("Batch not found")
                if batch.disbursement_mode and batch.disbursement_mode != "api":
                    raise PermanentPayoutError("Batch is not in API disbursement mode")
                await _run_payout(db, batch)

    log.info("Retrying failed items for batch %s", batch_id)
    started = time.perf_counter()
    try:
        result = asyncio.run(_go())
        PAYOUT_TASK_DURATION.observe(time.perf_counter() - started)
        return result
    except PermanentPayoutError:
        raise
    except TransientPayoutError:
        raise
    except Exception:
        log.exception("Permanent retry failure for batch %s", batch_id)
        raise
