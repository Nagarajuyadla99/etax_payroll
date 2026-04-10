from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from services.payslip_service import (
    generate_payslip_data,
    generate_payslip_pdf
)
from utils.dependencies import get_current_user
from utils.rbac import get_principal_role, require_roles, ROLE_EMPLOYEE

router = APIRouter(prefix="/payslips", tags=["Payslip"])


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
        raise HTTPException(status_code=404, detail=str(e))