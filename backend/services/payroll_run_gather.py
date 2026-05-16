"""Collect payroll execution inputs (shared by process, fingerprint, replay)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.salary_phase2_crud import get_employee_overrides_for_preview
from crud.salary_crud import get_employee_salary_structure
from models.attendance_models import OrganisationHoliday
from models.employee_model import Employee
from models.org_models import Organisation
from models.payroll_models import PayrollRun, PayPeriod

from services.payroll_attendance_calculator import (
    AttendancePayrollScalars,
    compute_payroll_attendance_scalars,
    merge_payroll_cfg,
    prepare_employee_attendance_bucket,
    wage_proration_factor_for_job,
)
from services.payroll_attendance_summary_service import aggregate_attendance_leave_units
from services.payroll_attendance_validation import (
    AttendanceValidationResult,
    assert_payroll_attendance_allowed,
    collect_payroll_attendance_validation,
)
from services.payroll_process_policy import (
    assert_payroll_process_allowed,
    payroll_settings_process_fingerprint,
)
from services.payroll_phase2_bundle_loader import load_phase2_engine_bundle
from services.payroll_stable_json import stable_json_hash

logger = logging.getLogger(__name__)


def _attendance_formula_variables(scalars: AttendancePayrollScalars) -> dict[str, Decimal]:
    return scalars.to_formula_variables()


def _json_safe_override(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, Decimal):
        return format(obj, "f")
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {str(k): _json_safe_override(v) for k, v in sorted(obj.items(), key=lambda x: str(x[0]))}
    if isinstance(obj, (list, tuple)):
        return [_json_safe_override(x) for x in obj]
    if isinstance(obj, (str, int, float, bool)):
        return obj
    return str(obj)


def _org_calendar_context(
    hr_settings: dict[str, Any],
    org_holiday_dates: frozenset[date],
) -> frozenset[int]:
    att = hr_settings.get("attendance") or {}
    raw = att.get("week_off_weekdays") or []
    try:
        return frozenset(int(x) for x in raw)
    except (TypeError, ValueError):
        return frozenset()


async def _load_org_holiday_dates(
    db: AsyncSession,
    organisation_id: UUID,
    period_start: date,
    period_end: date,
) -> frozenset[date]:
    hol_q = await db.execute(
        select(OrganisationHoliday.holiday_date).where(
            OrganisationHoliday.organisation_id == organisation_id,
            OrganisationHoliday.holiday_date >= period_start,
            OrganisationHoliday.holiday_date <= period_end,
        )
    )
    return frozenset(row[0] for row in hol_q.all())


def _employee_attendance_pipeline(
    *,
    employee_id: UUID,
    units_agg: dict,
    att_rows: list,
    pay_period: PayPeriod,
    payroll_cfg: dict[str, Any],
    org_holiday_dates: frozenset[date],
    week_off_weekdays: frozenset[int],
    wage_proration_factor_override: Decimal | None = None,
) -> tuple[AttendancePayrollScalars, dict[str, Decimal]]:
    emp_rows = [r for r in att_rows if r.employee_id == employee_id]
    bucket, missing = prepare_employee_attendance_bucket(
        base_bucket=units_agg.get(employee_id),
        employee_attendance_rows=emp_rows,
        period_start=pay_period.start_date,
        period_end=pay_period.end_date,
        org_holiday_dates=org_holiday_dates,
        week_off_weekdays=week_off_weekdays,
        payroll_cfg=payroll_cfg,
    )
    scalars = compute_payroll_attendance_scalars(
        bucket=bucket,
        period_start=pay_period.start_date,
        period_end=pay_period.end_date,
        payroll_cfg=payroll_cfg,
        wage_proration_factor_override=wage_proration_factor_override,
        employee_id=str(employee_id),
        missing_working_dates=missing.missing_dates,
        org_holiday_dates=org_holiday_dates,
        week_off_weekdays=week_off_weekdays,
    )
    return scalars, bucket


async def merge_pay_period_attendance_overrides(
    db: AsyncSession,
    organisation_id: UUID,
    employee_id: UUID,
    pay_period_id: UUID,
    base_overrides: dict[str, Any] | None,
) -> tuple[dict[str, Any], Decimal | None, dict[str, Any]]:
    """
    Attendance → formula context merge (preview / payroll parity).

    Returns (merged_overrides, wage_proration_factor, attendance_breakdown).
    """
    base = dict(base_overrides or {})
    pp = await db.execute(
        select(PayPeriod).where(
            PayPeriod.pay_period_id == pay_period_id,
            PayPeriod.organisation_id == organisation_id,
        )
    )
    pay_period = pp.scalar_one_or_none()
    if not pay_period:
        raise ValueError("Pay period not found for this organisation")

    org_row = await db.execute(
        select(Organisation).where(Organisation.organisation_id == organisation_id)
    )
    org = org_row.scalar_one_or_none()
    hr_settings = (org.hr_settings or {}) if org else {}
    payroll_cfg = hr_settings.get("payroll") or {}

    units_agg, att_rows = await aggregate_attendance_leave_units(
        db,
        organisation_id,
        pay_period.start_date,
        pay_period.end_date,
        payroll_cfg=payroll_cfg,
    )
    org_holidays = await _load_org_holiday_dates(
        db, organisation_id, pay_period.start_date, pay_period.end_date
    )
    week_off_weekdays = _org_calendar_context(hr_settings, org_holidays)

    scalars, _bucket = _employee_attendance_pipeline(
        employee_id=employee_id,
        units_agg=units_agg,
        att_rows=att_rows,
        pay_period=pay_period,
        payroll_cfg=payroll_cfg,
        org_holiday_dates=org_holidays,
        week_off_weekdays=week_off_weekdays,
    )
    wage_proration_factor = wage_proration_factor_for_job(scalars, payroll_cfg=payroll_cfg)
    merged = {**_attendance_formula_variables(scalars), **base}
    return merged, wage_proration_factor, scalars.to_payroll_breakdown()


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
    org_holiday_dates: frozenset[date] = field(default_factory=frozenset)
    week_off_weekdays: frozenset[int] = field(default_factory=frozenset)
    attendance_warnings: list[str] = field(default_factory=list)
    attendance_validation: AttendanceValidationResult | None = None


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


def _employee_attendance_debug_block(
    scalars: AttendancePayrollScalars,
    job_wage_proration_factor: Decimal | None,
) -> dict[str, Any]:
    out = scalars.to_payroll_breakdown()
    out.update(
        {str(k): format(Decimal(str(v)), "f") for k, v in scalars.to_formula_variables().items()}
    )
    out["wage_proration_factor_job"] = (
        format(job_wage_proration_factor, "f") if job_wage_proration_factor is not None else None
    )
    if scalars.warnings:
        out["scalar_warnings"] = list(scalars.warnings)
    return out


async def gather_payroll_inputs(
    db: AsyncSession,
    payroll_run_id: UUID,
    *,
    enforce_validation: bool = True,
    check_process_policy: bool = True,
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

    if check_process_policy:
        from services.disbursement_payroll_guard import assert_payroll_not_disbursement_locked

        await assert_payroll_not_disbursement_locked(db, payroll.payroll_run_id)
        assert_payroll_process_allowed(payroll, current_payroll_cfg=payroll_cfg)

    units_agg, att_rows = await aggregate_attendance_leave_units(
        db,
        payroll.organisation_id,
        pay_period.start_date,
        pay_period.end_date,
        payroll_cfg=payroll_cfg,
    )
    org_holidays = await _load_org_holiday_dates(
        db, payroll.organisation_id, pay_period.start_date, pay_period.end_date
    )
    week_off_weekdays = _org_calendar_context(hr_settings, org_holidays)

    q = await db.execute(
        select(Employee).where(
            Employee.organisation_id == payroll.organisation_id,
            Employee.is_active.is_(True),
        )
    )
    employees = q.scalars().all()

    missing_by_employee: dict[UUID, Decimal] = {}
    processed_units_agg: dict[UUID, dict[str, Decimal]] = {}

    template_bundle_cache: dict[UUID, dict[str, Any]] = {}
    jobs: list[PayrollEmployeeJob] = []
    skipped_no_structure = 0

    for emp in employees:
        salary_structure = await get_employee_salary_structure(db, emp.employee_id, org_scope)
        if not salary_structure:
            skipped_no_structure += 1
            continue

        scalars, bucket = _employee_attendance_pipeline(
            employee_id=emp.employee_id,
            units_agg=units_agg,
            att_rows=att_rows,
            pay_period=pay_period,
            payroll_cfg=payroll_cfg,
            org_holiday_dates=org_holidays,
            week_off_weekdays=week_off_weekdays,
        )
        processed_units_agg[emp.employee_id] = bucket
        missing_by_employee[emp.employee_id] = scalars.missing_attendance_units

        tid = salary_structure.template_id
        if tid not in template_bundle_cache:
            template_bundle_cache[tid] = await load_phase2_engine_bundle(
                db,
                template_id=tid,
                as_of=as_of,
                current_user=org_scope,
            )

        overrides = await get_employee_overrides_for_preview(db, emp.employee_id, tid, org_scope)
        merged = dict(overrides or {})
        if emp.date_of_birth:
            merged["employee_age_years"] = _employee_age_years(emp.date_of_birth, as_of)

        wage_proration_factor = wage_proration_factor_for_job(scalars, payroll_cfg=payroll_cfg)
        merged = {**_attendance_formula_variables(scalars), **merged}

        jobs.append(
            PayrollEmployeeJob(
                employee_id=emp.employee_id,
                template_id=tid,
                ctc=Decimal(str(salary_structure.ctc)),
                overrides=merged,
                wage_proration_factor=wage_proration_factor,
            )
        )

    jobs.sort(key=lambda j: str(j.employee_id))

    validation = collect_payroll_attendance_validation(
        pay_period=pay_period,
        payroll_cfg=payroll_cfg,
        units_agg=processed_units_agg,
        attendance_rows=att_rows,
        active_employee_count=len(employees),
        missing_by_employee=missing_by_employee,
    )
    for w in validation.warnings:
        logger.warning("payroll_attendance_validation payroll_run_id=%s %s", payroll_run_id, w)

    if enforce_validation:
        assert_payroll_attendance_allowed(validation, payroll_cfg=payroll_cfg)

    return PayrollGatherResult(
        payroll=payroll,
        pay_period=pay_period,
        organisation_id=payroll.organisation_id,
        org_scope=org_scope,
        as_of=as_of,
        payroll_cfg=merge_payroll_cfg(payroll_cfg),
        units_agg=processed_units_agg,
        template_bundle_cache=template_bundle_cache,
        jobs=jobs,
        skipped_no_structure=skipped_no_structure,
        org_holiday_dates=org_holidays,
        week_off_weekdays=week_off_weekdays,
        attendance_warnings=validation.warnings,
        attendance_validation=validation,
    )


def build_input_snapshot_payload(result: PayrollGatherResult) -> dict[str, Any]:
    template_sigs = {
        str(tid): stable_json_hash(bundle)
        for tid, bundle in sorted(result.template_bundle_cache.items(), key=lambda x: str(x[0]))
    }

    employee_payloads = []
    for j in result.jobs:
        bucket = result.units_agg.get(j.employee_id) or {}
        scalars = compute_payroll_attendance_scalars(
            bucket=bucket,
            period_start=result.pay_period.start_date,
            period_end=result.pay_period.end_date,
            payroll_cfg=result.payroll_cfg,
            wage_proration_factor_override=j.wage_proration_factor,
            employee_id=str(j.employee_id),
            org_holiday_dates=result.org_holiday_dates,
            week_off_weekdays=result.week_off_weekdays,
        )
        breakdown = scalars.to_payroll_breakdown()
        employee_payloads.append(
            {
                "employee_id": str(j.employee_id),
                "template_id": str(j.template_id),
                "ctc": format(j.ctc, "f"),
                "overrides": _json_safe_override(j.overrides),
                "wage_proration_factor": format(j.wage_proration_factor, "f")
                if j.wage_proration_factor is not None
                else None,
                "attendance_breakdown": breakdown,
                "attendance_debug": _employee_attendance_debug_block(scalars, j.wage_proration_factor),
            }
        )

    attendance_debug_by_employee = {
        e["employee_id"]: e["attendance_debug"] for e in employee_payloads
    }
    attendance_breakdown_by_employee = {
        e["employee_id"]: e["attendance_breakdown"] for e in employee_payloads
    }

    return {
        "version": 2,
        "as_of": str(result.as_of),
        "pay_period_id": str(result.pay_period.pay_period_id),
        "organisation_id": str(result.organisation_id),
        "payroll_settings": result.payroll_cfg,
        "payroll_settings_fingerprint": payroll_settings_process_fingerprint(result.payroll_cfg),
        "units_agg": _serialize_units_agg(result.units_agg),
        "template_bundle_hashes": template_sigs,
        "employees": employee_payloads,
        "attendance_debug_by_employee": attendance_debug_by_employee,
        "attendance_breakdown_by_employee": attendance_breakdown_by_employee,
        "attendance_warnings": list(result.attendance_warnings),
        "attendance_validation": (
            result.attendance_validation.to_dict() if result.attendance_validation else None
        ),
    }


def compute_input_fingerprint(result: PayrollGatherResult) -> str:
    return stable_json_hash(build_input_snapshot_payload(result))
