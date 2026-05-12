from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any, Protocol


class StatutoryEngine(Protocol):
    code: str

    def calculate(
        self,
        *,
        as_of: date,
        context: dict[str, Any],
        statutory_cfg: dict[str, Any],
        overrides: dict[str, Any],
    ) -> tuple[dict[str, Decimal], list[str]]: ...


@dataclass(frozen=True)
class StatutoryEngineRegistry:
    engines: dict[str, StatutoryEngine]

    def get(self, code: str) -> StatutoryEngine | None:
        if not code:
            return None
        return self.engines.get(str(code).upper())


class PFEngineAdapter:
    code = "PF"

    def calculate(
        self,
        *,
        as_of: date,
        context: dict[str, Any],
        statutory_cfg: dict[str, Any],
        overrides: dict[str, Any],
    ) -> tuple[dict[str, Decimal], list[str]]:
        # PF engine remains untouched; adapter just standardizes interface.
        from services.statutory_pf_engine import calculate_pf_group

        return calculate_pf_group(
            as_of=as_of,
            context=context,
            statutory_cfg=statutory_cfg,
            overrides=overrides,
        )


DEFAULT_REGISTRY = StatutoryEngineRegistry(
    engines={
        "PF": PFEngineAdapter(),
    }
)

