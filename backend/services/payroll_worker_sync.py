"""Thread-pool workers: sync calls to preview_salary_v2 only (no DB)."""

from __future__ import annotations

import copy
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any

from services.salary_engine_v2 import SalaryPreviewResult, preview_salary_v2


@dataclass(frozen=True)
class PreviewJobPayload:
    as_of: date
    ctc: Decimal
    template_components: list[dict]
    component_map_by_id: dict[Any, dict]
    derived_variables: list[dict]
    template_groups: list[dict]
    group_items_by_group_id: dict[Any, list[dict]]
    statutory_cfg_by_code: dict[str, dict]
    employee_overrides: dict[str, Any]
    wage_proration_factor: Decimal | None


def run_preview_job(payload: PreviewJobPayload) -> SalaryPreviewResult:
    """Deep-copy bundle slices to isolate threads from shared dict mutation."""
    return preview_salary_v2(
        as_of=payload.as_of,
        ctc=payload.ctc,
        template_components=copy.deepcopy(payload.template_components),
        component_map_by_id=copy.deepcopy(payload.component_map_by_id),
        derived_variables=copy.deepcopy(payload.derived_variables),
        template_groups=copy.deepcopy(payload.template_groups),
        group_items_by_group_id=copy.deepcopy(payload.group_items_by_group_id),
        statutory_cfg_by_code=copy.deepcopy(payload.statutory_cfg_by_code),
        employee_overrides=copy.deepcopy(payload.employee_overrides or {}),
        wage_proration_factor=payload.wage_proration_factor,
    )
