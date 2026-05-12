"""Pure helpers from payroll_crud (no DB)."""

from datetime import date
from types import SimpleNamespace
from uuid import uuid4

from crud.payroll_crud import _employee_age_years, _statutory_effective_map


def test_employee_age_years_none_dob():
    assert _employee_age_years(None, date(2026, 6, 1)) is None


def test_employee_age_years_before_birthday():
    assert _employee_age_years(date(2000, 8, 15), date(2026, 6, 1)) == 25


def test_employee_age_years_after_birthday():
    assert _employee_age_years(date(2000, 6, 1), date(2026, 6, 15)) == 26


def test_statutory_effective_map_picks_latest_effective_row():
    org = uuid4()
    rows = [
        SimpleNamespace(
            statutory_code="PF",
            effective_from=date(2025, 1, 1),
            effective_to=date(2025, 12, 31),
            settings={"employee_rate": 10},
            is_enabled=True,
            organisation_id=org,
        ),
        SimpleNamespace(
            statutory_code="PF",
            effective_from=date(2026, 1, 1),
            effective_to=None,
            settings={"employee_rate": 12},
            is_enabled=True,
            organisation_id=org,
        ),
    ]
    m = _statutory_effective_map(rows, date(2026, 3, 1))
    assert m["PF"]["settings"]["employee_rate"] == 12


def test_statutory_effective_map_ignores_future_and_expired():
    rows = [
        SimpleNamespace(
            statutory_code="PF",
            effective_from=date(2027, 1, 1),
            effective_to=None,
            settings={"employee_rate": 99},
            is_enabled=True,
        ),
        SimpleNamespace(
            statutory_code="PF",
            effective_from=date(2025, 1, 1),
            effective_to=date(2025, 6, 30),
            settings={"employee_rate": 5},
            is_enabled=True,
        ),
    ]
    m = _statutory_effective_map(rows, date(2026, 3, 1))
    assert "PF" not in m
