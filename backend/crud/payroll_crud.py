# payroll_mnagment/crud/payroll_crud.py

import asyncio
import logging
import os
from typing import Optional
from uuid import UUID, uuid4
from decimal import Decimal
from types import SimpleNamespace

from datetime import datetime, timezone

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from datetime import date

from models.org_models import Organisation
from models.payroll_models import PayPeriod, PayrollRun, PayrollEntry
from models.employee_model import Employee
from models.salary_models import SalaryComponent

from schemas.payroll_schemas import (
    PayPeriodCreate,
    PayrollRunCreate,
    PayrollEntryCreate
)

from services.payroll_run_gather import (
    PayrollEmployeeJob,
    gather_payroll_inputs,
    build_input_snapshot_payload,
    compute_input_fingerprint,
)
from services.payroll_worker_sync import PreviewJobPayload, run_preview_job
from services.payroll_dag_introspection import build_phase2_dag_plan_from_bundle
from services.salary_engine_v2 import preview_salary_v2
from services.payroll_lifecycle_guard import (
    assert_not_locked_value_error,
    mark_run_ready_for_review,
)
from services.payroll_component_bucket import aggregate_payroll_run_totals


def _employee_age_years(dob: date | None, on_date: date) -> int | None:
    """
    Pure helper used by statutory engines and unit tests.
    Returns whole years as of on_date, or None if dob is missing.
    """
    if dob is None:
        return None
    years = on_date.year - dob.year
    if (on_date.month, on_date.day) < (dob.month, dob.day):
        years -= 1
    return years


def _statutory_effective_map(rows: list, on_date: date) -> dict:
    """
    Pure helper: pick latest effective row per statutory_code for on_date.
    Row is eligible if effective_from <= on_date and (effective_to is None or effective_to >= on_date).
    """
    out: dict[str, dict] = {}
    for r in rows:
        code = getattr(r, "statutory_code", None)
        if not code:
            continue
        eff_from = getattr(r, "effective_from", None)
        eff_to = getattr(r, "effective_to", None)
        if eff_from and eff_from > on_date:
            continue
        if eff_to and eff_to < on_date:
            continue

        prev = out.get(code)
        if not prev:
            out[code] = {
                "effective_from": eff_from,
                "effective_to": eff_to,
                "settings": getattr(r, "settings", None),
                "is_enabled": getattr(r, "is_enabled", None),
                "organisation_id": getattr(r, "organisation_id", None),
            }
            continue

        prev_from = prev.get("effective_from")
        if prev_from is None or (eff_from is not None and eff_from >= prev_from):
            out[code] = {
                "effective_from": eff_from,
                "effective_to": eff_to,
                "settings": getattr(r, "settings", None),
                "is_enabled": getattr(r, "is_enabled", None),
                "organisation_id": getattr(r, "organisation_id", None),
            }
    return out

# ============================================================
# PAY PERIOD CRUD
# ============================================================

async def create_pay_period(
    db: AsyncSession,
    payload: PayPeriodCreate,
    *,
    organisation_id: UUID,
) -> PayPeriod:

    """Create a new pay period ensuring no overlap (tenant-scoped)."""

    if str(payload.organisation_id) != str(organisation_id):
        raise ValueError("organisation_id must match the authenticated organisation")

    q = await db.execute(
        select(PayPeriod).filter(
            PayPeriod.organisation_id == organisation_id,
            PayPeriod.start_date <= payload.end_date,
            PayPeriod.end_date >= payload.start_date
        )
    )

    if q.scalar_one_or_none():
        raise ValueError("Overlapping pay period exists for this organisation")

    data = payload.model_dump()
    data["organisation_id"] = organisation_id
    pay_period = PayPeriod(**data)

    try:
        db.add(pay_period)
        await db.commit()
        await db.refresh(pay_period)
        return pay_period

    except IntegrityError:
        await db.rollback()
        raise ValueError("Failed to create pay period")


async def get_pay_period(
    db: AsyncSession,
    pay_period_id: UUID
) -> Optional[PayPeriod]:

    q = await db.execute(
        select(PayPeriod).filter(PayPeriod.pay_period_id == pay_period_id)
    )

    return q.scalar_one_or_none()


