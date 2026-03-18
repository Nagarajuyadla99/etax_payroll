from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from decimal import Decimal

from models.payroll_models import PayrollEntry, PayrollRun
from models.salary_models import SalaryComponent
from models.employee_model import Employee
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import io
async def generate_payslip_data(
    db: AsyncSession,
    payroll_run_id: UUID,
    employee_id: UUID
):

    # employee
    q = await db.execute(
        select(Employee).filter(Employee.employee_id == employee_id)
    )
    employee = q.scalar_one_or_none()

    if not employee:
        raise ValueError("Employee not found")

    # payroll run
    q = await db.execute(
        select(PayrollRun).filter(PayrollRun.payroll_run_id == payroll_run_id)
    )
    payroll = q.scalar_one_or_none()

    if not payroll:
        raise ValueError("Payroll run not found")

    # payroll entries
    q = await db.execute(
        select(PayrollEntry).filter(
            PayrollEntry.payroll_run_id == payroll_run_id,
            PayrollEntry.employee_id == employee_id
        )
    )

    entries = q.scalars().all()

    if not entries:
        raise ValueError("No payroll entries found")

    # fetch all components once
    component_ids = [e.component_id for e in entries]

    q = await db.execute(
        select(SalaryComponent).filter(
            SalaryComponent.component_id.in_(component_ids)
        )
    )

    components = q.scalars().all()

    component_map = {c.component_id: c for c in components}

    earnings = []
    deductions = []

    gross = Decimal("0.00")
    deduction_total = Decimal("0.00")

    for entry in entries:

        component = component_map.get(entry.component_id)

        if not component:
            continue

        item = {
            "component": component.name,
            "amount": entry.amount
        }

        if component.component_type == "earning":
            earnings.append(item)
            gross += entry.amount
        else:
            deductions.append(item)
            deduction_total += entry.amount

    net = gross - deduction_total

    return {
        "employee_name": employee.first_name,
        "employee_id": str(employee.employee_id),
        "earnings": earnings,
        "deductions": deductions,
        "gross_salary": gross,
        "total_deductions": deduction_total,
        "net_salary": net
    }

def generate_payslip_pdf(data):

    buffer = io.BytesIO()

    pdf = canvas.Canvas(buffer, pagesize=A4)

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(200, 800, "Employee Payslip")

    pdf.setFont("Helvetica", 12)

    pdf.drawString(50, 760, f"Employee: {data['employee_name']}")
    pdf.drawString(50, 740, f"Employee ID: {data['employee_id']}")

    y = 700

    pdf.drawString(50, y, "Earnings")
    y -= 20

    for e in data["earnings"]:

        if y < 50:
            pdf.showPage()
            y = 750

        pdf.drawString(60, y, f"{e['component']} : {float(e['amount']):,.2f}")
        y -= 20

    y -= 20
    pdf.drawString(50, y, "Deductions")
    y -= 20

    for d in data["deductions"]:

        if y < 50:
            pdf.showPage()
            y = 750

        pdf.drawString(60, y, f"{d['component']} : {float(d['amount']):,.2f}")
        y -= 20

    y -= 20
    pdf.drawString(50, y, f"Gross Salary : {float(data['gross_salary']):,.2f}")
    y -= 20
    pdf.drawString(50, y, f"Total Deductions : {float(data['total_deductions']):,.2f}")
    y -= 20
    pdf.drawString(50, y, f"Net Salary : {float(data['net_salary']):,.2f}")

    pdf.save()

    buffer.seek(0)

    return buffer