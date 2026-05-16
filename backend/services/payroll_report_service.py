from sqlalchemy.future import select
from models.payroll_models import PayrollEntry
from models.salary_models import SalaryComponent

from decimal import Decimal

from services.payroll_component_bucket import (
    CATEGORY_EARNING,
    apply_category_amount_to_totals,
    new_bucket_totals,
    net_employee_pay_from_totals,
    resolve_payroll_component_category,
)




async def generate_salary_statement(db, payroll_run_id):

    # fetch payroll entries
    q = await db.execute(
        select(PayrollEntry).filter(
            PayrollEntry.payroll_run_id == payroll_run_id
        )
    )

    entries = q.scalars().all()

    if not entries:
        return []

    # fetch components once
    component_ids = {e.component_id for e in entries}

    q = await db.execute(
        select(SalaryComponent).filter(
            SalaryComponent.component_id.in_(component_ids)
        )
    )

    components = q.scalars().all()
    component_map = {c.component_id: c for c in components}

    statement: dict = {}

    for entry in entries:

        component = component_map.get(entry.component_id)
        if not component:
            continue

        emp_key = entry.employee_id
        if emp_key not in statement:
            statement[emp_key] = {"components": {}, "component_lines": []}

        entry_meta = entry.meta if isinstance(entry.meta, dict) else {}
        bd = entry_meta.get("breakdown") if isinstance(entry_meta.get("breakdown"), dict) else {}
        original_raw = bd.get("amount_before_proration") or bd.get("original_amount")
        try:
            original_amt = Decimal(str(original_raw)) if original_raw is not None else Decimal(str(entry.amount))
        except Exception:  # noqa: BLE001
            original_amt = Decimal(str(entry.amount))

        line = {
            "component_code": entry_meta.get("component_code") or component.code,
            "name": component.name,
            "amount": entry.amount,
            "original_amount": original_amt,
            "proration_applied": bool(bd.get("proration_applied") or bd.get("attendance_auto_proration")),
            "attendance_proratable": bd.get("attendance_proratable"),
            "wage_proration_factor": bd.get("wage_proration_factor"),
        }
        statement[emp_key]["components"][component.name] = entry.amount
        statement[emp_key]["component_lines"].append(line)

    result = []

    for emp_id, payload in statement.items():

        result.append({
            "employee_id": str(emp_id),
            "components": payload["components"],
            "component_lines": payload["component_lines"],
        })

    return result


async def generate_tds_summary(db, payroll_run_id):

    # fetch payroll entries
    q = await db.execute(
        select(PayrollEntry).filter(
            PayrollEntry.payroll_run_id == payroll_run_id
        )
    )

    entries = q.scalars().all()

    if not entries:
        return []

    # fetch components once
    component_ids = {e.component_id for e in entries}

    q = await db.execute(
        select(SalaryComponent).filter(
            SalaryComponent.component_id.in_(component_ids)
        )
    )

    components = q.scalars().all()
    component_map = {c.component_id: c for c in components}

    taxable_salary = {}

    for entry in entries:

        component = component_map.get(entry.component_id)

        if not component:
            continue

        # Taxable salary for MVP: taxable earnings only (exclude employer lines).
        if component.is_taxable and resolve_payroll_component_category(component) == CATEGORY_EARNING:

            if entry.employee_id not in taxable_salary:
                taxable_salary[entry.employee_id] = Decimal("0")

            taxable_salary[entry.employee_id] += entry.amount

    summary = []

    for emp_id, salary in taxable_salary.items():

        # basic TDS (10%)
        tds = salary * Decimal("0.10")

        summary.append({
            "employee_id": str(emp_id),
            "taxable_salary": salary,
            "tds": tds
        })

    return summary


async def generate_payroll_register(db, payroll_run_id):

    from models.payroll_models import PayrollRun

    payroll_row = await db.execute(
        select(PayrollRun).where(PayrollRun.payroll_run_id == payroll_run_id)
    )
    payroll_run = payroll_row.scalar_one_or_none()
    att_by_emp: dict[str, dict] = {}
    if payroll_run and isinstance(payroll_run.execution_meta, dict):
        snap = payroll_run.execution_meta.get("input_snapshot") or {}
        att_by_emp = snap.get("attendance_breakdown_by_employee") or {}

    q = await db.execute(
        select(PayrollEntry).filter(
            PayrollEntry.payroll_run_id == payroll_run_id
        )
    )

    entries = q.scalars().all()

    if not entries:
        return []

    component_ids = {e.component_id for e in entries}

    q = await db.execute(
        select(SalaryComponent).filter(
            SalaryComponent.component_id.in_(component_ids)
        )
    )

    components = q.scalars().all()
    component_map = {c.component_id: c for c in components}

    register = {}

    for entry in entries:

        component = component_map.get(entry.component_id)
        if not component:
            continue

        if entry.employee_id not in register:
            register[entry.employee_id] = new_bucket_totals()

        apply_category_amount_to_totals(
            register[entry.employee_id],
            resolve_payroll_component_category(component),
            Decimal(str(entry.amount)),
        )

    result = []

    for emp_id, values in register.items():

        net = net_employee_pay_from_totals(values)

        emp_key = str(emp_id)
        att = att_by_emp.get(emp_key) or {}
        payroll_settings = {}
        if payroll_run and isinstance(payroll_run.execution_meta, dict):
            snap = payroll_run.execution_meta.get("input_snapshot") or {}
            payroll_settings = snap.get("payroll_settings") or {}
        result.append({
            "employee_id": emp_key,
            "earnings": values["earnings"],
            "deductions": values["deductions"],
            "employer_contributions": values.get("employer_contributions", Decimal("0")),
            "net_salary": net,
            "payable_days_mode": att.get("payable_days_mode") or payroll_settings.get("payable_days_mode"),
            "calendar_days": att.get("calendar_days"),
            "holiday_units": att.get("holiday_units"),
            "week_off_units": att.get("week_off_units"),
            "total_working_days": att.get("total_working_days"),
            "payable_days": att.get("payable_days"),
            "present_units": att.get("present_units"),
            "absent_units": att.get("absent_units"),
            "wage_proration_factor": att.get("wage_proration_factor"),
        })

    return result