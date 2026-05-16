from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.banking_models import BankBranch
from models.employee_banking_models import EmployeeBankAccount
from models.provider_models import ProviderBeneficiary
from providers.base.provider import BeneficiaryCreateRequest
from providers.base.provider import BankingProvider
from services.audit_service import audit_log
from utils.encryption import decrypt_text


async def ensure_provider_beneficiary(
    db: AsyncSession,
    *,
    organisation_id,
    provider: BankingProvider,
    employee_bank_account_id,
) -> ProviderBeneficiary:
    """
    Idempotent beneficiary provisioning for a given bank account + provider.
    Caller owns transaction boundary.
    """
    res = await db.execute(
        select(ProviderBeneficiary).where(
            ProviderBeneficiary.provider_code == provider.provider_code,
            ProviderBeneficiary.employee_bank_account_id == employee_bank_account_id,
            ProviderBeneficiary.organisation_id == organisation_id,
        )
    )
    existing = res.scalar_one_or_none()
    if existing:
        return existing

    acct = await db.get(EmployeeBankAccount, employee_bank_account_id)
    if not acct:
        raise ValueError("Employee bank account not found")

    branch = await db.get(BankBranch, acct.bank_branch_id)
    if not branch or not branch.ifsc_code:
        raise ValueError("IFSC not found for bank branch")

    account_number = decrypt_text(
        acct.account_number_nonce_b64,
        acct.account_number_ciphertext_b64,
        aad=str(acct.employee_id),
        key_version=int(getattr(acct, "key_version", "1") or "1"),
    )

    resp = await provider.create_beneficiary(
        BeneficiaryCreateRequest(
            name=acct.account_holder_name,
            account_number=account_number,
            ifsc=branch.ifsc_code,
            reference_id=f"org:{organisation_id}:emp:{acct.employee_id}:acct:{employee_bank_account_id}",
        )
    )

    pb = ProviderBeneficiary(
        organisation_id=organisation_id,
        provider_code=provider.provider_code,
        employee_id=acct.employee_id,
        employee_bank_account_id=employee_bank_account_id,
        provider_ref=resp.provider_beneficiary_id,
        sync_status="synced",
        verification_status=resp.status or "unknown",
        meta={"raw": resp.raw},
    )
    db.add(pb)
    await db.flush()

    await audit_log(
        db,
        organisation_id=organisation_id,
        actor_id=None,
        actor_role="system",
        action="provider_beneficiary.created",
        entity="employee_bank_account",
        entity_id=employee_bank_account_id,
        before=None,
        after={"provider": provider.provider_code, "provider_ref": resp.provider_beneficiary_id},
    )
    return pb