# ============================================================
# PAYROLL RUN (HEADER)
# ============================================================

async def create_payroll(
    db: AsyncSession,
    payload: PayrollRunCreate,
    *,
    organisation_id: UUID,
) -> PayrollRun:

    """Create a payroll run (tenant-scoped)."""

    if str(payload.organisation_id) != str(organisation_id):
        raise ValueError("organisation_id must match the authenticated organisation")

    pay_period = await get_pay_period(db, payload.pay_period_id)

    if not pay_period:
        raise ValueError("Pay period not found")

    if str(pay_period.organisation_id) != str(organisation_id):
        raise ValueError("Pay period not found")

    if pay_period.status != "open":
        raise ValueError("Pay period is not open")

    data = payload.model_dump()
    data["organisation_id"] = organisation_id

    from services.payroll_process_policy import build_creation_execution_meta

    org_row = await db.execute(
        select(Organisation).where(Organisation.organisation_id == organisation_id)
    )
    org = org_row.scalar_one_or_none()
    hr_settings = (org.hr_settings or {}) if org else {}
    payroll_cfg = hr_settings.get("payroll") or {}

    payroll = PayrollRun(**data)
    payroll.execution_meta = build_creation_execution_meta(payroll_cfg)

    try:
        db.add(payroll)
        await db.commit()
        await db.refresh(payroll)
        return payroll

    except IntegrityError:
        await db.rollback()
        raise ValueError("Failed to create payroll run")


async def get_payroll_by_id(
    db: AsyncSession,
    payroll_run_id: UUID
) -> Optional[PayrollRun]:

    q = await db.execute(
        select(PayrollRun).filter(PayrollRun.payroll_run_id == payroll_run_id)
    )

    return q.scalar_one_or_none()


# ============================================================
# PAYROLL ENTRY
# ============================================================

async def add_payroll_entry(
    db: AsyncSession,
    payload: PayrollEntryCreate
) -> PayrollEntry:

    """Insert payroll entry."""

    payroll = await get_payroll_by_id(db, payload.payroll_run_id)

    if not payroll:
        raise ValueError("Payroll run not found")

    assert_not_locked_value_error(payroll)

    if payroll.pay_period_id != payload.pay_period_id:
        raise ValueError("Pay period mismatch with payroll run")

    q_emp = await db.execute(
        select(Employee).filter(Employee.employee_id == payload.employee_id)
    )

    employee = q_emp.scalar_one_or_none()

    if not employee:
        raise ValueError("Employee not found")

    if not employee.is_active:
        raise ValueError("Employee is inactive")

    q_comp = await db.execute(
        select(SalaryComponent).filter(
            SalaryComponent.component_id == payload.component_id
        )
    )

    component = q_comp.scalar_one_or_none()

    if not component or not component.is_active:
        raise ValueError("Salary component not found or inactive")

    entry = PayrollEntry(**payload.model_dump())

    try:
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    except IntegrityError:
        await db.rollback()
        raise ValueError("Failed to add payroll entry (duplicate?)")


# ============================================================
# PAYROLL SUMMARY
# ============================================================

async def get_payroll_summary(
    db: AsyncSession,
    payroll_run_id: UUID
) -> dict:

    q = await db.execute(
        select(PayrollEntry).filter(
            PayrollEntry.payroll_run_id == payroll_run_id
        )
    )

    entries = q.scalars().all()

    if not entries:
        return {
            "totals": {
                "earnings": Decimal("0.00"),
                "deductions": Decimal("0.00"),
                "net": Decimal("0.00")
            },
            "entries": 0
        }

    # Fetch all components used in this payroll
    component_ids = {e.component_id for e in entries}

    q = await db.execute(
        select(SalaryComponent).filter(
            SalaryComponent.component_id.in_(component_ids)
        )
    )

    components = q.scalars().all()
    component_map = {c.component_id: c for c in components}

    rolled = aggregate_payroll_run_totals(entries=entries, component_by_id=component_map)
    totals = {
        "earnings": rolled["earnings"],
        "deductions": rolled["deductions"],
        "net": rolled["net"],
    }
    if rolled["employer_contributions"] != 0:
        totals["employer_contributions"] = rolled["employer_contributions"]

    return {
        "totals": totals,
        "entries": len(entries)
    }

