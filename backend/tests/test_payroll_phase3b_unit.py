"""Phase 3b orchestration helpers (no DB)."""

from decimal import Decimal

from services.payroll_stable_json import stable_json_hash
from services.payroll_dag_introspection import build_phase2_dag_plan_from_bundle
from tests.test_salary_engine_v2_phase3 import _basic_pf_template_bundle


def test_stable_json_hash_deterministic():
    d = Decimal("1.5")
    a = {"x": d, "y": ["z"]}
    b = {"y": ["z"], "x": d}
    assert stable_json_hash(a) == stable_json_hash(b)


def test_dag_plan_basic_pf_bundle():
    tc, cm, dv, tg, gi, st = _basic_pf_template_bundle()
    bundle = {
        "template_components": tc,
        "component_map_by_id": cm,
        "derived_variables": dv,
        "template_groups": tg,
        "group_items_by_group_id": gi,
        "statutory_cfg_by_code": st,
    }
    plan = build_phase2_dag_plan_from_bundle(bundle)
    assert "topological_order" in plan
    assert any(x.startswith("comp:BASIC") for x in plan["topological_order"])
