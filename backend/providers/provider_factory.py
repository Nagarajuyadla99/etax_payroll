from __future__ import annotations

from providers.base.provider import BankingProvider
from providers.razorpayx.provider import RazorpayXProvider


def get_provider(provider_code: str) -> BankingProvider:
    code = (provider_code or "").lower()
    if code in {"razorpayx", "razorpay_x"}:
        return RazorpayXProvider()
    raise ValueError(f"Unsupported provider: {provider_code}")

