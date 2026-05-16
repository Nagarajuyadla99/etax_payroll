from __future__ import annotations

from decimal import Decimal

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import SalaryBatch, SalaryBatchItem
from models.employee_banking_models import EmployeeBankAccount
from models.payroll_models import PayrollEntry, PayPeriod
from models.salary_models import SalaryComponent
from services.payroll_component_bucket import (
    apply_category_amount_to_totals,
    new_bucket_totals,
    net_employee_pay_from_totals,
    resolve_payroll_component_category,
)


async def _compute_net_pay_by_employee(db: AsyncSession, payroll_run_id) -> list[tuple]:
    res = await db.execute(select(PayrollEntry).where(PayrollEntry.payroll_run_id == payroll_run_id))
    entries = list(res.scalars().all())
    if not entries:
        return []

    component_ids = {e.component_id for e in entries}
    comp_res = await db.execute(select(SalaryComponent).where(SalaryComponent.component_id.in_(component_ids)))
    comps = {c.component_id: c for c in comp_res.scalars().all()}

    by_emp: dict = {}
    for e in entries:
        comp = comps.get(e.component_id)
        if not comp:
            continue
        if e.employee_id not in by_emp:
            by_emp[e.employee_id] = new_bucket_totals()
        apply_category_amount_to_totals(
            by_emp[e.employee_id],
            resolve_payroll_component_category(comp),
            Decimal(str(e.amount)),
        )

    return [(emp_id, net_employee_pay_from_totals(totals)) for emp_id, totals in by_emp.items()]


async def _get_primary_verified_bank_account(db: AsyncSession, employee_id, effective_date):
    res = await db.execute(
        select(EmployeeBankAccount)
        .where(
            and_(
                EmployeeBankAccount.employee_id == employee_id,
                EmployeeBankAccount.is_active.is_(True),
                EmployeeBankAccount.is_primary.is_(True),
                EmployeeBankAccount.verification_status == "verified",
                EmployeeBankAccount.effective_from <= effective_date,
                (EmployeeBankAccount.effective_to.is_(None))
                | (EmployeeBankAccount.effective_to >= effective_date),
            )
        )
        .order_by(EmployeeBankAccount.effective_from.desc())
    )
    return res.scalars().first()


async def ensure_batch_items_from_payroll(db: AsyncSession, batch: SalaryBatch) -> int:
    """
    Build salary_batch_items from payroll run net pay when the batch has no items yet.
    Returns number of items after ensure (existing or newly created).
    """
    items_res = await db.execute(select(SalaryBatchItem).where(SalaryBatchItem.batch_id == batch.batch_id))
    existing = list(items_res.scalars().all())
    if existing:
        return len(existing)

    period = await db.get(PayPeriod, batch.pay_period_id)
    if not period:
        return 0

    netpays = await _compute_net_pay_by_employee(db, batch.payroll_run_id)
    total_amt = Decimal("0")
    total_emp = 0

    for employee_id, net_pay in netpays:
        if net_pay <= 0:
            continue
        acct = await _get_primary_verified_bank_account(db, employee_id, period.end_date)
        if not acct:
            db.add(
                SalaryBatchItem(
                    batch_id=batch.batch_id,
                    employee_id=employee_id,
                    employee_bank_account_id=None,
                    amount=net_pay,
                    status="failed",
                    failure_reason="Missing verified primary bank account",
                )
            )
            continue

        db.add(
            SalaryBatchItem(
                batch_id=batch.batch_id,
                employee_id=employee_id,
                employee_bank_account_id=acct.bank_account_id,
                amount=net_pay,
                status="pending",
            )
        )
        total_amt += net_pay
        total_emp += 1

    batch.total_amount = total_amt
    batch.total_employees = total_emp
    await db.flush()
    return total_emp + (len(netpays) - total_emp)
