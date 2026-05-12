"""
Observability-only DAG layout aligned with salary_engine_v2 graph construction.

Does not evaluate formulas or amounts — planning / ordering only.
Does not modify salary_engine_v2.
"""

from __future__ import annotations

from typing import Any

from services.salary_formula_ast import validate_formula
from services.salary_engine_v2 import CircularDependencyError, _norm_code, _toposort


def build_phase2_dag_plan_from_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    gi = bundle.get("group_items_by_group_id") or {}
    tc = bundle.get("template_components") or []
    cm = bundle.get("component_map_by_id") or {}
    dv = bundle.get("derived_variables") or []
    tg = bundle.get("template_groups") or []
    st = bundle.get("statutory_cfg_by_code") or {}

    dv_code_to_node: dict[str, str] = {}
    comp_code_to_node: dict[str, str] = {}

    for d in dv:
        code = _norm_code(str(d.get("code") or ""))
        if code:
            dv_code_to_node[code] = f"dv:{code}"

    template_components_sorted = sorted(tc, key=lambda x: int(x.get("sequence") or 1))
    for link in template_components_sorted:
        comp = cm.get(link.get("component_id")) or cm.get(str(link.get("component_id")))
        if not comp:
            continue
        code = _norm_code(str(comp.get("code") or ""))
        if code:
            comp_code_to_node[code] = f"comp:{code}"

    for _, items in (gi or {}).items():
        for it in items or []:
            c = it.get("component") or {}
            code = _norm_code(str(c.get("code") or ""))
            if code:
                comp_code_to_node.setdefault(code, f"comp:{code}")

    return _build_edges(
        template_components_sorted,
        cm,
        dv,
        tg,
        st,
        dv_code_to_node,
        comp_code_to_node,
    )


def _build_edges(
    template_components_sorted: list,
    component_map_by_id: dict[Any, dict],
    derived_variables: list,
    template_groups: list,
    statutory_cfg_by_code: dict[str, dict],
    dv_code_to_node: dict[str, str],
    comp_code_to_node: dict[str, str],
) -> dict[str, Any]:
    errors: list[str] = []
    nodes: set[str] = set()
    edges: dict[str, set[str]] = {}

    def comp_get(link):
        cid = link.get("component_id")
        return component_map_by_id.get(cid) or component_map_by_id.get(str(cid))

    for dv in derived_variables:
        code = _norm_code(str(dv.get("code") or ""))
        expr = (dv.get("expression") or "").strip()
        if not code or not expr:
            continue
        n = f"dv:{code}"
        nodes.add(n)
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

    for link in template_components_sorted:
        comp = comp_get(link)
        if not comp:
            continue
        code = _norm_code(str(comp.get("code") or ""))
        if not code:
            errors.append(f"component_id={link.get('component_id')} missing code")
            continue
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
            edges[n] = set()
        else:
            errors.append(f"unsupported calculation_type={calc_type} for component {code}")
            edges[n] = set()

    sys_nodes: dict[str, dict] = {}
    for tplg in sorted(template_groups or [], key=lambda x: int(x.get("sequence") or 1)):
        gid = tplg.get("group_id")
        gcode = _norm_code(str(tplg.get("group_code") or tplg.get("code") or ""))
        if not gid or not gcode:
            continue
        if not gcode.upper().endswith("_GROUP"):
            continue
        statutory_code = gcode.upper().removesuffix("_GROUP")
        sys_node = f"sys:{statutory_code}:{gid}"
        nodes.add(sys_node)
        sys_nodes[sys_node] = {"group_id": str(gid), "group_code": gcode.upper(), "statutory_code": statutory_code}

        deps = set()
        if statutory_code == "PF":
            pf_s = (statutory_cfg_by_code.get("PF") or {}).get("settings") or {}
            pf_dv = _norm_code(str(pf_s.get("pf_wage_dv_code", "PF_WAGE") or "PF_WAGE"))
            dep = dv_code_to_node.get(pf_dv) or f"dv:{pf_dv}"
            deps.add(dep)
        edges[sys_node] = {d for d in deps if d}

    serializable_edges = {k: sorted(v) for k, v in sorted(edges.items())}
    try:
        order = _toposort(nodes, edges)
    except CircularDependencyError as e:
        return {
            "nodes": sorted(nodes),
            "edges": serializable_edges,
            "topological_order": [],
            "errors": errors + [str(e)],
            "sys_nodes": sys_nodes,
        }

    return {
        "nodes": sorted(nodes),
        "edges": serializable_edges,
        "topological_order": order,
        "errors": errors,
        "sys_nodes": sys_nodes,
    }
