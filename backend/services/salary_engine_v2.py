from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Any
from uuid import UUID

from services.salary_formula_ast import FormulaError, evaluate_formula, validate_formula
from services.statutory_registry import DEFAULT_REGISTRY


@dataclass
class SalaryLine:
    component_id: UUID
    component_code: str
    name: str
    category: str
    amount: Decimal
    source: str
    breakdown: dict[str, Any] | None = None


@dataclass
class SalaryPreviewResult:
    variables: dict[str, Decimal]
    lines: list[SalaryLine]
    totals: dict[str, Decimal]
    errors: list[str]


class CircularDependencyError(ValueError):
    pass


STATUTORY_GROUP_CODES = {
    "PF_GROUP",
    "ESI_GROUP",
    "PT_GROUP",
    "TDS_GROUP",
}


def _is_statutory_group(group_code: str) -> bool:
    return _norm_code(group_code).upper() in STATUTORY_GROUP_CODES


def _norm_code(s: str) -> str:
    return (s or "").strip()


def _d(v: Any) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    try:
        return Decimal(str(v))
    except Exception:  # noqa: BLE001
        return Decimal("0")


def _quantize(amount: Decimal, rounding_rule: dict[str, Any] | None) -> Decimal:
    rule = rounding_rule or {}
    scale = int(rule.get("scale", 2))
    q = Decimal("1").scaleb(-scale)  # 10^-scale
    try:
        return amount.quantize(q)
    except Exception:  # noqa: BLE001
        return amount


