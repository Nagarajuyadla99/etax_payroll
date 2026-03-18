from sqlalchemy.future import select
from models.payroll_models import PayrollEntry
from models.salary_models import SalaryComponent
from models.employee_model import Employee

from decimal import Decimal




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

    # salary structure per employee
    statement = {}

    for entry in entries:

        component = component_map.get(entry.component_id)

        if entry.employee_id not in statement:
            statement[entry.employee_id] = {}

        statement[entry.employee_id][component.name] = entry.amount

    # convert to list
    result = []

    for emp_id, components in statement.items():

        result.append({
            "employee_id": str(emp_id),
            "components": components
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

        # check taxable component
        if component.is_taxable:

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

        if entry.employee_id not in register:
            register[entry.employee_id] = {
                "earnings": Decimal("0"),
                "deductions": Decimal("0")
            }

        if component.component_type == "earning":
            register[entry.employee_id]["earnings"] += entry.amount
        else:
            register[entry.employee_id]["deductions"] += entry.amount

    result = []

    for emp_id, values in register.items():

        net = values["earnings"] - values["deductions"]

        result.append({
            "employee_id": str(emp_id),
            "earnings": values["earnings"],
            "deductions": values["deductions"],
            "net_salary": net
        })

    return result