from decimal import Decimal
import io
from uuid import UUID

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.employee_model import Employee
from models.payroll_models import PayrollEntry, PayrollRun
from models.salary_models import SalaryComponent


async def generate_payslip_data(
    db: AsyncSession,
    payroll_run_id: UUID,
    employee_id: UUID,
):
    q = await db.execute(select(Employee).filter(Employee.employee_id == employee_id))
    employee = q.scalar_one_or_none()
    if not employee:
        raise ValueError("Employee not found")

    q = await db.execute(select(PayrollRun).filter(PayrollRun.payroll_run_id == payroll_run_id))
    payroll = q.scalar_one_or_none()
    if not payroll:
        raise ValueError("Payroll run not found")

    q = await db.execute(
        select(PayrollEntry).filter(
            PayrollEntry.payroll_run_id == payroll_run_id,
            PayrollEntry.employee_id == employee_id,
        )
    )
    entries = q.scalars().all()
    if not entries:
        raise ValueError("No payroll entries found")

    component_ids = [entry.component_id for entry in entries]
    q = await db.execute(
        select(SalaryComponent).filter(SalaryComponent.component_id.in_(component_ids))
    )
    components = q.scalars().all()
    component_map = {component.component_id: component for component in components}

    earnings = []
    deductions = []
    gross = Decimal("0.00")
    deduction_total = Decimal("0.00")

    for entry in entries:
        component = component_map.get(entry.component_id)
        if not component:
            continue

        item = {"component": component.name, "amount": entry.amount}
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
        "net_salary": net,
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
    for earning in data["earnings"]:
        if y < 50:
            pdf.showPage()
            y = 750
        pdf.drawString(60, y, f"{earning['component']} : {float(earning['amount']):,.2f}")
        y -= 20

    y -= 20
    pdf.drawString(50, y, "Deductions")
    y -= 20
    for deduction in data["deductions"]:
        if y < 50:
            pdf.showPage()
            y = 750
        pdf.drawString(60, y, f"{deduction['component']} : {float(deduction['amount']):,.2f}")
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
