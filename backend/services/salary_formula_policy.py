"""
Extended formula checks for template authoring (syntax stays in salary_formula_ast).

* Unknown identifier warnings vs strict errors
* Heuristic divide-by-zero hints (static scan only — not a proof)
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from services.salary_formula_ast import validate_formula

_RESERVED = frozenset({"ctc", "CTC"})
_ATTENDANCE = frozenset(
    {
        "WAGE_PRORATION_FACTOR",
        "WORKED_DAYS",
        "PAYABLE_DAYS",
        "PRESENT_UNITS",
        "ABSENT_UNITS",
        "HALF_DAY_UNITS",
        "LOP_UNITS",
        "LOP_LEAVE_UNITS",
        "LEAVE_ON_ATTENDANCE_UNITS",
        "HOLIDAY_UNITS",
        "WEEK_OFF_UNITS",
        "TOTAL_WORKING_DAYS",
        "PAID_LEAVE_UNITS",
        "UNPAID_LEAVE_UNITS",
        "UNKNOWN_UNITS",
        "MISSING_ATTENDANCE_UNITS",
        "OVERTIME_UNITS",
    }
)

_RISKY_DIV_ZERO = re.compile(r"/\s*0(?:\.0*)?(?=\s|$|[,)\]])")


@dataclass(frozen=True)
class FormulaPolicyResult:
    is_valid: bool
    dependencies: list[str]
    error: str | None
    unknown_dependencies: list[str]
    warnings: list[str]
    risk_hints: list[str]


def audit_formula_policy(
    expression: str,
    *,
    known_identifiers: set[str] | None = None,
    strict_unknown: bool = False,
) -> FormulaPolicyResult:
    """
    Run AST validation, then optionally flag dependencies not in known_identifiers.

    ``known_identifiers`` should include component codes, derived variable codes, and
    built-ins you allow for the template being edited. Always include payroll context
    keys if formulas may reference them (e.g. WAGE_PRORATION_FACTOR).
    """
    expr = (expression or "").strip()
    base = validate_formula(expr)
    unknown: list[str] = []
    warnings: list[str] = []
    risks: list[str] = []

    if not base.is_valid:
        return FormulaPolicyResult(
            is_valid=False,
            dependencies=list(base.dependencies or []),
            error=base.error,
            unknown_dependencies=[],
            warnings=[],
            risk_hints=[],
        )

    deps = list(base.dependencies or [])
    allowed = {str(x) for x in (known_identifiers or set())}
    allowed |= _RESERVED | _ATTENDANCE

    for d in deps:
        if d in allowed:
            continue
        # Case-insensitive match against allowed
        dl = d.lower()
        if any(a.lower() == dl for a in allowed):
            continue
        unknown.append(d)

    if unknown:
        msg = f"Unknown identifiers (not in template context): {', '.join(unknown)}"
        if strict_unknown:
            return FormulaPolicyResult(
                is_valid=False,
                dependencies=deps,
                error=msg,
                unknown_dependencies=unknown,
                warnings=[],
                risk_hints=[],
            )
        warnings.append(msg)

    if _RISKY_DIV_ZERO.search(expr):
        risks.append("Expression contains division by literal zero; verify denominators at runtime.")

    return FormulaPolicyResult(
        is_valid=True,
        dependencies=deps,
        error=None,
        unknown_dependencies=unknown,
        warnings=warnings,
        risk_hints=risks,
    )
