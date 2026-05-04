"""Leave validation (overlap, balance, EL tenure) and approval-side balance updates."""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from models.attendance_models import EmployeeLeaveBalance, Leave
from models.employee_model import Employee
from models.org_models import Organisation


def _canonical_leave_type(raw: str) -> str:
    t = (raw or "").strip().upper()
    aliases = {
        "CASUAL LEAVE": "CL",
        "SICK LEAVE": "SL",
        "EARNED LEAVE": "EL",
        "ANNUAL LEAVE": "EL",
        "LOSS OF PAY": "LOP",
        "LOP": "LOP",
    }
    return aliases.get(t, t if t in ("CL", "SL", "EL", "LOP") else t)


def leave_calendar_days(start: date, end: date) -> Decimal:
    if start > end:
        return Decimal("0")
    return Decimal((end - start).days + 1)


async def leave_overlaps(
    db: AsyncSession,
    employee_id: UUID,
    start_date: date,
    end_date: date,
    *,
    exclude_leave_id: Optional[UUID] = None,
) -> bool:
    q = select(Leave.leave_id).where(
        Leave.employee_id == employee_id,
        Leave.cancelled_at.is_(None),
        Leave.status.in_(("pending", "approved")),
        Leave.start_date <= end_date,
        Leave.end_date >= start_date,
    )
    if exclude_leave_id:
        q = q.where(Leave.leave_id != exclude_leave_id)
    r = await db.execute(q.limit(1))
    return r.scalar_one_or_none() is not None


async def get_leave_balance_row(
    db: AsyncSession,
    employee_id: UUID,
    leave_type: str,
    period_year: int,
) -> Optional[EmployeeLeaveBalance]:
    r = await db.execute(
        select(EmployeeLeaveBalance).where(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.leave_type == leave_type,
            EmployeeLeaveBalance.period_year == period_year,
        )
    )
    return r.scalar_one_or_none()


def _available_balance(row: Optional[EmployeeLeaveBalance]) -> Decimal:
    if not row:
        return Decimal("0")
    return (
        (row.opening_balance or Decimal("0"))
        + (row.accrued or Decimal("0"))
        + (row.carried_forward or Decimal("0"))
        - (row.consumed or Decimal("0"))
        - (row.encashed or Decimal("0"))
    )


async def validate_new_leave(
    db: AsyncSession,
    organisation_id: UUID,
    employee_id: UUID,
    leave_type: str,
    start_date: date,
    end_date: date,
    *,
    exclude_leave_id: Optional[UUID] = None,
) -> None:
    if start_date > end_date:
        raise ValueError("Leave start_date must be on or before end_date.")

    if await leave_overlaps(
        db, employee_id, start_date, end_date, exclude_leave_id=exclude_leave_id
    ):
        raise ValueError("Leave overlaps an existing pending or approved request.")

    org_r = await db.execute(select(Organisation).where(Organisation.organisation_id == organisation_id))
    org = org_r.scalar_one_or_none()
    settings = (org.hr_settings or {}) if org else {}
    leave_cfg = settings.get("leave") or {}
    el_min_months = int(leave_cfg.get("el_min_tenure_months", 12))

    emp_r = await db.execute(select(Employee).where(Employee.employee_id == employee_id))
    emp = emp_r.scalar_one_or_none()
    if not emp:
        raise ValueError("Employee not found.")

    canon = _canonical_leave_type(leave_type)

    if canon == "EL":
        if not emp.date_of_joining:
            raise ValueError("EL requires employee date_of_joining.")
        months = (start_date.year - emp.date_of_joining.year) * 12 + (
            start_date.month - emp.date_of_joining.month
        )
        if months < el_min_months:
            raise ValueError(
                f"EL requires at least {el_min_months} months of service before leave start."
            )

    if canon in ("CL", "SL", "EL"):
        year = start_date.year
        requested = leave_calendar_days(start_date, end_date)
        bal = await get_leave_balance_row(db, employee_id, canon, year)
        avail = _available_balance(bal)
        if requested > avail:
            convert = leave_cfg.get("insufficient_balance_convert_to_lop", False)
            if not convert:
                raise ValueError(
                    f"Insufficient {canon} balance (available {avail}, requested {requested})."
                )


async def approve_or_reject_leave(
    db: AsyncSession,
    leave_id: UUID,
    approver_id: UUID,
    decision: Literal["approved", "rejected"],
    notes: Optional[str] = None,
) -> Leave:
    r = await db.execute(select(Leave).where(Leave.leave_id == leave_id))
    leave = r.scalar_one_or_none()
    if not leave:
        raise ValueError("Leave not found.")
    if leave.cancelled_at is not None:
        raise ValueError("Leave is cancelled.")
    if leave.status != "pending":
        raise ValueError("Only pending leave can be approved or rejected.")

    now = datetime.now(timezone.utc)

    if decision == "rejected":
        leave.status = "rejected"
        leave.reviewed_by = approver_id
        leave.reviewed_at = now
        leave.notes = notes or leave.notes
        await db.commit()
        await db.refresh(leave)
        return leave

    # approved
    canon = _canonical_leave_type(leave.leave_type)
    if canon in ("CL", "SL", "EL"):
        await validate_new_leave(
            db,
            leave.organisation_id,
            leave.employee_id,
            leave.leave_type,
            leave.start_date,
            leave.end_date,
            exclude_leave_id=leave.leave_id,
        )
        year = leave.start_date.year
        requested = leave.days if leave.days is not None else leave_calendar_days(leave.start_date, leave.end_date)
        if isinstance(requested, float):
            requested = Decimal(str(requested))
        elif not isinstance(requested, Decimal):
            requested = Decimal(str(requested))

        bal_stmt = (
            select(EmployeeLeaveBalance)
            .where(
                EmployeeLeaveBalance.employee_id == leave.employee_id,
                EmployeeLeaveBalance.leave_type == canon,
                EmployeeLeaveBalance.period_year == year,
            )
            .with_for_update()
        )
        bal_r = await db.execute(bal_stmt)
        bal = bal_r.scalar_one_or_none()
        avail = _available_balance(bal)
        if requested > avail:
            raise ValueError(
                f"Insufficient {canon} balance at approval (available {avail}, requested {requested})."
            )
        if bal:
            bal.consumed = (bal.consumed or Decimal("0")) + requested
            bal.updated_at = now

    leave.status = "approved"
    leave.approved_by = approver_id
    leave.approved_on = now
    leave.reviewed_by = approver_id
    leave.reviewed_at = now
    leave.notes = notes or leave.notes
    if leave.days is None:
        leave.days = leave_calendar_days(leave.start_date, leave.end_date)

    await db.commit()
    await db.refresh(leave)
    return leave
