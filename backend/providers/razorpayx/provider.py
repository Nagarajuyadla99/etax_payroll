from __future__ import annotations

import base64
import hashlib
import hmac
import os
from typing import Any

import httpx

from providers.base.provider import (
    BeneficiaryCreateRequest,
    BeneficiaryCreateResponse,
    PayoutRequest,
    PayoutResponse,
)


class RazorpayXProvider:
    provider_code = "razorpayx"

    def __init__(self):
        self.base_url = os.getenv("RAZORPAYX_BASE_URL", "https://api.razorpay.com")
        self.key_id = os.getenv("RAZORPAYX_KEY_ID", "")
        self.key_secret = os.getenv("RAZORPAYX_KEY_SECRET", "")
        self.webhook_secret = os.getenv("RAZORPAYX_WEBHOOK_SECRET", "")

        if not self.key_id or not self.key_secret:
            # Keep runtime-safe for local dev; actual calls will fail clearly.
            pass

    def _auth(self) -> tuple[str, str]:
        return (self.key_id, self.key_secret)

    async def create_beneficiary(self, req: BeneficiaryCreateRequest) -> BeneficiaryCreateResponse:
        # Placeholder endpoint; exact RazorpayX beneficiary API may differ by product.
        payload = {
            "name": req.name,
            "email": req.email,
            "contact": req.phone,
            "type": "employee",
            "accounts": [
                {
                    "ifsc": req.ifsc,
                    "account_number": req.account_number,
                    "bank_account_name": req.name,
                }
            ],
        }
        async with httpx.AsyncClient(base_url=self.base_url, auth=self._auth(), timeout=20.0) as client:
            r = await client.post("/v1/contacts", json=payload)
            data = r.json()
            if r.status_code >= 400:
                raise RuntimeError(f"RazorpayX beneficiary create failed: {data}")
            return BeneficiaryCreateResponse(
                provider_beneficiary_id=str(data.get("id") or ""),
                status=str(data.get("status") or "created"),
                raw=data,
            )

    async def initiate_payout(self, req: PayoutRequest) -> PayoutResponse:
        payload = {
            "account_number": os.getenv("RAZORPAYX_SOURCE_ACCOUNT", ""),
            "amount": req.amount_inr * 100,  # Razorpay typically uses paise
            "currency": "INR",
            "mode": "IMPS",
            "purpose": "salary",
            "fund_account_id": req.beneficiary_id,
            "reference_id": req.reference_id,
            "narration": req.narration or "Salary Payout",
        }
        async with httpx.AsyncClient(base_url=self.base_url, auth=self._auth(), timeout=20.0) as client:
            r = await client.post("/v1/payouts", json=payload)
            data = r.json()
            if r.status_code >= 400:
                raise RuntimeError(f"RazorpayX payout failed: {data}")
            return PayoutResponse(
                provider_payout_id=str(data.get("id") or ""),
                status=str(data.get("status") or "queued"),
                utr=data.get("utr"),
                raw=data,
            )

    async def get_payout_status(self, provider_payout_id: str) -> PayoutResponse:
        async with httpx.AsyncClient(base_url=self.base_url, auth=self._auth(), timeout=20.0) as client:
            r = await client.get(f"/v1/payouts/{provider_payout_id}")
            data = r.json()
            if r.status_code >= 400:
                raise RuntimeError(f"RazorpayX payout status failed: {data}")
            return PayoutResponse(
                provider_payout_id=str(data.get("id") or provider_payout_id),
                status=str(data.get("status") or "unknown"),
                utr=data.get("utr"),
                raw=data,
            )

    def verify_webhook(self, *, body: bytes, headers: dict[str, str]) -> bool:
        # Razorpay uses X-Razorpay-Signature HMAC SHA256 over raw body.
        sig = headers.get("x-razorpay-signature") or headers.get("X-Razorpay-Signature")
        if not sig or not self.webhook_secret:
            return False
        digest = hmac.new(self.webhook_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(digest, sig)

