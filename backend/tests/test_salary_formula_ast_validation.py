from decimal import Decimal

import pytest

from services.salary_formula_ast import FormulaError, evaluate_formula, validate_formula


def test_validate_formula_rejects_empty():
    res = validate_formula("")
    assert res.is_valid is False
    assert res.error


def test_validate_formula_rejects_too_long():
    res = validate_formula("1" * 501)
    assert res.is_valid is False
    assert "too long" in (res.error or "").lower()


def test_validate_formula_allows_mod_operator():
    res = validate_formula("10 % 3")
    assert res.is_valid is True
    assert res.dependencies == []


def test_validate_formula_rejects_keyword_args():
    res = validate_formula("round(10, ndigits=2)")
    assert res.is_valid is False
    assert "keyword" in (res.error or "").lower()


def test_validate_formula_rejects_unknown_function():
    res = validate_formula("sqrt(4)")
    assert res.is_valid is False
    assert "unsupported function" in (res.error or "").lower()


def test_validate_formula_dependencies_excludes_ctc_and_allowed_funcs():
    res = validate_formula("round(CTC) + BASIC + max(A, B)")
    assert res.is_valid is True
    assert set(res.dependencies) == {"BASIC", "A", "B"}


def test_evaluate_formula_case_insensitive_lookup():
    assert evaluate_formula("basic + 1", {"BASIC": 10}) == Decimal("11")


def test_evaluate_formula_divide_by_zero_is_zero():
    assert evaluate_formula("10 / 0", {}) == Decimal("0")


def test_evaluate_formula_mod_by_zero_is_zero():
    assert evaluate_formula("10 % 0", {}) == Decimal("0")


def test_evaluate_formula_round_ndigits_requires_int():
    with pytest.raises(FormulaError):
        evaluate_formula("round(10.123, 1.5)", {})


def test_evaluate_formula_sum_and_avg():
    assert evaluate_formula("sum(1,2,3)", {}) == Decimal("6")
    assert evaluate_formula("avg(2,4)", {}) == Decimal("3")