# ============================================================
# PAYROLL PROCESSING ENGINE (orchestrates preview_salary_v2 only)
# ============================================================

async def _shadow_legacy_compare_batch(
    db: AsyncSession,
    org_scope: SimpleNamespace,
    jobs: list[PayrollEmployeeJob],
    result_by_emp: dict,
) -> dict:
    """Best-effort legacy calculator comparison (excludes PF/statutory engine outputs)."""
    from crud.salary_crud import get_template_components, get_salary_component
    from services.salary_calculator import calculate_salary

    rows: list[dict] = []
    for job in jobs:
        try:
            comps = await get_template_components(db, job.template_id, org_scope)
            cmap = {}
            for c in comps:
                cmap[c.component_id] = await get_salary_component(db, c.component_id, org_scope)
            leg = calculate_salary(comps, cmap, job.ctc)
            r3 = result_by_emp[job.employee_id]
            pe = float(r3.totals.get("earnings", Decimal("0")))
            pn = float(r3.totals.get("net_pay", Decimal("0")))
            rows.append(
                {
                    "employee_id": str(job.employee_id),
                    "phase3_earnings_total": pe,
                    "phase3_net_pay": pn,
                    "legacy_gross_salary": leg["gross_salary"],
                    "legacy_net_salary": leg["net_salary"],
                    "delta_gross": round(pe - float(leg["gross_salary"]), 4),
                    "note": "Legacy path excludes Phase 2 statutory/system nodes; expect deltas when PF/statutory present.",
                }
            )
        except Exception as e:  # noqa: BLE001
            rows.append({"employee_id": str(job.employee_id), "error": str(e)})
    return {"employees": rows}


async def compute_payroll_process_input_hash(db: AsyncSession, payroll_run_id: UUID) -> str:
    g = await gather_payroll_inputs(
        db,
        payroll_run_id,
        enforce_validation=False,
        check_process_policy=False,
    )
    return compute_input_fingerprint(g)


async def reset_payroll_run_for_reprocess(
    db: AsyncSession,
    payroll_run_id: UUID,
    *,
    reason: str = "attendance_settings_changed",
) -> PayrollRun:
    """
    Clear persisted lines and processing state so the run can be processed again
    with a fresh attendance snapshot. Does not delete the payroll_run row.
    """
    from services.payroll_process_policy import (
        append_reprocess_reset_history,
        assert_payroll_reset_allowed,
        build_creation_execution_meta,
    )

    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise ValueError("Payroll run not found")
    assert_payroll_reset_allowed(payroll)

    org_row = await db.execute(
        select(Organisation).where(Organisation.organisation_id == payroll.organisation_id)
    )
    org = org_row.scalar_one_or_none()
    payroll_cfg = ((org.hr_settings or {}) if org else {}).get("payroll") or {}

    previous_snapshot = (payroll.execution_meta or {}).get("input_snapshot")
    await db.execute(delete(PayrollEntry).where(PayrollEntry.payroll_run_id == payroll_run_id))

    payroll.status = "draft"
    payroll.execution_status = "draft"
    payroll.gross_pay_total = Decimal("0")
    payroll.net_pay_total = Decimal("0")
    payroll.processed_at = None
    payroll.processed_by = None
    payroll.execution_trace_id = None
    payroll.lifecycle_status = "draft"
    payroll.lifecycle_verified_at = None
    payroll.lifecycle_verified_by = None
    payroll.lifecycle_approved_at = None
    payroll.lifecycle_approved_by = None

    meta = append_reprocess_reset_history(
        payroll.execution_meta,
        reason=reason,
        previous_snapshot=previous_snapshot if isinstance(previous_snapshot, dict) else None,
    )
    meta.update(build_creation_execution_meta(payroll_cfg))
    payroll.execution_meta = meta

    db.add(payroll)
    await db.commit()
    await db.refresh(payroll)
    return payroll


