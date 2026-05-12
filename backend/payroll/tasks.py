"""
Celery orchestration for payroll — calls preview_salary_v2 only via run_preview_job.

No Phase 2 formula/statutory logic duplicated here.
"""

from __future__ import annotations

import asyncio
import json
import os
import traceback
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID, uuid4

from payroll.celery_app import celery_app


def _run_async(coro):
    return asyncio.run(coro)


@celery_app.task(name="payroll.process_employee_payroll", bind=True)
def process_employee_payroll_task(
    self,
    payroll_run_id: str,
    employee_id: str,
    job_dict: dict,
    execution_trace_id: str,
    input_fingerprint: str,
    pay_period_id: str,
    organisation_id: str,
    as_of_iso: str,
    shadow_mode: bool = False,
):
    from datetime import date as date_cls

    from fastapi.encoders import jsonable_encoder
    from sqlalchemy import delete, select
    from sqlalchemy.ext.asyncio import AsyncSession

    from database import AsyncSessionLocal
    from models.payroll_models import PayrollEntry, PayrollRun
    from services.payroll_phase2_bundle_loader import load_phase2_engine_bundle
    from services.payroll_redis_service import decrement_remaining_and_maybe_finalize, get_redis
    from services.payroll_worker_sync import PreviewJobPayload, run_preview_job
    from crud.salary_crud import get_salary_component, get_template_components
    from services.salary_calculator import calculate_salary

    rid = UUID(payroll_run_id)
    eid = UUID(employee_id)
    oid = UUID(organisation_id)
    ppid = UUID(pay_period_id)

    async def _fail_record(err_msg: str) -> None:
        get_redis().rpush(
            f"payroll:run:{payroll_run_id}:failures",
            json.dumps(
                {
                    "employee_id": employee_id,
                    "error": err_msg,
                    "celery_task_id": self.request.id,
                    "traceback": traceback.format_exc()[-8000:],
                }
            ),
        )

    async def _work(db: AsyncSession) -> dict:
        as_of = date_cls.fromisoformat(as_of_iso)
        org_scope = SimpleNamespace(organisation_id=oid)

        tpl_id = UUID(str(job_dict["template_id"]))
        ctc = Decimal(str(job_dict["ctc"]))
        overrides = dict(job_dict.get("overrides") or {})
        wf_raw = job_dict.get("wage_proration_factor")
        wf = Decimal(str(wf_raw)) if wf_raw is not None else None

        bundle = await load_phase2_engine_bundle(
            db,
            template_id=tpl_id,
            as_of=as_of,
            current_user=org_scope,
        )

        pl = PreviewJobPayload(
            as_of=as_of,
            ctc=ctc,
            template_components=bundle["template_components"],
            component_map_by_id=bundle["component_map_by_id"],
            derived_variables=bundle["derived_variables"],
            template_groups=bundle["template_groups"],
            group_items_by_group_id=bundle["group_items_by_group_id"],
            statutory_cfg_by_code=bundle["statutory_cfg_by_code"],
            employee_overrides=overrides,
            wage_proration_factor=wf,
        )

        max_attempts = int(os.getenv("PAYROLL_EMPLOYEE_MAX_ATTEMPTS", "4"))
        last_exc: Exception | None = None
        res = None
        for attempt in range(max_attempts):
            try:
                res = await asyncio.to_thread(run_preview_job, pl)
                if res.errors:
                    raise ValueError("; ".join(res.errors[:8]))
                break
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if attempt < max_attempts - 1:
                    await asyncio.sleep(min(120.0, 2.0**attempt))
                else:
                    raise last_exc from None

        await db.execute(
            delete(PayrollEntry).where(
                PayrollEntry.payroll_run_id == rid,
                PayrollEntry.employee_id == eid,
            )
        )

        pr_row = await db.execute(select(PayrollRun).where(PayrollRun.payroll_run_id == rid))
        pr = pr_row.scalar_one_or_none()
        if not pr:
            raise ValueError("Payroll run not found")

        celery_meta = {
            "celery_task_id": self.request.id,
            "celery_retries": getattr(self.request, "retries", 0),
            "execution_timestamp": datetime.now(timezone.utc).isoformat(),
            "input_fingerprint": input_fingerprint,
            "payroll_phase": "3c",
        }

        for idx, ln in enumerate(res.lines):
            meta = {
                "execution_trace_id": execution_trace_id,
                "engine": "salary_engine_v2",
                **celery_meta,
                "line_index": idx,
                "component_code": ln.component_code,
                "category": ln.category,
                "source": ln.source,
                "breakdown": jsonable_encoder(ln.breakdown) if ln.breakdown else None,
            }
            db.add(
                PayrollEntry(
                    payroll_run_id=rid,
                    employee_id=eid,
                    component_id=ln.component_id,
                    pay_period_id=ppid,
                    amount=ln.amount,
                    meta=meta,
                )
            )

        if shadow_mode:
            try:
                comps = await get_template_components(db, tpl_id, org_scope)
                cmap = {}
                for c in comps:
                    cmap[c.component_id] = await get_salary_component(db, c.component_id, org_scope)
                leg = calculate_salary(comps, cmap, ctc)
                shadow_blob = {
                    "employee_id": employee_id,
                    "phase3_earnings": float(res.totals.get("earnings", Decimal("0"))),
                    "phase3_net_pay": float(res.totals.get("net_pay", Decimal("0"))),
                    "legacy_gross": leg["gross_salary"],
                    "legacy_net": leg["net_salary"],
                }
                get_redis().rpush(f"payroll:run:{payroll_run_id}:shadow", json.dumps(shadow_blob))
            except Exception as se:  # noqa: BLE001
                get_redis().rpush(
                    f"payroll:run:{payroll_run_id}:shadow",
                    json.dumps({"employee_id": employee_id, "error": str(se)}),
                )

        await db.commit()
        return {
            "employee_id": employee_id,
            "status": "ok",
            "totals": {k: float(v) for k, v in res.totals.items()},
        }

    try:

        async def _inner():
            async with AsyncSessionLocal() as db:
                return await _work(db)

        result = _run_async(_inner())
    except Exception as exc:  # noqa: BLE001

        async def _inner_fail():
            await _fail_record(str(exc))

        _run_async(_inner_fail())
        result = {"employee_id": employee_id, "status": "failed", "error": str(exc)}

    should_finalize = decrement_remaining_and_maybe_finalize(rid)
    if should_finalize:
        payroll_aggregate_run_task.delay(payroll_run_id)

    return result


