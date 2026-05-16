"""Aggregated metrics for the payroll dashboard (org-scoped)."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.employee_banking_models import EmployeeBankAccount
from models.employee_model import Employee
from models.payroll_models import PayPeriod, PayrollEntry, PayrollRun
from models.salary_models import SalaryComponent


def _decimal_to_float(v: Decimal | None) -> float:
    if v is None:
        return 0.0
    return float(v)


def _format_period_label(start: date | None, end: date | None) -> str | None:
    if not start or not end:
        return None
    return f"{start.strftime('%b %Y')}"


async def get_dashboard_overview(
    db: AsyncSession,
    organisation_id: UUID,
) -> dict[str, Any]:
    org_id = organisation_id
    today = date.today()

    emp_count_q = await db.execute(
        select(func.count())
        .select_from(Employee)
        .where(Employee.organisation_id == org_id, Employee.is_active.is_(True))
    )
    total_employees = int(emp_count_q.scalar() or 0)

    bank_subq = (
        select(EmployeeBankAccount.employee_id)
        .where(
            EmployeeBankAccount.is_primary.is_(True),
            EmployeeBankAccount.verification_status.in_(["verified", "active"]),
        )
        .distinct()
    )
    missing_bank_q = await db.execute(
        select(func.count())
        .select_from(Employee)
        .where(
            Employee.organisation_id == org_id,
            Employee.is_active.is_(True),
            Employee.employee_id.not_in(bank_subq),
        )
    )
    missing_bank = int(missing_bank_q.scalar() or 0)

    missing_email_q = await db.execute(
        select(func.count())
        .select_from(Employee)
        .where(
            Employee.organisation_id == org_id,
            Employee.is_active.is_(True),
            or_(Employee.email.is_(None), Employee.email == ""),
            or_(Employee.work_email.is_(None), Employee.work_email == ""),
        )
    )
    missing_contact = int(missing_email_q.scalar() or 0)

    latest_run_q = await db.execute(
        select(PayrollRun)
        .options(selectinload(PayrollRun.entries))
        .where(PayrollRun.organisation_id == org_id)
        .order_by(PayrollRun.created_at.desc())
        .limit(1)
    )
    latest_run = latest_run_q.scalar_one_or_none()

    pay_period = None
    if latest_run:
        pp_q = await db.execute(
            select(PayPeriod).where(PayPeriod.pay_period_id == latest_run.pay_period_id)
        )
        pay_period = pp_q.scalar_one_or_none()

    net_pay = _decimal_to_float(getattr(latest_run, "net_pay_total", None) if latest_run else None)
    gross_pay = _decimal_to_float(getattr(latest_run, "gross_pay_total", None) if latest_run else None)
    deductions = max(gross_pay - net_pay, 0.0) if gross_pay else 0.0

    processed_employees = 0
    payroll_progress_pct = 0.0
    if latest_run and latest_run.entries:
        processed_employees = len({e.employee_id for e in latest_run.entries if e.employee_id})
    if total_employees > 0 and processed_employees > 0:
        payroll_progress_pct = round(min(100.0, (processed_employees / total_employees) * 100), 1)

    if latest_run and latest_run.payroll_run_id:
        from crud.payroll_crud import get_payroll_summary

        try:
            summary = await get_payroll_summary(db, latest_run.payroll_run_id)
            totals = summary.get("totals") or {}
            net_pay = _decimal_to_float(totals.get("net"))
            deductions = _decimal_to_float(totals.get("deductions"))
            if net_pay == 0 and latest_run.net_pay_total:
                net_pay = _decimal_to_float(latest_run.net_pay_total)
        except Exception:
            pass

    recent_txn: list[dict[str, Any]] = []
    if latest_run:
        emp_ids = list({e.employee_id for e in (latest_run.entries or [])})[:20]
        if emp_ids:
            emp_rows = await db.execute(
                select(Employee).where(Employee.employee_id.in_(emp_ids))
            )
            emp_map = {e.employee_id: e for e in emp_rows.scalars().all()}

            net_comp_q = await db.execute(
                select(SalaryComponent.component_id).where(
                    func.lower(SalaryComponent.code).in_(["net_pay", "net", "net_salary"])
                )
            )
            net_ids = {r[0] for r in net_comp_q.all()}

            for entry in sorted(
                latest_run.entries or [],
                key=lambda e: e.created_at or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )[:8]:
                if net_ids and entry.component_id not in net_ids:
                    continue
                emp = emp_map.get(entry.employee_id)
                if not emp:
                    continue
                name = " ".join(
                    p
                    for p in [emp.first_name, emp.last_name]
                    if p
                ).strip() or emp.display_name or emp.employee_code or "Employee"
                recent_txn.append(
                    {
                        "employee_name": name,
                        "department": getattr(emp.department, "name", None) if hasattr(emp, "department") else None,
                        "type": "Salary",
                        "amount": _decimal_to_float(entry.amount),
                        "date": (entry.created_at.date().isoformat() if entry.created_at else None),
                        "status": latest_run.status or "processed",
                    }
                )
                if len(recent_txn) >= 5:
                    break

    alerts: list[dict[str, Any]] = []
    if missing_bank > 0:
        alerts.append(
            {
                "level": "danger",
                "priority": "Critical",
                "text": f"{missing_bank} employee(s) missing verified bank account",
            }
        )
    if missing_contact > 0:
        alerts.append(
            {
                "level": "warning",
                "priority": "Warning",
                "text": f"{missing_contact} employee(s) missing email contact",
            }
        )
    if latest_run and latest_run.status not in ("processed", "locked", "approved"):
        alerts.append(
            {
                "level": "info",
                "priority": "Info",
                "text": f"Latest payroll run is {latest_run.status or 'draft'}",
            }
        )

    period_label = _format_period_label(
        pay_period.start_date if pay_period else None,
        pay_period.end_date if pay_period else None,
    )

    return {
        "as_of": today.isoformat(),
        "employees": {
            "total": total_employees,
            "missing_bank_account": missing_bank,
            "missing_contact": missing_contact,
        },
        "payroll": {
            "latest_run_id": str(latest_run.payroll_run_id) if latest_run else None,
            "period_label": period_label,
            "status": getattr(latest_run, "status", None) if latest_run else None,
            "execution_status": getattr(latest_run, "execution_status", None) if latest_run else None,
            "lifecycle_status": getattr(latest_run, "lifecycle_status", None) if latest_run else None,
            "processed_count": processed_employees,
            "total_employees": total_employees,
            "progress_percent": payroll_progress_pct,
            "net_pay": net_pay,
            "deductions": deductions,
            "gross_pay": gross_pay,
        },
        "compliance": {
            "open_items": len(alerts),
            "urgent_items": sum(1 for a in alerts if a.get("level") == "danger"),
        },
        "alerts": alerts,
        "recent_transactions": recent_txn,
    }
