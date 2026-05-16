from __future__ import annotations

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
from providers.razorpayx.errors import RazorpayXAPIError


class RazorpayXProvider:
    provider_code = "razorpayx"

    def __init__(
        self,
        *,
        key_id: str | None = None,
        key_secret: str | None = None,
        webhook_secret: str | None = None,
        source_account: str | None = None,
        base_url: str | None = None,
    ):
        self.base_url = (base_url or os.getenv("RAZORPAYX_BASE_URL", "https://api.razorpay.com")).rstrip("/")
        self.key_id = key_id if key_id is not None else os.getenv("RAZORPAYX_KEY_ID", "")
        self.key_secret = key_secret if key_secret is not None else os.getenv("RAZORPAYX_KEY_SECRET", "")
        self.webhook_secret = webhook_secret if webhook_secret is not None else os.getenv("RAZORPAYX_WEBHOOK_SECRET", "")
        self.source_account = source_account if source_account is not None else os.getenv("RAZORPAYX_SOURCE_ACCOUNT", "")

    def _auth(self) -> tuple[str, str]:
        if not self.key_id or not self.key_secret:
            raise RazorpayXAPIError(
                "RazorpayX credentials not configured (RAZORPAYX_KEY_ID / RAZORPAYX_KEY_SECRET)",
                error_code="CONFIG_MISSING",
            )
        return (self.key_id, self.key_secret)

    def _parse_error(self, response: httpx.Response) -> RazorpayXAPIError:
        try:
            data = response.json()
        except Exception:
            data = {"description": response.text}
        err = data.get("error") if isinstance(data, dict) else {}
        if isinstance(err, dict):
            code = err.get("code") or err.get("reason")
            desc = err.get("description") or err.get("message") or str(data)
        else:
            code = None
            desc = str(data)
        return RazorpayXAPIError(
            f"RazorpayX API error: {desc}",
            http_status=response.status_code,
            error_code=str(code) if code else None,
            raw=data if isinstance(data, dict) else {"raw": data},
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(
            base_url=self.base_url,
            auth=self._auth(),
            timeout=30.0,
        ) as client:
            response = await client.request(method, path, json=json)
            if response.status_code >= 400:
                raise self._parse_error(response)
            data = response.json()
            return data if isinstance(data, dict) else {}

    async def create_beneficiary(self, req: BeneficiaryCreateRequest) -> BeneficiaryCreateResponse:
        """
        RazorpayX flow: Contact → Fund account (bank).
        Returns fund_account_id as provider_beneficiary_id for payouts.
        """
        ref = req.reference_id or f"emp:{req.name}"
        contact_payload: dict[str, Any] = {
            "name": req.name,
            "type": "employee",
            "reference_id": ref,
        }
        if req.email:
            contact_payload["email"] = req.email
        if req.phone:
            contact_payload["contact"] = req.phone

        contact = await self._request("POST", "/v1/contacts", json=contact_payload)
        contact_id = str(contact.get("id") or "")
        if not contact_id:
            raise RazorpayXAPIError("Contact create returned no id", raw=contact)

        fund_payload = {
            "contact_id": contact_id,
            "account_type": "bank_account",
            "bank_account": {
                "name": req.name,
                "ifsc": req.ifsc.upper(),
                "account_number": req.account_number,
            },
        }
        fund = await self._request("POST", "/v1/fund_accounts", json=fund_payload)
        fund_id = str(fund.get("id") or "")
        if not fund_id:
            raise RazorpayXAPIError("Fund account create returned no id", raw=fund)

        return BeneficiaryCreateResponse(
            provider_beneficiary_id=fund_id,
            status=str(fund.get("active") and "active" or "created"),
            raw={"contact": contact, "fund_account": fund},
        )

    async def initiate_payout(self, req: PayoutRequest) -> PayoutResponse:
        source = self.source_account
        if not source:
            raise RazorpayXAPIError(
                "RAZORPAYX_SOURCE_ACCOUNT is required for payouts",
                error_code="CONFIG_MISSING",
            )
        payload = {
            "account_number": source,
            "fund_account_id": req.beneficiary_id,
            "amount": int(req.amount_inr),
            "currency": "INR",
            "mode": os.getenv("RAZORPAYX_PAYOUT_MODE", "IMPS"),
            "purpose": "salary",
            "reference_id": req.reference_id[:40],
            "narration": (req.narration or "Salary")[:30],
        }
        data = await self._request("POST", "/v1/payouts", json=payload)
        return PayoutResponse(
            provider_payout_id=str(data.get("id") or ""),
            status=str(data.get("status") or "queued"),
            utr=data.get("utr"),
            raw=data,
        )

    async def get_payout_status(self, provider_payout_id: str) -> PayoutResponse:
        data = await self._request("GET", f"/v1/payouts/{provider_payout_id}")
        return PayoutResponse(
            provider_payout_id=str(data.get("id") or provider_payout_id),
            status=str(data.get("status") or "unknown"),
            utr=data.get("utr"),
            raw=data,
        )

    def verify_webhook(self, *, body: bytes, headers: dict[str, str]) -> bool:
        sig = headers.get("x-razorpay-signature") or headers.get("X-Razorpay-Signature")
        if not sig or not self.webhook_secret:
            return False
        digest = hmac.new(self.webhook_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(digest, sig)
