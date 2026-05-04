# payroll_mnagment/crud/payroll_crud.py

from typing import Optional
from uuid import UUID
from decimal import Decimal
from types import SimpleNamespace

from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from models.payroll_models import PayPeriod, PayrollRun, PayrollEntry
from models.employee_model import Employee
from models.org_models import Organisation
from models.salary_models import SalaryComponent

from schemas.payroll_schemas import (
    PayPeriodCreate,
    PayrollRunCreate,
    PayrollEntryCreate
)

from crud.salary_crud import (
    get_employee_salary_structure,
    get_template_components,
    get_salary_component,
    find_salary_component_by_name,
)

from services.salary_calculator import calculate_salary
from services.payroll_attendance_summary_service import aggregate_attendance_leave_units


# ============================================================
# PAY PERIOD CRUD
# ============================================================

async def create_pay_period(
    db: AsyncSession,
    payload: PayPeriodCreate
) -> PayPeriod:

    """Create a new pay period ensuring no overlap."""

    q = await db.execute(
        select(PayPeriod).filter(
            PayPeriod.organisation_id == payload.organisation_id,
            PayPeriod.start_date <= payload.end_date,
            PayPeriod.end_date >= payload.start_date
        )
    )

    if q.scalar_one_or_none():
        raise ValueError("Overlapping pay period exists for this organisation")

    pay_period = PayPeriod(**payload.model_dump())

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
    payload: PayrollRunCreate
) -> PayrollRun:

    """Create a payroll run."""

    pay_period = await get_pay_period(db, payload.pay_period_id)

    if not pay_period:
        raise ValueError("Pay period not found")

    if pay_period.status != "open":
        raise ValueError("Pay period is not open")

    payroll = PayrollRun(**payload.model_dump())

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

    totals = {
        "earnings": Decimal("0.00"),
        "deductions": Decimal("0.00")
    }

    for entry in entries:

        component = component_map.get(entry.component_id)

        if not component:
            continue

        if component.component_type == "earning":
            totals["earnings"] += entry.amount
        else:
            totals["deductions"] += entry.amount

    totals["net"] = totals["earnings"] - totals["deductions"]

    return {
        "totals": totals,
        "entries": len(entries)
    }

# ============================================================
# PAYROLL PROCESSING ENGINE
# ============================================================

async def process_payroll_run(
    db: AsyncSession,
    payroll_run_id: UUID,
    processed_by: UUID
):

    payroll = await get_payroll_by_id(db, payroll_run_id)

    if not payroll:
        raise ValueError("Payroll run not found")

    if payroll.status == "processed":
        raise ValueError("Payroll already processed")

    gross_total = Decimal("0.00")
    deduction_total = Decimal("0.00")

    q = await db.execute(
        select(Employee).where(
        Employee.organisation_id == payroll.organisation_id,
        Employee.is_active == True
)
    )

    employees = q.scalars().all()
    org_scope = SimpleNamespace(organisation_id=payroll.organisation_id)

    pay_period = await get_pay_period(db, payroll.pay_period_id)
    if not pay_period:
        raise ValueError("Pay period not found for payroll run")

    org_row = await db.execute(
        select(Organisation).where(Organisation.organisation_id == payroll.organisation_id)
    )
    org = org_row.scalar_one_or_none()
    hr_settings = (org.hr_settings or {}) if org else {}
    payroll_cfg = hr_settings.get("payroll") or {}

    apply_lop = bool(payroll_cfg.get("apply_lop_deduction", True))
    lop_name = str(payroll_cfg.get("lop_component_name", "LOP"))
    lop_half = bool(payroll_cfg.get("lop_include_half_day_units", False))
    override_payable = payroll_cfg.get("payable_days_override")

    units_agg, _att_rows = await aggregate_attendance_leave_units(
        db,
        payroll.organisation_id,
        pay_period.start_date,
        pay_period.end_date,
    )

    lop_comp = None
    if apply_lop:
        lop_comp = await find_salary_component_by_name(
            db, payroll.organisation_id, lop_name, component_type="deduction"
        )

    for emp in employees:

        salary_structure = await get_employee_salary_structure(
            db,
            emp.employee_id,
            org_scope,
        )

        if not salary_structure:
            continue

        components = await get_template_components(
            db,
            salary_structure.template_id,
            org_scope,
        )

        template_component_ids = {c.component_id for c in components}

        component_map = {}

        for c in components:
            comp = await get_salary_component(db, c.component_id, org_scope)
            component_map[c.component_id] = comp

        salary = calculate_salary(
            components,
            component_map,
            salary_structure.ctc
        )

        for comp in components:

            component = component_map[comp.component_id]
            if not component:
                continue

            value = salary["earnings"].get(component.component_id)

            if value is None:
                value = salary["deductions"].get(component.name)

            if value is None:
                continue

            if component.component_type == "earning":
                gross_total += value
            else:
                deduction_total += value

            await add_payroll_entry(
                db,
                PayrollEntryCreate(
                    payroll_run_id=payroll_run_id,
                    employee_id=emp.employee_id,
                    component_id=comp.component_id,
                    pay_period_id=payroll.pay_period_id,
                    amount=value
                )
            )

        if apply_lop and lop_comp and lop_comp.component_id not in template_component_ids:
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

            gross_dec = Decimal(str(salary["gross_salary"]))
            per_day = (gross_dec / payable_days) if payable_days > 0 else Decimal("0")
            lop_amount = (lop_units * per_day).quantize(Decimal("0.01"))

            if lop_amount > 0:
                deduction_total += lop_amount
                await add_payroll_entry(
                    db,
                    PayrollEntryCreate(
                        payroll_run_id=payroll_run_id,
                        employee_id=emp.employee_id,
                        component_id=lop_comp.component_id,
                        pay_period_id=payroll.pay_period_id,
                        amount=lop_amount,
                        meta={
                            "kind": "lop_auto",
                            "lop_units": float(lop_units),
                            "per_day_rate": float(per_day),
                            "payable_days": float(payable_days),
                            "basis": "gross_salary",
                        },
                    ),
                )

    net_total = gross_total - deduction_total

    payroll.status = "processed"
    payroll.gross_pay_total = gross_total
    payroll.net_pay_total = net_total
    payroll.processed_by = processed_by
    payroll.processed_at = datetime.now(timezone.utc)

    try:
        print("Processed By:", processed_by)
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
        await db.commit()
        await db.refresh(payroll)

    except Exception:
        await db.rollback()
        raise