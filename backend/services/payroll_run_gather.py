"""Collect payroll execution inputs (shared by process, fingerprint, replay)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.salary_phase2_crud import get_employee_overrides_for_preview
from crud.salary_crud import get_employee_salary_structure
from models.employee_model import Employee
from models.org_models import Organisation
from models.payroll_models import PayrollRun, PayPeriod

from services.payroll_phase2_bundle_loader import load_phase2_engine_bundle
from services.payroll_stable_json import stable_json_hash
from services.payroll_attendance_summary_service import aggregate_attendance_leave_units


def _employee_age_years(dob: date | None, on_date: date) -> int | None:
    if dob is None:
        return None
    years = on_date.year - dob.year
    if (on_date.month, on_date.day) < (dob.month, dob.day):
        years -= 1
    return years


@dataclass
class PayrollEmployeeJob:
    employee_id: UUID
    template_id: UUID
    ctc: Decimal
    overrides: dict[str, Any]
    wage_proration_factor: Decimal | None


@dataclass
class PayrollGatherResult:
    payroll: PayrollRun
    pay_period: PayPeriod
    organisation_id: UUID
    org_scope: SimpleNamespace
    as_of: date
    payroll_cfg: dict[str, Any]
    units_agg: dict[Any, Any]
    template_bundle_cache: dict[UUID, dict[str, Any]]
    jobs: list[PayrollEmployeeJob]
    skipped_no_structure: int


def _serialize_units_agg(units: dict) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for emp_id, bucket in units.items():
        key = str(emp_id)
        if not isinstance(bucket, dict):
            continue
        out[key] = {
            k: format(Decimal(str(v)), "f") if v is not None else None
            for k, v in bucket.items()
        }
    return dict(sorted(out.items()))


async def gather_payroll_inputs(
    db: AsyncSession,
    payroll_run_id: UUID,
) -> PayrollGatherResult:
    pr = await db.execute(select(PayrollRun).where(PayrollRun.payroll_run_id == payroll_run_id))
    payroll = pr.scalar_one_or_none()
    if not payroll:
        raise ValueError("Payroll run not found")

    pp = await db.execute(select(PayPeriod).where(PayPeriod.pay_period_id == payroll.pay_period_id))
    pay_period = pp.scalar_one_or_none()
    if not pay_period:
        raise ValueError("Pay period not found for payroll run")

    as_of: date = pay_period.end_date
    org_scope = SimpleNamespace(organisation_id=payroll.organisation_id)

    org_row = await db.execute(
        select(Organisation).where(Organisation.organisation_id == payroll.organisation_id)
    )
    org = org_row.scalar_one_or_none()
    hr_settings = (org.hr_settings or {}) if org else {}
    payroll_cfg = hr_settings.get("payroll") or {}

    apply_lop = bool(payroll_cfg.get("apply_lop_deduction", True))
    lop_half = bool(payroll_cfg.get("lop_include_half_day_units", False))
    override_payable = payroll_cfg.get("payable_days_override")

    units_agg, _att_rows = await aggregate_attendance_leave_units(
        db,
        payroll.organisation_id,
        pay_period.start_date,
        pay_period.end_date,
    )

    q = await db.execute(
        select(Employee).where(
            Employee.organisation_id == payroll.organisation_id,
            Employee.is_active.is_(True),
        )
    )
    employees = q.scalars().all()

    template_bundle_cache: dict[UUID, dict[str, Any]] = {}
    jobs: list[PayrollEmployeeJob] = []
    skipped_no_structure = 0

    for emp in employees:
        salary_structure = await get_employee_salary_structure(
            db,
            emp.employee_id,
            org_scope,
        )
        if not salary_structure:
            skipped_no_structure += 1
            continue

        tid = salary_structure.template_id
        if tid not in template_bundle_cache:
            template_bundle_cache[tid] = await load_phase2_engine_bundle(
                db,
                template_id=tid,
                as_of=as_of,
                current_user=org_scope,
            )

        overrides = await get_employee_overrides_for_preview(
            db, emp.employee_id, tid, org_scope
        )
        if emp.date_of_birth:
            overrides = {
                **(overrides or {}),
                "employee_age_years": _employee_age_years(emp.date_of_birth, as_of),
            }

        wage_proration_factor: Decimal | None = None
        if apply_lop:
            bucket = units_agg.get(emp.employee_id) or {}
            absent_u = bucket.get("absent_units", Decimal("0"))
            lop_lv = bucket.get("lop_leave_units", Decimal("0"))
            half_u = bucket.get("half_day_units", Decimal("0"))
            lop_units = absent_u + lop_lv
            if lop_half:
                lop_units += half_u

            if override_payable is not None:
                payable_days = Decimal(str(override_payable))
            else:
                payable_days = Decimal(
                    (pay_period.end_date - pay_period.start_date).days + 1
                )

            if payable_days > 0:
                worked = payable_days - lop_units
                if worked < 0:
                    worked = Decimal("0")
                wage_proration_factor = worked / payable_days
            else:
                wage_proration_factor = Decimal("0")

        jobs.append(
            PayrollEmployeeJob(
                employee_id=emp.employee_id,
                template_id=tid,
                ctc=Decimal(str(salary_structure.ctc)),
                overrides=dict(overrides or {}),
                wage_proration_factor=wage_proration_factor,
            )
        )

    jobs.sort(key=lambda j: str(j.employee_id))

    return PayrollGatherResult(
        payroll=payroll,
        pay_period=pay_period,
        organisation_id=payroll.organisation_id,
        org_scope=org_scope,
        as_of=as_of,
        payroll_cfg=dict(payroll_cfg),
        units_agg=units_agg,
        template_bundle_cache=template_bundle_cache,
        jobs=jobs,
        skipped_no_structure=skipped_no_structure,
    )


def build_input_snapshot_payload(result: PayrollGatherResult) -> dict[str, Any]:
    template_sigs = {
        str(tid): stable_json_hash(bundle)
        for tid, bundle in sorted(result.template_bundle_cache.items(), key=lambda x: str(x[0]))
    }
    employees = [
        {
            "employee_id": str(j.employee_id),
            "template_id": str(j.template_id),
            "ctc": format(j.ctc, "f"),
            "overrides": j.overrides,
            "wage_proration_factor": format(j.wage_proration_factor, "f")
            if j.wage_proration_factor is not None
            else None,
        }
        for j in result.jobs
    ]
    return {
        "version": 1,
        "as_of": str(result.as_of),
        "pay_period_id": str(result.pay_period.pay_period_id),
        "organisation_id": str(result.organisation_id),
        "payroll_settings": result.payroll_cfg,
        "units_agg": _serialize_units_agg(result.units_agg),
        "template_bundle_hashes": template_sigs,
        "employees": employees,
    }


def compute_input_fingerprint(result: PayrollGatherResult) -> str:
    return stable_json_hash(build_input_snapshot_payload(result))
