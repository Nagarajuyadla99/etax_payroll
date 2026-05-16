"""MVP: summary / register / banking net use one categorization contract."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from services.payroll_component_bucket import (
    aggregate_payroll_run_totals,
    apply_category_amount_to_totals,
    net_employee_pay_from_totals,
    new_bucket_totals,
    resolve_payroll_component_category,
)


def test_resolve_prefers_component_category_over_type():
    c = SimpleNamespace(component_category="employer_contribution", component_type="earning")
    assert resolve_payroll_component_category(c) == "employer_contribution"


def test_resolve_mapping_component():
    row = {"component_category": None, "component_type": "Deduction"}
    assert resolve_payroll_component_category(row) == "deduction"


def test_aggregate_run_totals_excludes_employer_from_net():
    e_earn = uuid4()
    e_ded = uuid4()
    e_emp = uuid4()
    entries = [
        SimpleNamespace(component_id=e_earn, amount=Decimal("50000")),
        SimpleNamespace(component_id=e_ded, amount=Decimal("2000")),
        SimpleNamespace(component_id=e_emp, amount=Decimal("6000")),
    ]
    cmap = {
        e_earn: SimpleNamespace(component_category="earning", component_type="earning"),
        e_ded: SimpleNamespace(component_category="deduction", component_type="deduction"),
        e_emp: SimpleNamespace(
            component_category="employer_contribution",
            component_type="employer_contribution",
        ),
    }
    agg = aggregate_payroll_run_totals(entries=entries, component_by_id=cmap)
    assert agg["earnings"] == Decimal("50000")
    assert agg["deductions"] == Decimal("2000")
    assert agg["employer_contributions"] == Decimal("6000")
    assert agg["net"] == Decimal("48000")


def test_register_per_employee_net_matches_component_bucket():
    """Same rules as payslip: net = earnings − employee deductions (not employer)."""
    eid = uuid4()
    c_basic = uuid4()
    c_pf_emp = uuid4()
    c_pf_er = uuid4()

    entries = [
        SimpleNamespace(employee_id=eid, component_id=c_basic, amount=Decimal("40000")),
        SimpleNamespace(employee_id=eid, component_id=c_pf_emp, amount=Decimal("1800")),
        SimpleNamespace(employee_id=eid, component_id=c_pf_er, amount=Decimal("1800")),
    ]
    cmap = {
        c_basic: SimpleNamespace(component_category="earning", component_type="earning"),
        c_pf_emp: SimpleNamespace(component_category="deduction", component_type="deduction"),
        c_pf_er: SimpleNamespace(
            component_category="employer_contribution",
            component_type="employer_contribution",
        ),
    }

    register = {}
    for entry in entries:
        comp = cmap[entry.component_id]
        if entry.employee_id not in register:
            register[entry.employee_id] = new_bucket_totals()
        apply_category_amount_to_totals(
            register[entry.employee_id],
            resolve_payroll_component_category(comp),
            Decimal(str(entry.amount)),
        )
    net = net_employee_pay_from_totals(register[eid])

    # Payslip-style net for this single employee
    rolled = aggregate_payroll_run_totals(entries=entries, component_by_id=cmap)
    assert net == rolled["net"] == Decimal("38200")


def test_register_sum_net_matches_run_aggregate():
    """Sum of per-employee register nets == run-level net from same entries."""
    eid_a, eid_b = uuid4(), uuid4()
    c_earn, c_ded = uuid4(), uuid4()
    entries = [
        SimpleNamespace(employee_id=eid_a, component_id=c_earn, amount=Decimal("100")),
        SimpleNamespace(employee_id=eid_a, component_id=c_ded, amount=Decimal("10")),
        SimpleNamespace(employee_id=eid_b, component_id=c_earn, amount=Decimal("50")),
        SimpleNamespace(employee_id=eid_b, component_id=c_ded, amount=Decimal("5")),
    ]
    cmap = {
        c_earn: SimpleNamespace(component_category="earning", component_type="earning"),
        c_ded: SimpleNamespace(component_category="deduction", component_type="deduction"),
    }
    rolled = aggregate_payroll_run_totals(entries=entries, component_by_id=cmap)

    register: dict = {}
    for entry in entries:
        comp = cmap[entry.component_id]
        if entry.employee_id not in register:
            register[entry.employee_id] = new_bucket_totals()
        apply_category_amount_to_totals(
            register[entry.employee_id],
            resolve_payroll_component_category(comp),
            Decimal(str(entry.amount)),
        )
    sum_net = sum(net_employee_pay_from_totals(v) for v in register.values())
    assert sum_net == rolled["net"]
