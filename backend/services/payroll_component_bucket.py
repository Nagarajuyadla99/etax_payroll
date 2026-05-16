"""
Shared payroll line categorization for summary, payslip, register, and banking.

Rules (MVP, aligned with Salary Engine V2 persisted lines):
- ``component_category`` wins over legacy ``component_type`` when present.
- ``earning`` → employee gross earnings bucket.
- ``employer_contribution`` → employer-only bucket (never reduces employee net).
- All other categories (``deduction``, ``statutory``, etc.) → employee deductions bucket.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Mapping

CATEGORY_EARNING = "earning"
CATEGORY_EMPLOYER_CONTRIBUTION = "employer_contribution"


def resolve_payroll_component_category(component: Any) -> str:
    """
    Normalize category from a ``SalaryComponent`` OR a mapping-shaped row.

    Returns lowercased semantic category string (may be empty if unknown).
    """
    if component is None:
        return ""
    if isinstance(component, Mapping):
        cc = component.get("component_category")
        ct = component.get("component_type")
    else:
        cc = getattr(component, "component_category", None)
        ct = getattr(component, "component_type", None)
    return str(cc or ct or "").strip().lower()


def new_bucket_totals() -> dict[str, Decimal]:
    return {
        "earnings": Decimal("0"),
        "deductions": Decimal("0"),
        "employer_contributions": Decimal("0"),
    }


def apply_category_amount_to_totals(totals: dict[str, Decimal], category: str, amount: Decimal) -> None:
    """Mutates ``totals`` in place (earnings / deductions / employer_contributions)."""
    cat = (category or "").strip().lower()
    if cat == CATEGORY_EARNING:
        totals["earnings"] += amount
    elif cat == CATEGORY_EMPLOYER_CONTRIBUTION:
        totals["employer_contributions"] += amount
    else:
        totals["deductions"] += amount


def net_employee_pay_from_totals(totals: Mapping[str, Decimal]) -> Decimal:
    """Employee net = earnings − employee deductions (employer bucket excluded)."""
    return totals["earnings"] - totals["deductions"]


def aggregate_payroll_run_totals(
    *,
    entries: list[Any],
    component_by_id: dict[Any, Any],
) -> dict[str, Decimal]:
    """
    Roll up all ``PayrollEntry`` rows for a run using shared categorization.

    Returns keys: earnings, deductions, employer_contributions, net.
    """
    totals = new_bucket_totals()
    for entry in entries:
        comp = component_by_id.get(entry.component_id)
        if not comp:
            continue
        apply_category_amount_to_totals(
            totals,
            resolve_payroll_component_category(comp),
            Decimal(str(entry.amount)),
        )
    out = dict(totals)
    out["net"] = net_employee_pay_from_totals(totals)
    return out