def _rupee(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def _toposort(nodes: set[str], edges: dict[str, set[str]]) -> list[str]:
    # edges: node -> dependencies
    perm: set[str] = set()
    temp: set[str] = set()
    out: list[str] = []

    def visit(n: str):
        if n in perm:
            return
        if n in temp:
            raise CircularDependencyError(f"circular dependency detected at {n}")
        temp.add(n)
        for dep in edges.get(n, set()):
            if dep in nodes:
                visit(dep)
        temp.remove(n)
        perm.add(n)
        out.append(n)

    for n in sorted(nodes):
        if n not in perm:
            visit(n)
    return out


def preview_salary_v2(
    *,
    as_of: date,
    ctc: Decimal,
    template_components: list[dict],
    component_map_by_id: dict[UUID, dict],
    derived_variables: list[dict],
    template_groups: list[dict],
    group_items_by_group_id: dict[UUID, list[dict]],
    statutory_cfg_by_code: dict[str, dict],
    employee_overrides: dict[str, Any] | None = None,
    wage_proration_factor: Decimal | None = None,
    wage_proration_dv_codes: list[str] | None = None,
) -> SalaryPreviewResult:
    """
    Calculation-only engine.

    Inputs are plain dicts to keep this service layer decoupled from ORM/Pydantic.
    """
    errors: list[str] = []
    overrides = employee_overrides or {}

    pf_settings_early = (statutory_cfg_by_code.get("PF") or {}).get("settings") or {}
    if wage_proration_dv_codes is None:
        raw_codes = pf_settings_early.get("pf_wage_proration_dv_codes")
        if isinstance(raw_codes, list) and raw_codes:
            proration_codes = [_norm_code(str(x)) for x in raw_codes if str(x).strip()]
        else:
            proration_codes = [
                _norm_code(str(pf_settings_early.get("pf_wage_dv_code", "PF_WAGE") or "PF_WAGE"))
            ]
    else:
        proration_codes = [_norm_code(str(x)) for x in wage_proration_dv_codes if str(x).strip()]

    ctx: dict[str, Any] = {"CTC": _d(ctc), "ctc": _d(ctc), **overrides}
    variables: dict[str, Decimal] = {}
    lines: list[SalaryLine] = []

    # ------------------------------------------------------------------
    # Providers: map identifiers -> provider node
    # ------------------------------------------------------------------
    dv_code_to_node: dict[str, str] = {}
    comp_code_to_node: dict[str, str] = {}
    # system outputs are also provided by component codes (group items)

    for dv in derived_variables:
        code = _norm_code(str(dv.get("code") or ""))
        if code:
            dv_code_to_node[code] = f"dv:{code}"

    # Determine component codes from template components
    template_components_sorted = sorted(template_components, key=lambda x: int(x.get("sequence") or 1))
    for link in template_components_sorted:
        comp = component_map_by_id.get(link.get("component_id"))
        if not comp:
            continue
        code = _norm_code(str(comp.get("code") or ""))
        if code:
            comp_code_to_node[code] = f"comp:{code}"

    # Include group item component codes as providers too
    for gid, items in (group_items_by_group_id or {}).items():
        for it in items or []:
            c = it.get("component") or {}
            code = _norm_code(str(c.get("code") or ""))
            if code:
                comp_code_to_node.setdefault(code, f"comp:{code}")

    # ------------------------------------------------------------------
    # Node graph across derived vars + template components + system engines
    # ------------------------------------------------------------------
    def add_line(
        comp: dict,
        amount: Decimal,
        source: str,
        *,
        breakdown: dict[str, Any] | None = None,
    ):
        cat = (comp.get("component_category") or comp.get("component_type") or "earning")  # fallback
        code = str(comp.get("code") or "").strip() or str(comp.get("name") or "").strip().upper().replace(" ", "_")
        rounding_rule = comp.get("rounding_rule") or {}
        if str(source).startswith("system:"):
            amt = _rupee(_d(amount))
        else:
            amt = _quantize(amount, rounding_rule)
        lines.append(
            SalaryLine(
                component_id=comp["component_id"],
                component_code=code,
                name=str(comp.get("name") or code),
                category=str(cat),
                amount=amt,
                source=source,
                breakdown=breakdown,
            )
        )
        ctx[code] = amt
        ctx[str(comp.get("name") or "").strip()] = amt

    nodes: set[str] = set()
    edges: dict[str, set[str]] = {}

    # Derived variable nodes
    dv_expr: dict[str, str] = {}
    for dv in derived_variables:
        code = _norm_code(str(dv.get("code") or ""))
        expr = (dv.get("expression") or "").strip()
        if not code or not expr:
            continue
        n = f"dv:{code}"
        nodes.add(n)
        dv_expr[n] = expr
        res = validate_formula(expr)
        if not res.is_valid:
            errors.append(f"derived variable {code} invalid: {res.error}")
            edges[n] = set()
        else:
            deps = set()
            for dep in res.dependencies:
                if dep in dv_code_to_node:
                    deps.add(dv_code_to_node[dep])
                if dep in comp_code_to_node:
                    deps.add(comp_code_to_node[dep])
            edges[n] = deps

    # Component nodes (only those present in template; evaluated from their link)
    comp_link_by_code: dict[str, dict] = {}
    comp_by_code: dict[str, dict] = {}
    for link in template_components_sorted:
        comp = component_map_by_id.get(link.get("component_id"))
        if not comp:
            continue
        code = _norm_code(str(comp.get("code") or ""))
        if not code:
            errors.append(f"component_id={comp.get('component_id')} missing code (required for Phase 2 DAG)")
            continue
        comp_link_by_code[code] = link
        comp_by_code[code] = comp
        n = f"comp:{code}"
        nodes.add(n)

        calc_type = (comp.get("calculation_type") or comp.get("calc_type") or "fixed").lower()
        if calc_type == "fixed":
            edges[n] = set()
        elif calc_type == "percentage":
            base_key = str(link.get("percentage_of") or comp.get("percentage_of") or "CTC").strip()
            deps = set()
            if base_key in dv_code_to_node:
                deps.add(dv_code_to_node[base_key])
            if base_key in comp_code_to_node:
                deps.add(comp_code_to_node[base_key])
            edges[n] = deps
        elif calc_type == "formula":
            expr = (link.get("formula") or comp.get("formula_expression") or comp.get("formula") or "").strip()
            if not expr:
                edges[n] = set()
            else:
                res = validate_formula(expr)
                if not res.is_valid:
                    errors.append(f"component formula invalid ({code}): {res.error}")
                    edges[n] = set()
                else:
                    deps = set()
                    for dep in res.dependencies:
                        if dep in dv_code_to_node:
                            deps.add(dv_code_to_node[dep])
                        if dep in comp_code_to_node:
                            deps.add(comp_code_to_node[dep])
                    edges[n] = deps
        elif calc_type == "system":
            # system engine runs via template group nodes
            edges[n] = set()
        else:
            errors.append(f"unsupported calculation_type={calc_type} for component {code}")
            edges[n] = set()

    # --------------------------------------------------------------
    # Group nodes
    # --------------------------------------------------------------

    sys_nodes: dict[str, dict] = {}
    regular_group_nodes: dict[str, dict] = {}

    for tplg in sorted(template_groups, key=lambda x: int(x.get("sequence") or 1)):
        gid = tplg.get("group_id")
        gcode = _norm_code(str(tplg.get("group_code") or tplg.get("code") or ""))
        if not gid or not gcode:
            continue

        # ----------------------------------------------------------
        # STATUTORY GROUPS
        # ----------------------------------------------------------

        if _is_statutory_group(gcode):
            statutory_code = gcode.upper().removesuffix("_GROUP")
            sys_node = f"sys:{statutory_code}:{gid}"
            nodes.add(sys_node)
            sys_nodes[sys_node] = {
                "group_id": gid,
                "group_code": gcode.upper(),
                "statutory_code": statutory_code,
            }

            deps = set()
            if statutory_code == "PF":
                pf_s = (statutory_cfg_by_code.get("PF") or {}).get("settings") or {}
                pf_dv = _norm_code(
                    str(pf_s.get("pf_wage_dv_code", "PF_WAGE") or "PF_WAGE")
                )
                dep = dv_code_to_node.get(pf_dv) or f"dv:{pf_dv}"
                deps.add(dep)
            edges[sys_node] = {d for d in deps if d}

        # ----------------------------------------------------------
        # REGULAR GROUPS
        # ----------------------------------------------------------

        else:
            reg_node = f"grp:{gcode}:{gid}"
            nodes.add(reg_node)
            regular_group_nodes[reg_node] = {
                "group_id": gid,
                "group_code": gcode,
            }

            deps = set()
            items = group_items_by_group_id.get(gid) or []
            for it in items:
                c = it.get("component") or {}
                ccode = _norm_code(str(c.get("code") or ""))
                if not ccode:
                    continue
                comp_node = comp_code_to_node.get(ccode)
                if comp_node:
                    deps.add(comp_node)
            edges[reg_node] = deps

    # Toposort across everything
    try:
        order = _toposort(nodes, edges)
    except CircularDependencyError as e:
        return SalaryPreviewResult(variables=variables, lines=[], totals={}, errors=errors + [str(e)])

    # Evaluate nodes in DAG order
    for n in order:
        if n.startswith("dv:"):
            code = n.split(":", 1)[1]
            expr = dv_expr.get(n, "")
            if not expr:
                ctx[code] = Decimal("0")
                variables[code] = Decimal("0")
                continue
            try:
                val = evaluate_formula(expr, ctx)
                ctx[code] = val
                variables[code] = val
            except (FormulaError, Exception) as e:  # noqa: BLE001
                errors.append(f"derived variable {code} evaluation failed: {str(e)}")
                ctx[code] = Decimal("0")
                variables[code] = Decimal("0")
            if wage_proration_factor is not None and proration_codes and code in proration_codes:
                f = _d(wage_proration_factor)
                if f < Decimal("0") or f > Decimal("1"):
                    errors.append(f"wage_proration_factor must be within [0,1], got {f}")
                else:
                    ctx[code] = _d(ctx[code]) * f
                    variables[code] = _d(variables[code]) * f
            continue

        if n.startswith("comp:"):
            code = n.split(":", 1)[1]
            comp = comp_by_code.get(code)
            link = comp_link_by_code.get(code)
            if not comp or not link:
                continue
            calc_type = (comp.get("calculation_type") or comp.get("calc_type") or "fixed").lower()
            if calc_type == "fixed":
                add_line(comp, _d(link.get("amount")), "fixed")
            elif calc_type == "percentage":
                pct = _d(link.get("percentage"))
                base_key = str(link.get("percentage_of") or comp.get("percentage_of") or "CTC").strip()
                base_val = _d(ctx.get(base_key, ctx.get(base_key.upper(), 0)))
                add_line(comp, (base_val * pct) / Decimal("100"), f"percentage_of:{base_key}")
            elif calc_type == "formula":
                expr = (link.get("formula") or comp.get("formula_expression") or comp.get("formula") or "").strip()
                if not expr:
                    add_line(comp, Decimal("0"), "formula:empty")
                else:
                    try:
                        add_line(comp, evaluate_formula(expr, ctx), "formula")
                    except (FormulaError, Exception) as e:  # noqa: BLE001
                        errors.append(f"component formula eval failed ({code}): {str(e)}")
                        add_line(comp, Decimal("0"), "formula:error")
            # system components are not emitted directly
            continue

        # ----------------------------------------------------------
        # REGULAR GROUP EXECUTION
        # ----------------------------------------------------------

        if n.startswith("grp:"):
            meta = regular_group_nodes.get(n) or {}
            gid = meta.get("group_id")
            items = group_items_by_group_id.get(gid) or []

            for it in items:
                c = it.get("component") or {}
                if not c:
                    continue

                code = _norm_code(str(c.get("code") or ""))
                if not code:
                    continue

                # skip if already emitted from template components
                already_exists = any(ln.component_code == code for ln in lines)
                if already_exists:
                    continue

                link = comp_link_by_code.get(code)
                calc_type = (
                    c.get("calculation_type")
                    or c.get("calc_type")
                    or "fixed"
                ).lower()
                amount = Decimal("0")

                try:
                    if calc_type == "fixed":
                        if code in overrides:
                            amount = _d(overrides[code])
                        elif code in ctx:
                            amount = _d(ctx[code])
                        elif link is not None and link.get("amount") is not None:
                            amount = _d(link.get("amount"))
                        else:
                            amount = _d(c.get("amount"))
                    elif calc_type == "percentage":
                        pct = _d(
                            (link or {}).get("percentage")
                            if (link or {}).get("percentage") is not None
                            else c.get("percentage")
                        )
                        base_key = str(
                            (link or {}).get("percentage_of")
                            or c.get("percentage_of")
                            or "CTC"
                        ).strip()
                        base_val = _d(ctx.get(base_key, ctx.get(base_key.upper(), 0)))
                        amount = (base_val * pct) / Decimal("100")
                    elif calc_type == "formula":
                        expr = (
                            (link or {}).get("formula")
                            or c.get("formula_expression")
                            or c.get("formula")
                            or ""
                        ).strip()
                        if expr:
                            amount = evaluate_formula(expr, ctx)

                    add_line(
                        c,
                        amount,
                        f"group:{meta.get('group_code')}",
                    )
                except Exception as e:  # noqa: BLE001
                    errors.append(f"group component eval failed ({code}): {str(e)}")
                    add_line(
                        c,
                        Decimal("0"),
                        f"group:error:{meta.get('group_code')}",
                    )

            continue

        if n.startswith("sys:"):
            meta = sys_nodes.get(n) or {}
            statutory_code = str(meta.get("statutory_code") or "").upper()
            gid = meta.get("group_id")
            if not statutory_code:
                continue

            engine = DEFAULT_REGISTRY.get(statutory_code)
            if engine is None:
                errors.append(f"no statutory engine registered for {statutory_code}")
                continue

            st_cfg = statutory_cfg_by_code.get(statutory_code) or {}
            if st_cfg.get("is_enabled") is False:
                continue

            outputs, engine_errors = engine.calculate(
                as_of=as_of,
                context=ctx,
                statutory_cfg=st_cfg,
                overrides=overrides,
            )
            errors.extend(engine_errors or [])
            if not outputs:
                continue

            breakdown = {k: float(v) for k, v in outputs.items()}
            items = group_items_by_group_id.get(gid) or []
            for it in items:
                c = it.get("component") or {}
                code = _norm_code(str(c.get("code") or ""))
                if not code or code not in outputs:
                    continue
                add_line(
                    c,
                    outputs[code],
                    f"system:{statutory_code}",
                    breakdown=breakdown,
                )
            continue

    # ------------------------------------------------------------------
    # Totals
    # ------------------------------------------------------------------
    totals = {
        "earnings": Decimal("0"),
        "deductions": Decimal("0"),
        "employer_contributions": Decimal("0"),
        "statutory": Decimal("0"),
    }
    for ln in lines:
        cat = (ln.category or "").lower()
        if cat == "earning":
            totals["earnings"] += ln.amount
        elif cat == "deduction":
            totals["deductions"] += ln.amount
        elif cat == "employer_contribution":
            totals["employer_contributions"] += ln.amount
        elif cat == "statutory":
            totals["statutory"] += ln.amount
        else:
            # unknown categories treated as earnings (non-breaking)
            totals["earnings"] += ln.amount

    totals["net_pay"] = totals["earnings"] - totals["deductions"] - totals["statutory"]

    return SalaryPreviewResult(
        variables=variables,
        lines=lines,
        totals=totals,
        errors=errors,
    )

