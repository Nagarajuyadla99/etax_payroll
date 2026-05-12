from datetime import date
from decimal import Decimal
from uuid import uuid4

from services.salary_engine_v2 import preview_salary_v2


def test_cycle_detection_returns_error_and_no_lines():
    # A depends on B and B depends on A
    basic_id = uuid4()

    res = preview_salary_v2(
        as_of=date(2026, 1, 31),
        ctc=Decimal("100000"),
        template_components=[
            {
                "stc_id": uuid4(),
                "template_id": uuid4(),
                "component_id": basic_id,
                "sequence": 1,
                "amount": Decimal("10000"),
                "percentage": None,
                "percentage_of": None,
                "formula": None,
            }
        ],
        component_map_by_id={
            basic_id: {
                "component_id": basic_id,
                "code": "BASIC",
                "name": "Basic",
                "component_category": "earning",
                "calculation_type": "fixed",
                "rounding_rule": {},
            }
        },
        derived_variables=[
            {"code": "A", "name": "A", "expression": "B", "data_type": "number"},
            {"code": "B", "name": "B", "expression": "A", "data_type": "number"},
        ],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={},
    )

    assert res.lines == []
    assert res.totals == {}
    assert any("circular dependency" in e.lower() for e in (res.errors or []))


def test_preview_totals_net_pay():
    basic_id = uuid4()
    tax_id = uuid4()

    res = preview_salary_v2(
        as_of=date(2026, 1, 31),
        ctc=Decimal("100000"),
        template_components=[
            {
                "stc_id": uuid4(),
                "template_id": uuid4(),
                "component_id": basic_id,
                "sequence": 1,
                "amount": Decimal("30000"),
                "percentage": None,
                "percentage_of": None,
                "formula": None,
            },
            {
                "stc_id": uuid4(),
                "template_id": uuid4(),
                "component_id": tax_id,
                "sequence": 2,
                "amount": Decimal("2000"),
                "percentage": None,
                "percentage_of": None,
                "formula": None,
            },
        ],
        component_map_by_id={
            basic_id: {
                "component_id": basic_id,
                "code": "BASIC",
                "name": "Basic",
                "component_category": "earning",
                "calculation_type": "fixed",
                "rounding_rule": {},
            },
            tax_id: {
                "component_id": tax_id,
                "code": "TAX",
                "name": "Tax",
                "component_category": "deduction",
                "calculation_type": "fixed",
                "rounding_rule": {},
            },
        },
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={},
    )

    assert res.errors == []
    assert res.totals["earnings"] == Decimal("30000")
    assert res.totals["deductions"] == Decimal("2000")
    assert res.totals["net_pay"] == Decimal("28000")