@celery_app.task(name="payroll.aggregate_run")
def payroll_aggregate_run_task(payroll_run_id: str):
    from payroll.finalize import finalize_payroll_run_aggregate

    _run_async(finalize_payroll_run_aggregate(UUID(payroll_run_id)))


@celery_app.task(name="payroll.orchestrate_run", bind=True)
def payroll_orchestrate_run_task(self, payroll_run_id: str, processed_by: str, shadow_mode: bool = False):
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession

    from database import AsyncSessionLocal
    from models.payroll_models import PayrollRun
    from services.payroll_redis_service import (
        clear_remaining_counter,
        init_remaining_counter,
        try_acquire_payroll_run_lock,
        release_payroll_run_lock,
        idempotency_set_run_id,
    )
    from services.payroll_run_gather import (
        gather_payroll_inputs,
        build_input_snapshot_payload,
        compute_input_fingerprint,
    )
    from payroll.finalize import finalize_payroll_run_aggregate

    async def _orch(db: AsyncSession) -> dict:
        rid = UUID(payroll_run_id)
        row = await db.execute(select(PayrollRun).where(PayrollRun.payroll_run_id == rid))
        payroll = row.scalar_one_or_none()
        if not payroll:
            raise ValueError("Payroll run not found")
        if payroll.status == "processed":
            return {"skipped": True, "reason": "already_processed"}
        if payroll.execution_status in ("running", "queued"):
            return {"skipped": True, "reason": "already_in_progress"}

        if not try_acquire_payroll_run_lock(rid):
            return {"skipped": True, "reason": "lock_not_acquired"}

        gathered = await gather_payroll_inputs(db, rid)
        input_snapshot = build_input_snapshot_payload(gathered)
        input_fp = compute_input_fingerprint(gathered)
        idempotency_set_run_id(gathered.organisation_id, input_fp, rid)

        exec_trace = uuid4()
        processed_uuid = UUID(processed_by) if processed_by else None

        payroll.execution_status = "queued"
        payroll.execution_trace_id = exec_trace
        payroll.processed_by = processed_uuid
        meta = dict(payroll.execution_meta or {})
        meta.update(
            {
                "celery_orchestrator_task_id": self.request.id,
                "input_snapshot": input_snapshot,
                "input_fingerprint": input_fp,
                "orchestration": "celery",
                "shadow_mode": shadow_mode,
            }
        )
        payroll.execution_meta = meta
        payroll.execution_status = "running"
        db.add(payroll)
        await db.commit()

        jobs = gathered.jobs
        n = len(jobs)
        if n == 0:
            await finalize_payroll_run_aggregate(rid)
            return {"employees": 0, "finalized": True}

        init_remaining_counter(rid, n)
        as_of_iso = str(gathered.as_of)

        for job in jobs:
            jd = {
                "template_id": str(job.template_id),
                "ctc": format(job.ctc, "f"),
                "overrides": job.overrides,
                "wage_proration_factor": format(job.wage_proration_factor, "f")
                if job.wage_proration_factor is not None
                else None,
            }
            process_employee_payroll_task.delay(
                payroll_run_id,
                str(job.employee_id),
                jd,
                str(exec_trace),
                input_fp,
                str(payroll.pay_period_id),
                str(gathered.organisation_id),
                as_of_iso,
                shadow_mode,
            )

        return {"employees_queued": n, "execution_trace_id": str(exec_trace)}

    async def _runner():
        async with AsyncSessionLocal() as db:
            try:
                return await _orch(db)
            except Exception:
                release_payroll_run_lock(UUID(payroll_run_id))
                clear_remaining_counter(UUID(payroll_run_id))
                raise

    return _run_async(_runner())