async def mark_payroll_run_queued(db: AsyncSession, payroll_run_id: UUID) -> None:
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise ValueError("Payroll run not found")
    assert_not_locked_value_error(payroll)
    if payroll.status == "processed":
        raise ValueError("Payroll already processed")
    if getattr(payroll, "execution_status", None) in ("queued", "running"):
        raise ValueError("Payroll run is already queued or running")
    payroll.execution_status = "queued"
    db.add(payroll)
    await db.commit()
    await db.refresh(payroll)


async def process_payroll_run(
    db: AsyncSession,
    payroll_run_id: UUID,
    processed_by: UUID | None,
    *,
    max_parallel: int | None = None,
    shadow_legacy: bool = False,
):

    payroll = await get_payroll_by_id(db, payroll_run_id)

    if not payroll:
        raise ValueError("Payroll run not found")

    assert_not_locked_value_error(payroll)

    gathered = await gather_payroll_inputs(db, payroll_run_id, check_process_policy=True)

    if gathered.attendance_warnings:
        logging.getLogger(__name__).warning(
            "payroll_run_id=%s attendance_warnings=%s",
            payroll_run_id,
            gathered.attendance_warnings,
        )

    input_snapshot = build_input_snapshot_payload(gathered)
    input_fingerprint = compute_input_fingerprint(gathered)

    workers = max_parallel if max_parallel is not None else int(os.getenv("PAYROLL_MAX_PARALLEL", "8"))
    workers = max(1, workers)
    sem = asyncio.Semaphore(workers)

    execution_trace_id = uuid4()
    gross_total = Decimal("0.00")
    net_total = Decimal("0.00")

    async def _run_job(job: PayrollEmployeeJob):
        bundle = gathered.template_bundle_cache[job.template_id]
        pl = PreviewJobPayload(
            as_of=gathered.as_of,
            ctc=job.ctc,
            template_components=bundle["template_components"],
            component_map_by_id=bundle["component_map_by_id"],
            derived_variables=bundle["derived_variables"],
            template_groups=bundle["template_groups"],
            group_items_by_group_id=bundle["group_items_by_group_id"],
            statutory_cfg_by_code=bundle["statutory_cfg_by_code"],
            employee_overrides=job.overrides,
            wage_proration_factor=job.wage_proration_factor,
            template_engine_meta=bundle.get("template_engine_meta"),
            payroll_cfg=gathered.payroll_cfg,
        )
        async with sem:
            res = await asyncio.to_thread(run_preview_job, pl)
        return job.employee_id, res

    pairs: list[tuple[UUID, object]] = []
    if gathered.jobs:
        pairs = await asyncio.gather(*[_run_job(j) for j in gathered.jobs])

    result_by_emp = {eid: res for eid, res in pairs}

    shadow_report = None
    if shadow_legacy and gathered.jobs:
        shadow_report = await _shadow_legacy_compare_batch(
            db, gathered.org_scope, gathered.jobs, result_by_emp
        )

    for job in gathered.jobs:
        res = result_by_emp[job.employee_id]
        if res.errors:
            raise ValueError(
                "Salary engine errors for employee "
                f"{job.employee_id}: {'; '.join(res.errors[:8])}"
            )

    processed_count = 0
    proration_audit_by_employee: dict[str, Any] = {}
    for job in sorted(gathered.jobs, key=lambda j: str(j.employee_id)):
        res = result_by_emp[job.employee_id]

        gross_total += res.totals.get("earnings", Decimal("0"))
        net_total += res.totals.get("net_pay", Decimal("0"))
        processed_count += 1
        if res.proration_audit:
            proration_audit_by_employee[str(job.employee_id)] = res.proration_audit

        for idx, ln in enumerate(res.lines):
            meta = {
                "execution_trace_id": str(execution_trace_id),
                "engine": "salary_engine_v2",
                "payroll_phase": "3b",
                "line_index": idx,
                "component_code": ln.component_code,
                "category": ln.category,
                "source": ln.source,
                "breakdown": jsonable_encoder(ln.breakdown) if ln.breakdown else None,
            }
            db.add(
                PayrollEntry(
                    payroll_run_id=payroll_run_id,
                    employee_id=job.employee_id,
                    component_id=ln.component_id,
                    pay_period_id=payroll.pay_period_id,
                    amount=ln.amount,
                    meta=meta,
                )
            )

    payroll.status = "processed"
    payroll.execution_status = "completed"
    payroll.gross_pay_total = gross_total
    payroll.net_pay_total = net_total
    payroll.processed_by = processed_by if processed_by is not None else payroll.processed_by
    payroll.processed_at = datetime.now(timezone.utc)
    payroll.execution_trace_id = execution_trace_id

    templates_meta = {}
    for tid, bundle in gathered.template_bundle_cache.items():
        templates_meta[str(tid)] = {
            "template_version_id": str(bundle["template_version_id"])
            if bundle.get("template_version_id")
            else None,
            "resolved_versions": jsonable_encoder(bundle.get("resolved_versions") or {}),
            "resolved_dag": jsonable_encoder(bundle.get("resolved_dag") or {}),
        }

    payroll.execution_meta = {
        "engine": "salary_engine_v2",
        "as_of_date": str(gathered.as_of),
        "execution_trace_id": str(execution_trace_id),
        "employees_processed": processed_count,
        "employees_skipped_no_structure": gathered.skipped_no_structure,
        "template_cache_size": len(gathered.template_bundle_cache),
        "templates": templates_meta,
        "batch_design": "async_parallel_per_employee_preview",
        "execution_mode": "in_process",
        "parallelism": workers,
        "input_snapshot": input_snapshot,
        "input_fingerprint": input_fingerprint,
        "attendance_warnings": list(gathered.attendance_warnings),
        "attendance_validation": (
            gathered.attendance_validation.to_dict() if gathered.attendance_validation else None
        ),
        "proration_audit_by_employee": proration_audit_by_employee,
        "shadow_legacy": shadow_report,
    }

    mark_run_ready_for_review(payroll)

    try:
        db.add(payroll)
        await db.execute(
            update(PayPeriod)
            .where(PayPeriod.pay_period_id == payroll.pay_period_id)
            .values(
                attendance_leave_locked=True,
                locked_at=datetime.now(timezone.utc),
                locked_by_payroll_run_id=payroll_run_id,
            )
        )
        try:
            from services.wf_snapshot_service import persist_payroll_attendance_snapshot

            await persist_payroll_attendance_snapshot(db, payroll, gathered, input_snapshot)
        except Exception:
            pass

        await db.commit()
        await db.refresh(payroll)

    except Exception:
        await db.rollback()
        raise


