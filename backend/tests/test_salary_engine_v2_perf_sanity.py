from datetime import date
from decimal import Decimal
from time import perf_counter
from uuid import uuid4

from services.salary_engine_v2 import preview_salary_v2


def test_preview_perf_sanity_large_template():
    """
    Not a strict benchmark, but a guardrail: ensure we don't accidentally introduce
    pathological behavior (e.g. super-linear recalculation) for a moderate bundle.
    """
    n_components = 200

    template_id = uuid4()
    ids = [uuid4() for _ in range(n_components)]
    template_components = []
    component_map = {}
    for i, cid in enumerate(ids, start=1):
        code = f"C{i}"
        template_components.append(
            {
                "stc_id": uuid4(),
                "template_id": template_id,
                "component_id": cid,
                "sequence": i,
                "amount": Decimal("1"),
                "percentage": None,
                "percentage_of": None,
                "formula": None,
            }
        )
        component_map[cid] = {
            "component_id": cid,
            "code": code,
            "name": code,
            "component_category": "earning",
            "calculation_type": "fixed",
            "rounding_rule": {"scale": 2},
        }

    # Create a chain of derived vars so we exercise DAG ordering.
    derived = [{"code": "DV1", "name": "DV1", "expression": "C1", "data_type": "number"}]
    for i in range(2, 60):
        derived.append(
            {"code": f"DV{i}", "name": f"DV{i}", "expression": f"DV{i-1} + 1", "data_type": "number"}
        )

    t0 = perf_counter()
    res = preview_salary_v2(
        as_of=date(2026, 1, 31),
        ctc=Decimal("120000"),
        template_components=template_components,
        component_map_by_id=component_map,
        derived_variables=derived,
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={},
    )
    elapsed_ms = (perf_counter() - t0) * 1000

    assert res.errors == []
    # 200 fixed lines should be emitted
    assert len(res.lines) == n_components
    # Guardrail threshold: should easily run under 500ms on typical dev machine
    assert elapsed_ms < 500

