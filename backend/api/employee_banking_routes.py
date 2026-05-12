from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.employee_banking_models import EmployeeBankAccount
from schemas.banking_schemas import (
    EmployeeBankAccountCreate,
    EmployeeBankAccountOut,
    EmployeeBankVerifyIn,
)
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.encryption import encrypt_text, mask_account_number
from utils.rbac import require_roles


router = APIRouter(prefix="/employee-banking", tags=["EmployeeBanking"])


@router.post("/accounts", response_model=EmployeeBankAccountOut, status_code=status.HTTP_201_CREATED)
async def create_employee_bank_account(
    data: EmployeeBankAccountCreate,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    acct_no = data.account_number.strip()
    _, last4 = mask_account_number(acct_no)
    enc = encrypt_text(acct_no, aad=str(data.employee_id))

    # Duplicate prevention (basic): same employee + last4 + branch with same effective_from
    existing = await db.execute(
        select(EmployeeBankAccount).where(
            and_(
                EmployeeBankAccount.employee_id == data.employee_id,
                EmployeeBankAccount.bank_branch_id == data.bank_branch_id,
                EmployeeBankAccount.account_number_last4 == last4,
                EmployeeBankAccount.effective_from == data.effective_from,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Duplicate bank account entry for effective date")

    account = EmployeeBankAccount(
        employee_id=data.employee_id,
        bank_branch_id=data.bank_branch_id,
        account_holder_name=data.account_holder_name,
        key_version=str(enc.key_version),
        account_number_nonce_b64=enc.nonce_b64,
        account_number_ciphertext_b64=enc.ciphertext_b64,
        account_number_last4=last4,
        upi_vpa=data.upi_vpa,
        effective_from=data.effective_from,
        is_primary=data.is_primary,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.get("/employees/{employee_id}/accounts", response_model=list[EmployeeBankAccountOut])
async def list_employee_bank_accounts(
    employee_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(
        select(EmployeeBankAccount).where(EmployeeBankAccount.employee_id == employee_id).order_by(EmployeeBankAccount.effective_from.desc())
    )
    return list(res.scalars().all())


@router.post("/accounts/{bank_account_id}/verify", response_model=EmployeeBankAccountOut)
async def verify_employee_bank_account(
    bank_account_id: UUID,
    data: EmployeeBankVerifyIn,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    account = await db.get(EmployeeBankAccount, bank_account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    account.verification_status = data.status
    account.verified_by = getattr(auth.principal, "user_id", None)
    account.verified_at = None  # set by DB on update? keep explicit below
    # SQLite/Postgres compatibility: set in python
    from datetime import datetime, timezone

    account.verified_at = datetime.now(tz=timezone.utc)
    if data.comment:
        account.verification_meta = {**(account.verification_meta or {}), "comment": data.comment}

    await db.commit()
    await db.refresh(account)
    return account