async def verify_payroll_run_replay(db: AsyncSession, payroll_run_id: UUID) -> dict[str, object]:
    """Re-execute engine from stored snapshot inputs vs current DB bundles; compare persisted entries."""
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise ValueError("Payroll run not found")

    meta = payroll.execution_meta or {}
    stored_snap = meta.get("input_snapshot")
    if not stored_snap:
        raise ValueError("No input_snapshot stored on this payroll run (process with Phase 3b orchestrator).")

    gathered = await gather_payroll_inputs(
        db,
        payroll_run_id,
        enforce_validation=False,
        check_process_policy=False,
    )
    fresh_snap = build_input_snapshot_payload(gathered)

    drift: dict[str, object] = {}
    stored_hashes = stored_snap.get("template_bundle_hashes") or {}
    fresh_hashes = fresh_snap.get("template_bundle_hashes") or {}
    for tid in sorted(set(stored_hashes.keys()) | set(fresh_hashes.keys())):
        if stored_hashes.get(tid) != fresh_hashes.get(tid):
            drift[tid] = {"stored": stored_hashes.get(tid), "current": fresh_hashes.get(tid)}

    q = await db.execute(select(PayrollEntry).where(PayrollEntry.payroll_run_id == payroll_run_id))
    persisted = q.scalars().all()
    by_emp_comp: dict[tuple[str, str], Decimal] = {}
    for en in persisted:
        em = en.meta or {}
        code = str(em.get("component_code") or "")
        key = (str(en.employee_id), code)
        by_emp_comp[key] = Decimal(str(en.amount))

    mismatches: list[dict] = []
    replay_engine_errors: list[str] = []
    for row in stored_snap.get("employees") or []:
        eid = UUID(str(row["employee_id"]))
        tpl_key = str(row["template_id"])
        bundle = gathered.template_bundle_cache.get(UUID(tpl_key))
        if not bundle:
            mismatches.append({"employee_id": row["employee_id"], "error": "template bundle missing"})
            continue

        ctc = Decimal(str(row["ctc"]))
        overrides = dict(row.get("overrides") or {})
        wf_raw = row.get("wage_proration_factor")
        wf = Decimal(str(wf_raw)) if wf_raw is not None else None

        res = preview_salary_v2(
            as_of=gathered.as_of,
            ctc=ctc,
            template_components=bundle["template_components"],
            component_map_by_id=bundle["component_map_by_id"],
            derived_variables=bundle["derived_variables"],
            template_groups=bundle["template_groups"],
            group_items_by_group_id=bundle["group_items_by_group_id"],
            statutory_cfg_by_code=bundle["statutory_cfg_by_code"],
            employee_overrides=overrides,
            wage_proration_factor=wf,
            template_engine_meta=bundle.get("template_engine_meta"),
            payroll_cfg=gathered.payroll_cfg,
        )
        replay_engine_errors.extend(res.errors or [])

        for ln in res.lines:
            key = (str(eid), ln.component_code)
            expected = by_emp_comp.get(key)
            if expected is None:
                mismatches.append(
                    {
                        "employee_id": str(eid),
                        "component_code": ln.component_code,
                        "issue": "missing persisted line",
                    }
                )
                continue
            if expected != ln.amount:
                mismatches.append(
                    {
                        "employee_id": str(eid),
                        "component_code": ln.component_code,
                        "persisted": str(expected),
                        "replay": str(ln.amount),
                    }
                )

    return {
        "payroll_run_id": str(payroll_run_id),
        "execution_trace_id": str(meta.get("execution_trace_id") or payroll.execution_trace_id or ""),
        "input_fingerprint_stored": meta.get("input_fingerprint"),
        "input_fingerprint_current": compute_input_fingerprint(gathered),
        "template_config_drift": drift,
        "replay_mismatches": mismatches,
        "replay_engine_errors": replay_engine_errors,
    }


