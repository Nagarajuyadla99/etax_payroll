from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from services.payslip_service import (
    generate_payslip_data,
    generate_payslip_pdf
)

router = APIRouter(prefix="/payslips", tags=["Payslip"])


@router.get("/{payroll_run_id}/{employee_id}/download")
async def download_payslip(
    payroll_run_id: UUID,
    employee_id: UUID,
    db: AsyncSession = Depends(get_async_db)
):

    try:

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