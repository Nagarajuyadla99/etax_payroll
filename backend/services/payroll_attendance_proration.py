"""
Template- and component-level attendance proration for Salary Engine v2.

Design goals
------------
* Backward compatible: templates without ``prorate_with_attendance`` behave as before.
* No double proration: skip auto multiply when formulas already reference attendance scalars.
* Deductions / statutory / system lines are never auto-prorated here (earnings only).
* Modes: ``auto`` (engine may apply factor), ``manual`` (author owns attendance in formula),
  ``disabled`` (never auto apply).

Configuration
-------------
* Template version ``meta`` (or legacy ``salary_templates.meta``):
  ``{"prorate_with_attendance": true}``
* Component master ``meta`` or template-link ``meta``:
  ``{"attendance_proration_mode": "auto"|"manual"|"disabled"}``

When ``prorate_with_attendance`` is true and mode is omitted, treat as ``auto`` for earnings.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, Iterable

from services.salary_formula_ast import validate_formula

logger = logging.getLogger("payroll.attendance_proration")

# Names that must not be auto-multiplied again if already present in authored expressions.
_ATTENDANCE_SIGNAL_NAMES = frozenset(
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
    }
)


def _truthy_meta_flag(raw: Any) -> bool:
    if isinstance(raw, str):
        return raw.strip().lower() in ("1", "true", "yes", "on")
    return bool(raw)


def _falsy_meta_flag(raw: Any) -> bool:
    if raw is None:
        return False
    if isinstance(raw, str):
        return raw.strip().lower() in ("0", "false", "no", "off")
    return raw is False


def template_proration_enabled(template_engine_meta: dict[str, Any] | None) -> bool:
    meta = template_engine_meta or {}
    return _truthy_meta_flag(meta.get("prorate_with_attendance"))


def template_proration_explicitly_disabled(template_engine_meta: dict[str, Any] | None) -> bool:
    meta = template_engine_meta or {}
    return _falsy_meta_flag(meta.get("prorate_with_attendance"))


def payroll_cfg_proration_enabled(payroll_cfg: dict[str, Any] | None) -> bool:
    cfg = payroll_cfg or {}
    return _truthy_meta_flag(cfg.get("prorate_with_attendance"))


def effective_template_proration_enabled(
    template_engine_meta: dict[str, Any] | None,
    *,
    payroll_cfg: dict[str, Any] | None = None,
    wage_proration_factor: Decimal | None = None,
    employee_overrides: dict[str, Any] | None = None,
) -> bool:
    """
    Whether auto wage proration may run for earning lines.

    Enabled when any of:
    * template version meta ``prorate_with_attendance``
    * org ``hr_settings.payroll.prorate_with_attendance``
    * attendance pipeline supplied a sub-unity factor (unless template explicitly opts out)

    Templates without meta stay unchanged when factor is 1 or attendance is not merged.
    """
    factor = wage_proration_factor
    if factor is None:
        factor = wage_proration_factor_from_context(employee_overrides or {})
    try:
        attendance_factor_active = factor is not None and Decimal(str(factor)) < Decimal("1")
    except Exception:  # noqa: BLE001
        attendance_factor_active = False

    if template_proration_explicitly_disabled(template_engine_meta) and not attendance_factor_active:
        return False
    if template_proration_enabled(template_engine_meta):
        return True
    if payroll_cfg_proration_enabled(payroll_cfg):
        return True
    if attendance_factor_active:
        return True
    return False


def attendance_proration_suppressed_reason(
    *,
    template_engine_meta: dict[str, Any] | None,
    payroll_cfg: dict[str, Any] | None,
    wage_proration_factor: Decimal | None,
    employee_overrides: dict[str, Any] | None,
) -> str | None:
    """Human-readable reason when factor < 1 but earnings were not auto-prorated."""
    factor = wage_proration_factor
    if factor is None:
        factor = wage_proration_factor_from_context(employee_overrides or {})
    try:
        f = Decimal(str(factor)) if factor is not None else Decimal("1")
    except Exception:  # noqa: BLE001
        return None
    if f >= Decimal("1"):
        return None
    if effective_template_proration_enabled(
        template_engine_meta,
        payroll_cfg=payroll_cfg,
        wage_proration_factor=f,
        employee_overrides=employee_overrides,
    ):
        return None
    if template_proration_explicitly_disabled(template_engine_meta):
        return "Template has prorate_with_attendance=false; earnings were not auto-prorated."
    return (
        "Attendance factor is below 1 but auto proration is off. Set "
        "prorate_with_attendance:true on the salary template version meta (or org payroll settings)."
    )


def _norm_mode(raw: Any) -> str:
    s = (str(raw or "")).strip().lower()
    if s in ("auto", "manual", "disabled"):
        return s
    return ""


def resolve_attendance_proration_mode(
    *,
    component_meta: dict[str, Any] | None,
    link_meta: dict[str, Any] | None,
    template_prorate: bool,
) -> str:
    """
    Effective mode for an earning line when template proration is enabled.

    * link_meta.attendance_proration_mode wins over component_meta.
    * If absent and template_prorate: default ``auto`` (enterprise default requested).
    * If template_prorate is false, returns ``manual`` (auto path never runs).
    """
    if not template_prorate:
        return "manual"
    lm = link_meta or {}
    cm = component_meta or {}
    m = _norm_mode(lm.get("attendance_proration_mode"))
    if m:
        return m
    m = _norm_mode(cm.get("attendance_proration_mode"))
    if m:
        return m
    return "auto"


def _names_from_formula(expr: str | None) -> set[str]:
    if not expr or not str(expr).strip():
        return set()
    res = validate_formula(str(expr).strip())
    if not res.is_valid:
        return set()
    return {str(n) for n in (res.dependencies or [])}


def expression_signals_attendance_proration(
    *,
    formula_fragments: Iterable[str | None],
    percentage_of: str | None = None,
) -> bool:
    """
    True if any formula dependency or ``percentage_of`` target matches attendance scalars
    (case-insensitive).
    """
    names: set[str] = set()
    for frag in formula_fragments:
        names |= _names_from_formula(frag)
    if percentage_of:
        names.add(str(percentage_of).strip())
    for n in names:
        up = str(n).strip().upper()
        if up in _ATTENDANCE_SIGNAL_NAMES:
            return True
    return False


def _substring_heuristic(expr: str | None) -> bool:
    """Fallback when validate_formula fails: token-like substring match (case-insensitive)."""
    if not expr:
        return False
    s = str(expr).upper()
    for tok in _ATTENDANCE_SIGNAL_NAMES:
        if tok in s:
            return True
    return False


_NON_PRORATABLE_CATEGORIES = frozenset(
    {
        "deduction",
        "statutory",
        "employer_contribution",
        "employer_contributions",
        "reimbursement",
        "benefit",
    }
)
_NON_PRORATABLE_COMPONENT_TYPES = frozenset(
    {
        "bonus",
        "incentive",
        "incentives",
        "reimbursement",
        "overtime",
        "arrear",
        "arrears",
        "one_time",
        "one-time",
        "onetime",
        "employer_contribution",
        "employer_contributions",
        "benefit",
        "gratuity",
        "leave_encashment",
    }
)
_PRORATABLE_COMPONENT_TYPES = frozenset(
    {
        "basic",
        "hra",
        "house_rent_allowance",
        "special_allowance",
        "fixed_monthly",
        "fixed_salary",
        "monthly_salary",
        "salary",
        "da",
        "dearness_allowance",
        "conveyance",
        "transport_allowance",
        "medical_allowance",
        "fixed",
        "allowance",
    }
)
_NON_PRORATABLE_CODE_TOKENS = frozenset(
    {
        "BONUS",
        "INCENTIVE",
        "INCENTIVES",
        "REIMB",
        "REIMBURSEMENT",
        "OVERTIME",
        "OT_PAY",
        "_OT_",
        "ARREAR",
        "ARREARS",
        "ONE_TIME",
        "ONETIME",
        "GRATUITY",
        "LEAVE_ENCASH",
        "LEAVE_ENCASHMENT",
    }
)


def _norm_component_code(code: str | None) -> str:
    return (str(code or "").strip().upper().replace(" ", "_"))


def infer_default_attendance_proratable(
    *,
    category_lower: str,
    component_type_lower: str | None,
    component_code: str | None = None,
) -> bool:
    """
    Industry-default: prorate recurring fixed salary lines only.

    Non-earnings are never prorated. Bonus/incentive/reimbursement types and
    matching component codes default to false. Basic/HRA/fixed monthly default true.
    Generic ``earning`` without bonus-like signals remains proratable (backward compatible).
    """
    cat = (category_lower or "earning").strip().lower()
    if cat != "earning":
        return False
    if cat in _NON_PRORATABLE_CATEGORIES:
        return False

    ct = (component_type_lower or "").strip().lower()
    if ct in _NON_PRORATABLE_COMPONENT_TYPES:
        return False

    code_up = _norm_component_code(component_code)
    if code_up:
        for tok in _NON_PRORATABLE_CODE_TOKENS:
            if tok in code_up:
                return False

    if ct in _PRORATABLE_COMPONENT_TYPES:
        return True
    if ct in ("", "earning", "monthly", "fixed"):
        return True
    return False


def component_attendance_proratable(
    *,
    component_meta: dict[str, Any] | None,
    link_meta: dict[str, Any] | None,
    category_lower: str = "earning",
    component_type_lower: str | None = None,
    component_code: str | None = None,
    default: bool | None = None,
) -> bool:
    """``attendance_proratable`` on link meta wins over component meta; else type/code defaults."""
    for m in (link_meta or {}, component_meta or {}):
        if "attendance_proratable" not in m:
            continue
        v = m.get("attendance_proratable")
        if isinstance(v, str):
            return v.strip().lower() not in ("0", "false", "no", "off")
        return bool(v)
    if default is not None:
        return default
    return infer_default_attendance_proratable(
        category_lower=category_lower,
        component_type_lower=component_type_lower,
        component_code=component_code,
    )


def is_non_proratable_earning_line(
    *,
    category_lower: str,
    component_type_lower: str | None,
    component_code: str | None = None,
    component_meta: dict[str, Any] | None = None,
    link_meta: dict[str, Any] | None = None,
) -> bool:
    if category_lower != "earning":
        return True
    if category_lower in _NON_PRORATABLE_CATEGORIES:
        return True
    return not component_attendance_proratable(
        component_meta=component_meta,
        link_meta=link_meta,
        category_lower=category_lower,
        component_type_lower=component_type_lower,
        component_code=component_code,
    )


def wage_proration_factor_from_context(ctx: dict[str, Any]) -> Decimal:
    """Prefer explicit WAGE_PRORATION_FACTOR from payroll gather overrides; else 1."""
    for key in ("WAGE_PRORATION_FACTOR", "wage_proration_factor"):
        if key in ctx:
            try:
                return Decimal(str(ctx[key]))
            except Exception:  # noqa: BLE001
                break
    return Decimal("1")


def should_apply_auto_wage_proration(
    *,
    category_lower: str,
    component_type_lower: str | None = None,
    component_code: str | None = None,
    source: str,
    template_prorate: bool,
    mode: str,
    formula_fragments: list[str | None],
    percentage_of: str | None,
    component_meta: dict[str, Any] | None = None,
    link_meta: dict[str, Any] | None = None,
) -> bool:
    if not template_prorate:
        return False
    if is_non_proratable_earning_line(
        category_lower=category_lower,
        component_type_lower=component_type_lower,
        component_code=component_code,
        component_meta=component_meta,
        link_meta=link_meta,
    ):
        return False
    src = str(source or "")
    if src.startswith("system:"):
        return False
    if mode == "disabled":
        return False
    if mode == "manual":
        return False
    if mode != "auto":
        return False

    combined = list(formula_fragments)
    if expression_signals_attendance_proration(formula_fragments=combined, percentage_of=percentage_of):
        return False
    # If strict parse failed but heuristic sees tokens, still skip (avoid double).
    for frag in combined:
        if _substring_heuristic(frag):
            return False
    if percentage_of and _substring_heuristic(percentage_of):
        return False
    return True


def apply_auto_proration_to_amount(
    *,
    amount: Decimal,
    ctx: dict[str, Any],
    attendance_proratable: bool = True,
) -> tuple[Decimal, dict[str, Any]]:
    """
    Multiply earning amount by WAGE_PRORATION_FACTOR from context.
    Returns (new_amount, breakdown_delta).
    """
    factor = wage_proration_factor_from_context(ctx)
    before = amount
    if factor == Decimal("1") or not attendance_proratable:
        return amount, build_component_proration_breakdown(
            original=before,
            final=before,
            attendance_proratable=attendance_proratable,
            applied=False,
            factor=factor,
        )
    out = before * factor
    return out, build_component_proration_breakdown(
        original=before,
        final=out,
        attendance_proratable=attendance_proratable,
        applied=True,
        factor=factor,
    )


def build_component_proration_breakdown(
    *,
    original: Decimal,
    final: Decimal,
    attendance_proratable: bool,
    applied: bool,
    factor: Decimal,
) -> dict[str, Any]:
    """Per-line audit payload stored on salary engine lines and payroll entry meta."""
    return {
        "attendance_proratable": attendance_proratable,
        "attendance_auto_proration": applied,
        "proration_applied": applied,
        "amount_before_proration": format(original, "f"),
        "original_amount": format(original, "f"),
        "final_amount": format(final, "f"),
        "wage_proration_factor": format(factor, "f"),
    }


def build_attendance_proration_preview_audit(
    *,
    lines: list[Any],
    template_prorate: bool,
    effective_template_prorate: bool,
    wage_proration_factor: Decimal | None,
    employee_overrides: dict[str, Any] | None,
    template_engine_meta: dict[str, Any] | None,
    payroll_cfg: dict[str, Any] | None,
    suppressed_reason: str | None,
) -> dict[str, Any]:
    """Structured audit block for preview API / payroll execution_meta."""
    factor = wage_proration_factor
    if factor is None:
        factor = wage_proration_factor_from_context(employee_overrides or {})

    prorated_components: list[dict[str, Any]] = []
    component_proration: list[dict[str, Any]] = []
    for ln in lines or []:
        bd = getattr(ln, "breakdown", None) or {}
        if not bd and getattr(ln, "category", "").lower() != "earning":
            continue
        code = getattr(ln, "component_code", None) or getattr(ln, "name", None) or "?"
        try:
            original = Decimal(
                str(bd.get("amount_before_proration") or bd.get("original_amount") or "0")
            )
            final_amt = getattr(ln, "amount", Decimal("0"))
            if not bd.get("amount_before_proration") and not bd.get("original_amount"):
                original = final_amt
            fac = Decimal(str(bd.get("wage_proration_factor", factor or "1")))
        except Exception:  # noqa: BLE001
            continue
        proratable = bool(bd.get("attendance_proratable", False))
        applied = bool(bd.get("proration_applied") or bd.get("attendance_auto_proration"))
        row = {
            "component": str(code),
            "attendance_proratable": proratable,
            "proration_applied": applied,
            "original": float(original),
            "factor": float(fac),
            "final": float(final_amt),
        }
        component_proration.append(row)
        if applied:
            prorated_components.append(row)

    try:
        factor_f = float(factor) if factor is not None else None
    except Exception:  # noqa: BLE001
        factor_f = None

    return {
        "attendance_proration_applied": bool(prorated_components),
        "effective_prorate_with_attendance": effective_template_prorate,
        "template_prorate_with_attendance": template_prorate,
        "wage_proration_factor": factor_f,
        "prorated_components": prorated_components,
        "component_proration": component_proration,
        "attendance_proration_suppressed_reason": suppressed_reason,
        "template_meta_has_prorate_flag": template_proration_enabled(template_engine_meta),
        "org_payroll_prorate_with_attendance": payroll_cfg_proration_enabled(payroll_cfg),
    }
