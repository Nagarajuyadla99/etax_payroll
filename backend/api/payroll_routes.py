# payroll_management/api/payroll_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db

from schemas.payroll_schemas import (
    PayrollRunCreate,
    PayrollRunOut,
    PayPeriodCreate,
    PayPeriodOut,
)

from crud.payroll_crud import (
    create_payroll,
    get_payroll_by_id,
    process_payroll_run,
    create_pay_period,
    get_pay_period,
    get_payroll_summary
)
from services.payroll_report_service import generate_salary_statement,generate_tds_summary,generate_payroll_register
from utils.dependencies import get_admin_user


router = APIRouter(
    prefix="/payrolls",
    tags=["Payroll"],
)


# ============================================================
# CREATE PAY PERIOD
# ============================================================

@router.post(
    "/pay-periods",
    response_model=PayPeriodOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create pay period",
)
async def create_pay_period_route(
    data: PayPeriodCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):

    try:
        period = await create_pay_period(db, data)
        return period

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ============================================================
# CREATE PAYROLL RUN
# ============================================================

@router.post(
    "/",
    response_model=PayrollRunOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new payroll run",
)
async def create_new_payroll(
    data: PayrollRunCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):

    try:
        payroll = await create_payroll(db, data)
        return payroll

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ============================================================
# GET PAY PERIOD
# ============================================================

@router.get(
    "/pay-periods/{pay_period_id}",
    response_model=PayPeriodOut,
    summary="Get pay period"
)
async def get_pay_period_route(
    pay_period_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):

    period = await get_pay_period(db, pay_period_id)

    if not period:
        raise HTTPException(
            status_code=404,
            detail="Pay period not found"
        )

    return period


# ============================================================
# GET PAYROLL RUN
# ============================================================

@router.get(
    "/{payroll_run_id}",
    response_model=PayrollRunOut,
    summary="Get payroll run"
)
async def get_payroll(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):

    payroll = await get_payroll_by_id(db, payroll_run_id)

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll record not found"
        )

    return payroll


# ============================================================
# PROCESS PAYROLL
# ============================================================

@router.post(
    "/{payroll_run_id}/process",
    status_code=status.HTTP_200_OK,
    summary="Process payroll"
)
async def process_payroll(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):


    try:

        await process_payroll_run(
            db,
            payroll_run_id,
            current_user.user_id
        )

        return {
            "message": "Payroll processed successfully",
            "payroll_run_id": str(payroll_run_id),
            "processed_by": str(current_user.user_id)
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

# ============================================================
# PAYROLL SUMMARY
# ============================================================

@router.get(
    "/{payroll_run_id}/summary",
    status_code=status.HTTP_200_OK,
    summary="Payroll summary"
)
async def payroll_summary(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):

    payroll = await get_payroll_by_id(db, payroll_run_id)

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll run not found"
        )

    summary = await get_payroll_summary(db, payroll_run_id)

    return summary

@router.get(
    "/{payroll_run_id}/salary-statement",
    summary="Salary statement"
)
async def salary_statement(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):

    data = await generate_salary_statement(db, payroll_run_id)

    return {
        "payroll_run_id": str(payroll_run_id),
        "salary_statement": data
    }

@router.get(
    "/{payroll_run_id}/tds-summary",
    summary="Basic TDS summary"
)
async def tds_summary(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):

    data = await generate_tds_summary(db, payroll_run_id)

    return {
        "payroll_run_id": str(payroll_run_id),
        "tds_summary": data
    }

# ============================================================
# PAYROLL REGISTER
# ============================================================

@router.get(
    "/{payroll_run_id}/register",
    summary="Payroll register"
)
async def payroll_register(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_admin_user)
):

    payroll = await get_payroll_by_id(db, payroll_run_id)

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll run not found"
        )

    data = await generate_payroll_register(db, payroll_run_id)

    return {
        "payroll_run_id": str(payroll_run_id),
        "register": data
    }