async def build_payroll_execution_trace(db: AsyncSession, payroll_run_id: UUID) -> dict[str, object]:
    """DAG layout (introspection) + persisted component lines for observability."""
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise ValueError("Payroll run not found")

    gathered = await gather_payroll_inputs(db, payroll_run_id, enforce_validation=False)
    dag_plans: dict[str, object] = {}
    for tid, bundle in gathered.template_bundle_cache.items():
        dag_plans[str(tid)] = build_phase2_dag_plan_from_bundle(bundle)

    q = await db.execute(select(PayrollEntry).where(PayrollEntry.payroll_run_id == payroll_run_id))
    entries = q.scalars().all()
    entries_by_employee: dict[str, list[dict]] = {}
    for en in sorted(entries, key=lambda x: (str(x.employee_id), x.payroll_entry_id)):
        em = en.meta or {}
        entries_by_employee.setdefault(str(en.employee_id), []).append(
            {
                "payroll_entry_id": str(en.payroll_entry_id),
                "component_id": str(en.component_id),
                "amount": str(en.amount),
                "line_index": em.get("line_index"),
                "component_code": em.get("component_code"),
                "category": em.get("category"),
                "source": em.get("source"),
                "breakdown": em.get("breakdown"),
            }
        )

    return {
        "payroll_run_id": str(payroll_run_id),
        "execution_trace_id": str(payroll.execution_trace_id)
        if payroll.execution_trace_id
        else None,
        "stored_execution_meta": payroll.execution_meta or {},
        "dag_plans_by_template": dag_plans,
        "entries_by_employee": entries_by_employee,
        "gather_snapshot": {
            "input_fingerprint": compute_input_fingerprint(gathered),
            "templates": list(str(t) for t in gathered.template_bundle_cache.keys()),
        },
    }