from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from crud.payroll_crud import get_payroll_by_id
from models.employee_model import Employee
from services.payslip_service import (
    generate_payslip_data,
    generate_payslip_pdf,
)
from services.payroll_lifecycle_guard import LIFECYCLE_LOCKED
from utils.dependencies import get_current_user
from utils.rbac import get_principal_role, require_roles, ROLE_EMPLOYEE

router = APIRouter(prefix="/payslips", tags=["Payslip"])
payslip_view_router = APIRouter(prefix="/payslip", tags=["Payslip (Phase 4)"])


def _org_id(current_user):
    return getattr(current_user, "organisation_id", None) or getattr(current_user, "org_id", None)


def _assert_payslip_lifecycle(payroll, role: str) -> None:
    """
    Employee: payslip only after payroll lifecycle is locked.
    HR/Admin: preview once the run is processed (entries exist); may be before lock.
    """
    status = (getattr(payroll, "status", None) or "").lower()
    if role == ROLE_EMPLOYEE:
        lc = (getattr(payroll, "lifecycle_status", None) or "").lower()
        if lc != LIFECYCLE_LOCKED:
            raise HTTPException(
                status_code=403,
                detail="Payslip is available after the payroll run is locked.",
            )
        if status != "processed":
            raise HTTPException(status_code=400, detail="Payroll run is not processed yet.")
    else:
        if status != "processed":
            raise HTTPException(
                status_code=400,
                detail="Payroll run must be processed before viewing payslips.",
            )


async def _resolve_payslip_context(
    db: AsyncSession,
    payroll_run_id: UUID,
    current_user,
    role: str,
    employee_id: UUID,
):
    """Load payroll + employee and enforce organisation isolation."""
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    if role != ROLE_EMPLOYEE:
        org_id = _org_id(current_user)
        if org_id and str(payroll.organisation_id) != str(org_id):
            raise HTTPException(status_code=403, detail="Forbidden")

    q = await db.execute(select(Employee).where(Employee.employee_id == employee_id))
    employee = q.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if str(employee.organisation_id) != str(payroll.organisation_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    return payroll


@router.get("/{payroll_run_id}/{employee_id}/download")
async def download_payslip(
    payroll_run_id: UUID,
    employee_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):

    try:
        role = get_principal_role(current_user)
        if role == ROLE_EMPLOYEE:
            if str(getattr(current_user, "employee_id", "")) != str(employee_id):
                raise HTTPException(status_code=403, detail="Not allowed")
        else:
            await require_roles(["admin", "hr"])(current_user=current_user)

        payroll = await _resolve_payslip_context(db, payroll_run_id, current_user, role, employee_id)
        _assert_payslip_lifecycle(payroll, role)

        data = await generate_payslip_data(db, payroll_run_id, employee_id)

        pdf_buffer = generate_payslip_pdf(data)

        employee_name = data["employee_name"].replace(" ", "_")

        filename = f"payslip_{employee_name}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@payslip_view_router.get("/{employee_id}")
async def get_payslip_json(
    employee_id: UUID,
    payroll_run_id: UUID = Query(..., description="Payroll run UUID"),
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_current_user),
):
    """Read-only payslip payload from stored PayrollEntry rows (lifecycle rules apply)."""
    role = get_principal_role(current_user)
    if role == ROLE_EMPLOYEE:
        if str(getattr(current_user, "employee_id", "")) != str(employee_id):
            raise HTTPException(status_code=403, detail="Not allowed")
    else:
        await require_roles(["admin", "hr"])(current_user=current_user)

    payroll = await _resolve_payslip_context(db, payroll_run_id, current_user, role, employee_id)
    _assert_payslip_lifecycle(payroll, role)

    try:
        data = await generate_payslip_data(db, payroll_run_id, employee_id)
        return jsonable_encoder(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
