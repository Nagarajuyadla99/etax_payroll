from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class BeneficiaryCreateRequest:
    name: str
    account_number: str
    ifsc: str
    email: str | None = None
    phone: str | None = None
    reference_id: str | None = None


@dataclass(frozen=True)
class BeneficiaryCreateResponse:
    provider_beneficiary_id: str
    status: str
    raw: dict


@dataclass(frozen=True)
class PayoutRequest:
    amount_inr: int  # integer paise (INR × 100)
    beneficiary_id: str
    reference_id: str
    narration: str | None = None


@dataclass(frozen=True)
class PayoutResponse:
    provider_payout_id: str
    status: str
    utr: str | None
    raw: dict


class BankingProvider(Protocol):
    provider_code: str

    async def create_beneficiary(self, req: BeneficiaryCreateRequest) -> BeneficiaryCreateResponse: ...

    async def initiate_payout(self, req: PayoutRequest) -> PayoutResponse: ...

    async def get_payout_status(self, provider_payout_id: str) -> PayoutResponse: ...

    def verify_webhook(self, *, body: bytes, headers: dict[str, str]) -> bool: ...

