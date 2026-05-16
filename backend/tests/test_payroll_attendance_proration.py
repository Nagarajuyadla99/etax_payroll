"""Attendance auto-proration and formula detection (salary engine v2)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from services.payroll_attendance_proration import (
    effective_template_proration_enabled,
    expression_signals_attendance_proration,
    template_proration_enabled,
)
from services.salary_engine_v2 import preview_salary_v2


def _earning_fixed_component(
    cid,
    *,
    amount=Decimal("10000"),
    category="earning",
    comp_type="earning",
    code="TEST_EARN",
    meta=None,
):
    return {
        "component_id": cid,
        "code": code,
        "name": code.replace("_", " ").title(),
        "component_category": category,
        "component_type": comp_type,
        "calculation_type": "fixed",
        "rounding_rule": {"scale": 2},
        "meta": meta or {},
    }


def _deduction_fixed_component(cid, *, amount=Decimal("2300")):
    return {
        "component_id": cid,
        "code": "TEST_DED",
        "name": "Test deduction",
        "component_category": "deduction",
        "component_type": "deduction",
        "calculation_type": "fixed",
        "rounding_rule": {"scale": 2},
        "meta": {},
    }


def _template_link(cid, *, amount=Decimal("10000")):
    return {
        "component_id": cid,
        "sequence": 1,
        "amount": amount,
        "percentage": None,
        "percentage_of": None,
        "formula": None,
        "meta": {},
    }


def test_expression_signals_detects_attendance_names():
    assert expression_signals_attendance_proration(
        formula_fragments=["BASIC * WAGE_PRORATION_FACTOR"],
        percentage_of=None,
    )
    assert expression_signals_attendance_proration(
        formula_fragments=["worked_days / payable_days"],
        percentage_of=None,
    )
    assert not expression_signals_attendance_proration(
        formula_fragments=["CTC * 0.4"],
        percentage_of="CTC",
    )


def test_auto_proration_applies_to_fixed_earning_when_template_flag_on():
    cid = uuid4()
    comp = _earning_fixed_component(cid)
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("120000"),
        template_components=[_template_link(cid)],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=None,
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert not res.errors
    assert len(res.lines) == 1
    assert res.lines[0].amount == Decimal("8000.00")
    assert res.lines[0].breakdown and res.lines[0].breakdown.get("attendance_auto_proration") is True
    assert res.proration_audit and res.proration_audit.get("attendance_proration_applied") is True


def test_auto_proration_applies_when_factor_in_overrides_without_template_meta():
    """Payroll path: attendance merged with factor < 1 enables proration without template meta."""
    cid = uuid4()
    comp = _earning_fixed_component(cid, amount=Decimal("55000"))
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("55000"))],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={},
    )
    assert res.lines[0].amount == Decimal("44000.00")
    assert res.totals["earnings"] == Decimal("44000.00")


def test_auto_proration_skipped_when_template_meta_disabled_and_factor_one():
    cid = uuid4()
    comp = _earning_fixed_component(cid)
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("120000"),
        template_components=[_template_link(cid)],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("1")},
        wage_proration_factor=Decimal("1"),
        template_engine_meta={"prorate_with_attendance": False},
    )
    assert res.lines[0].amount == Decimal("10000.00")


def test_deductions_unchanged_under_proration():
    earn_id = uuid4()
    ded_id = uuid4()
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[
            _template_link(earn_id, amount=Decimal("55000")),
            {**_template_link(ded_id, amount=Decimal("2300")), "sequence": 2},
        ],
        component_map_by_id={
            earn_id: _earning_fixed_component(earn_id, amount=Decimal("55000")),
            ded_id: _deduction_fixed_component(ded_id, amount=Decimal("2300")),
        },
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    earn = next(ln for ln in res.lines if ln.component_code == "TEST_EARN")
    ded = next(ln for ln in res.lines if ln.component_code == "TEST_DED")
    assert earn.amount == Decimal("44000.00")
    assert ded.amount == Decimal("2300.00")
    assert res.totals["net_pay"] == Decimal("41700.00")


def test_factor_one_preserves_original_salary():
    cid = uuid4()
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("55000"))],
        component_map_by_id={cid: _earning_fixed_component(cid, amount=Decimal("55000"))},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("1")},
        wage_proration_factor=Decimal("1"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("55000.00")


def test_factor_zero_zeroes_prorated_earnings():
    cid = uuid4()
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("55000"))],
        component_map_by_id={cid: _earning_fixed_component(cid, amount=Decimal("55000"))},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0")},
        wage_proration_factor=Decimal("0"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("0.00")


def test_bonus_component_type_not_prorated():
    cid = uuid4()
    comp = _earning_fixed_component(cid, comp_type="bonus")
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("5000"))],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("5000.00")


def test_attendance_proratable_false_skips_line():
    cid = uuid4()
    comp = _earning_fixed_component(cid, meta={"attendance_proratable": False})
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("10000"))],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("10000.00")


def test_auto_proration_skipped_when_formula_has_wage_factor():
    cid = uuid4()
    comp = {
        **_earning_fixed_component(cid),
        "calculation_type": "formula",
        "formula_expression": "10000 * WAGE_PRORATION_FACTOR",
    }
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("120000"),
        template_components=[
            {
                **_template_link(cid, amount=None),
                "amount": None,
                "formula": "10000 * WAGE_PRORATION_FACTOR",
            }
        ],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=None,
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert not res.errors
    assert res.lines[0].amount == Decimal("8000.00")
    bd = res.lines[0].breakdown or {}
    assert not bd.get("attendance_auto_proration")


def test_manual_mode_skips_auto_proration():
    cid = uuid4()
    comp = {**_earning_fixed_component(cid), "meta": {"attendance_proration_mode": "manual"}}
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("120000"),
        template_components=[_template_link(cid)],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=None,
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("10000.00")


def test_template_proration_enabled_parsing():
    assert not template_proration_enabled({})
    assert not template_proration_enabled({"prorate_with_attendance": False})
    assert template_proration_enabled({"prorate_with_attendance": True})
    assert template_proration_enabled({"prorate_with_attendance": "yes"})


def test_effective_proration_from_org_payroll_cfg():
    assert effective_template_proration_enabled(
        {},
        payroll_cfg={"prorate_with_attendance": True},
        wage_proration_factor=None,
        employee_overrides={},
    )


def test_proration_audit_lists_components():
    cid = uuid4()
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("30000"))],
        component_map_by_id={cid: _earning_fixed_component(cid, amount=Decimal("30000"))},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    audit = res.proration_audit or {}
    assert audit.get("attendance_proration_applied") is True
    pcs = audit.get("prorated_components") or []
    assert len(pcs) == 1
    assert pcs[0]["original"] == pytest.approx(30000.0)
    assert pcs[0]["final"] == pytest.approx(24000.0)
    assert pcs[0]["factor"] == pytest.approx(0.8)


def test_formula_policy_unknown_warning_not_strict():
    from services.salary_formula_policy import audit_formula_policy

    r = audit_formula_policy("UNKNOWN * 2", known_identifiers={"CTC"}, strict_unknown=False)
    assert r.is_valid
    assert r.unknown_dependencies


def test_formula_policy_strict_unknown():
    from services.salary_formula_policy import audit_formula_policy

    r = audit_formula_policy("UNKNOWN * 2", known_identifiers={"CTC"}, strict_unknown=True)
    assert not r.is_valid
    assert r.unknown_dependencies


def test_basic_salary_prorates():
    cid = uuid4()
    comp = _earning_fixed_component(cid, comp_type="basic", code="BASIC", amount=Decimal("30000"))
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("30000"))],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("24000.00")
    assert res.lines[0].breakdown.get("proration_applied") is True


def test_mixed_basic_and_bonus_net_recalculation():
    basic_id = uuid4()
    bonus_id = uuid4()
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[
            {**_template_link(basic_id, amount=Decimal("30000")), "sequence": 1},
            {**_template_link(bonus_id, amount=Decimal("10000")), "sequence": 2},
        ],
        component_map_by_id={
            basic_id: _earning_fixed_component(
                basic_id, comp_type="basic", code="BASIC", amount=Decimal("30000")
            ),
            bonus_id: _earning_fixed_component(
                bonus_id, comp_type="bonus", code="BONUS", amount=Decimal("10000")
            ),
        },
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    basic_ln = next(ln for ln in res.lines if ln.component_code == "BASIC")
    bonus_ln = next(ln for ln in res.lines if ln.component_code == "BONUS")
    assert basic_ln.amount == Decimal("24000.00")
    assert bonus_ln.amount == Decimal("10000.00")
    assert res.totals["earnings"] == Decimal("34000.00")
    assert res.totals["net_pay"] == Decimal("34000.00")
    assert bonus_ln.breakdown.get("attendance_proratable") is False
    assert bonus_ln.breakdown.get("proration_applied") is False


def test_incentive_component_type_not_prorated():
    cid = uuid4()
    comp = _earning_fixed_component(cid, comp_type="incentive", code="INCENTIVE", amount=Decimal("5000"))
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("5000"))],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("5000.00")


def test_reimbursement_component_type_not_prorated():
    cid = uuid4()
    comp = _earning_fixed_component(cid, comp_type="reimbursement", code="REIMB_TRAVEL", amount=Decimal("2000"))
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("2000"))],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("2000.00")


def test_bonus_code_with_generic_earning_type_not_prorated():
    cid = uuid4()
    comp = _earning_fixed_component(cid, comp_type="earning", code="ANNUAL_BONUS", amount=Decimal("10000"))
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("10000"))],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("10000.00")


def test_attendance_proratable_true_override_on_bonus():
    cid = uuid4()
    comp = _earning_fixed_component(
        cid,
        comp_type="bonus",
        code="BONUS",
        amount=Decimal("10000"),
        meta={"attendance_proratable": True},
    )
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("10000"))],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("8000.00")


def test_fixed_earning_prorates_when_link_has_unused_percentage_of_attendance_field():
    """Fixed lines must not skip proration because link.percentage_of names an attendance scalar."""
    cid = uuid4()
    comp = _earning_fixed_component(cid, comp_type="basic", code="BASIC", amount=Decimal("55000"))
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[
            {
                **_template_link(cid, amount=Decimal("55000")),
                "percentage_of": "PAYABLE_DAYS",
            }
        ],
        component_map_by_id={cid: comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("44000.00")
    assert res.totals["earnings"] == Decimal("44000.00")
    assert res.totals["net_pay"] == Decimal("44000.00")


def test_factor_below_one_enables_proration_when_template_meta_false():
    cid = uuid4()
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[_template_link(cid, amount=Decimal("55000"))],
        component_map_by_id={cid: _earning_fixed_component(cid, amount=Decimal("55000"))},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": False},
    )
    assert res.lines[0].amount == Decimal("44000.00")
    assert res.proration_audit and res.proration_audit.get("effective_prorate_with_attendance") is True


def test_component_map_lookup_with_string_keys():
    cid = uuid4()
    comp = _earning_fixed_component(cid, amount=Decimal("10000"))
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("120000"),
        template_components=[_template_link(cid)],
        component_map_by_id={str(cid): comp},
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    assert res.lines[0].amount == Decimal("8000.00")


def test_proration_audit_includes_skipped_components():
    basic_id = uuid4()
    bonus_id = uuid4()
    res = preview_salary_v2(
        as_of=date(2026, 5, 1),
        ctc=Decimal("600000"),
        template_components=[
            {**_template_link(basic_id, amount=Decimal("30000")), "sequence": 1},
            {**_template_link(bonus_id, amount=Decimal("10000")), "sequence": 2},
        ],
        component_map_by_id={
            basic_id: _earning_fixed_component(basic_id, comp_type="basic", code="BASIC"),
            bonus_id: _earning_fixed_component(bonus_id, comp_type="bonus", code="BONUS"),
        },
        derived_variables=[],
        template_groups=[],
        group_items_by_group_id={},
        statutory_cfg_by_code={},
        employee_overrides={"WAGE_PRORATION_FACTOR": Decimal("0.8")},
        wage_proration_factor=Decimal("0.8"),
        template_engine_meta={"prorate_with_attendance": True},
    )
    audit = res.proration_audit or {}
    rows = {r["component"]: r for r in (audit.get("component_proration") or [])}
    assert rows["BASIC"]["proration_applied"] is True
    assert rows["BONUS"]["proration_applied"] is False
    assert rows["BONUS"]["attendance_proratable"] is False
