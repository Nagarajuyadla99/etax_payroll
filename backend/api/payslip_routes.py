from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from crud.payroll_crud import get_payroll_by_id
from services.payslip_service import (
    generate_payslip_data,
    generate_payslip_pdf,
)
from utils.dependencies import get_current_user
from utils.rbac import get_principal_role, require_roles, ROLE_EMPLOYEE

router = APIRouter(prefix="/payslips", tags=["Payslip"])
payslip_view_router = APIRouter(prefix="/payslip", tags=["Payslip (Phase 4)"])


def _org_id(current_user):
    return getattr(current_user, "organisation_id", None) or getattr(current_user, "org_id", None)


async def _enforce_payslip_tenant(
    db: AsyncSession,
    payroll_run_id: UUID,
    current_user,
    role: str,
):
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if role != ROLE_EMPLOYEE:
        org_id = _org_id(current_user)
        if org_id and str(payroll.organisation_id) != str(org_id):
            raise HTTPException(status_code=403, detail="Forbidden")


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
            # Row-level enforcement: employees may only download their own payslip.
            if str(getattr(current_user, "employee_id", "")) != str(employee_id):
                raise HTTPException(status_code=403, detail="Not allowed")
        else:
            # Non-employee tokens must be admin/hr for any payslip download.
            await require_roles(["admin", "hr"])(current_user=current_user)

        await _enforce_payslip_tenant(db, payroll_run_id, current_user, role)

        # get payslip data
        data = await generate_payslip_data(db, payroll_run_id, employee_id)

        # generate pdf
        pdf_buffer = generate_payslip_pdf(data)

        # create filename using employee name
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
    """Phase 4: read-only payslip payload from stored PayrollEntry rows (locked payroll only)."""
    role = get_principal_role(current_user)
    if role == ROLE_EMPLOYEE:
        if str(getattr(current_user, "employee_id", "")) != str(employee_id):
            raise HTTPException(status_code=403, detail="Not allowed")
    else:
        await require_roles(["admin", "hr"])(current_user=current_user)

    await _enforce_payslip_tenant(db, payroll_run_id, current_user, role)

    try:
        data = await generate_payslip_data(db, payroll_run_id, employee_id)
        return jsonable_encoder(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))