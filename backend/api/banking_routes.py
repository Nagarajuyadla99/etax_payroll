from __future__ import annotations

import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.banking_models import Bank, BankBranch, BankTransferMode, CompanySalaryAccount
from schemas.banking_schemas import (
    BankCreate,
    BankOut,
    BankUpdate,
    BankBranchCreate,
    BankBranchOut,
    BankBranchUpdate,
    CompanySalaryAccountCreate,
    CompanySalaryAccountOut,
    IfscValidateIn,
    SwiftValidateIn,
    TransferModeCreate,
    TransferModeOut,
    ValidateOut,
)
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.encryption import encrypt_text, mask_account_number
from utils.rbac import require_roles


router = APIRouter(prefix="/banking", tags=["Banking"])

IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
SWIFT_RE = re.compile(r"^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$")


@router.post("/validate/ifsc", response_model=ValidateOut)
async def validate_ifsc(payload: IfscValidateIn):
    normalized = payload.ifsc_code.strip().upper()
    ok = bool(IFSC_RE.match(normalized))
    return ValidateOut(ok=ok, normalized=normalized, details={"type": "ifsc"})


@router.post("/validate/swift", response_model=ValidateOut)
async def validate_swift(payload: SwiftValidateIn):
    normalized = payload.swift_code.strip().upper()
    ok = bool(SWIFT_RE.match(normalized))
    return ValidateOut(ok=ok, normalized=normalized, details={"type": "swift"})


@router.post("/banks", response_model=BankOut, status_code=status.HTTP_201_CREATED)
async def create_bank(
    data: BankCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    bank = Bank(**data.model_dump())
    db.add(bank)
    await db.commit()
    await db.refresh(bank)
    return bank


@router.get("/banks", response_model=list[BankOut])
async def list_banks(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(select(Bank).order_by(Bank.name.asc()))
    return list(res.scalars().all())


@router.put("/banks/{bank_id}", response_model=BankOut)
async def update_bank(
    bank_id: UUID,
    data: BankUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    bank = await db.get(Bank, bank_id)
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(bank, k, v)
    await db.commit()
    await db.refresh(bank)
    return bank


@router.post("/banks/{bank_id}/branches", response_model=BankBranchOut, status_code=status.HTTP_201_CREATED)
async def create_branch(
    bank_id: UUID,
    data: BankBranchCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    if bank_id != data.bank_id:
        raise HTTPException(status_code=400, detail="bank_id mismatch")
    branch = BankBranch(**data.model_dump())
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return branch


@router.get("/banks/{bank_id}/branches", response_model=list[BankBranchOut])
async def list_branches(
    bank_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(select(BankBranch).where(BankBranch.bank_id == bank_id).order_by(BankBranch.branch_name.asc()))
    return list(res.scalars().all())


@router.put("/branches/{branch_id}", response_model=BankBranchOut)
async def update_branch(
    branch_id: UUID,
    data: BankBranchUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    branch = await db.get(BankBranch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(branch, k, v)
    await db.commit()
    await db.refresh(branch)
    return branch


@router.post("/transfer-modes", response_model=TransferModeOut, status_code=status.HTTP_201_CREATED)
async def create_transfer_mode(
    data: TransferModeCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    mode = BankTransferMode(**data.model_dump())
    db.add(mode)
    await db.commit()
    await db.refresh(mode)
    return mode


@router.get("/transfer-modes", response_model=list[TransferModeOut])
async def list_transfer_modes(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    res = await db.execute(select(BankTransferMode).order_by(BankTransferMode.mode.asc()))
    return list(res.scalars().all())


@router.post("/company-salary-accounts", response_model=CompanySalaryAccountOut, status_code=status.HTTP_201_CREATED)
async def create_company_salary_account(
    data: CompanySalaryAccountCreate,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    if str(org_id) != str(data.organisation_id):
        raise HTTPException(status_code=400, detail="organisation_id mismatch")

    _, last4 = mask_account_number(data.account_number.strip())
    enc = encrypt_text(data.account_number.strip(), aad=str(org_id))

    acc = CompanySalaryAccount(
        organisation_id=data.organisation_id,
        bank_branch_id=data.bank_branch_id,
        account_holder_name=data.account_holder_name,
        account_number_enc=f"{enc.nonce_b64}:{enc.ciphertext_b64}",
        account_number_last4=last4,
        account_type=data.account_type,
        allowed_modes=data.allowed_modes,
        is_default=data.is_default,
        is_active=data.is_active,
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return acc


@router.get("/company-salary-accounts", response_model=list[CompanySalaryAccountOut])
async def list_company_salary_accounts(
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    res = await db.execute(select(CompanySalaryAccount).where(CompanySalaryAccount.organisation_id == org_id))
    return list(res.scalars().all())

