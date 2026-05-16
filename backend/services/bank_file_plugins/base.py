from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class BankFileRow:
    employee_id: str
    account_number: str
    ifsc: str
    amount: Decimal
    account_holder_name: str
    extra: dict[str, Any] | None = None


@dataclass(frozen=True)
class BankFileBuildResult:
    header: str
    lines: list[str]
    validation_report: dict[str, Any]


class BankFilePlugin(ABC):
    bank_code: str

    @abstractmethod
    def build(self, rows: list[BankFileRow], *, config: dict[str, Any]) -> BankFileBuildResult: ...
