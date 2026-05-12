from __future__ import annotations

import os

from providers.base.provider import BankingProvider
from providers.razorpayx.provider import RazorpayXProvider


def get_provider() -> BankingProvider:
    code = (os.getenv("BANKING_PROVIDER") or "razorpayx").lower()
    if code == "razorpayx":
        return RazorpayXProvider()
    raise RuntimeError(f"Unsupported provider: {code}")

