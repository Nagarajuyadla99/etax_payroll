from decimal import Decimal

from utils.currency_inr import decimal_to_paise, paise_to_decimal_rupees


def test_paise_roundtrip():
    assert paise_to_decimal_rupees(5000050) == Decimal("50000.50")


def test_zero_paise():
    assert decimal_to_paise(Decimal("0")) == 0
