from __future__ import annotations

from services.bank_file_plugins.base import BankFilePlugin
from services.bank_file_plugins.default_csv import DefaultCsvPlugin
from services.bank_file_plugins.hdfc import HdfcSalaryPlugin
from services.bank_file_plugins.icici import IciciSalaryPlugin
from services.bank_file_plugins.sbi import SbiSalaryPlugin

_PLUGINS: dict[str, BankFilePlugin] = {
    "DEFAULT": DefaultCsvPlugin(),
    "SBI": SbiSalaryPlugin(),
    "ICICI": IciciSalaryPlugin(),
    "HDFC": HdfcSalaryPlugin(),
}


def get_bank_file_plugin(bank_code: str) -> BankFilePlugin:
    code = (bank_code or "DEFAULT").upper()
    return _PLUGINS.get(code, _PLUGINS["DEFAULT"])
