"""INR amount helpers for banking/disbursement (isolated from payroll engine)."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


def decimal_to_paise(amount: Decimal | str | int) -> int:
    """
    Convert rupees (Decimal) to integer paise for provider APIs.
    Never uses float.
    """
    d = amount if isinstance(amount, Decimal) else Decimal(str(amount))
    paise = (d * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(paise)


def paise_to_decimal_rupees(paise: int) -> Decimal:
    return (Decimal(int(paise)) / Decimal("100")).quantize(Decimal("0.01"))
