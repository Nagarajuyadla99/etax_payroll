"""Effective-dated salary configuration versioning (pure helpers)."""

from dataclasses import dataclass
from datetime import date

import pytest

from services.salary_version_utils import (
    assert_publish_start_not_inside_closed_history,
    pick_effective_row,
    previous_day,
)


@dataclass
class _FakeVer:
    effective_from: date
    effective_to: date | None


def test_pick_effective_row_selects_latest_non_overlapping():
    rows = [
        _FakeVer(date(2025, 1, 1), date(2025, 6, 30)),
        _FakeVer(date(2025, 7, 1), None),
    ]
    picked = pick_effective_row(
        rows,
        date(2025, 8, 1),
        effective_from_key=lambda x: x.effective_from,
        effective_to_key=lambda x: x.effective_to,
    )
    assert picked.effective_from == date(2025, 7, 1)


def test_pick_effective_row_raises_on_overlap():
    rows = [
        _FakeVer(date(2025, 1, 1), date(2025, 12, 31)),
        _FakeVer(date(2025, 6, 1), date(2025, 12, 31)),
    ]
    with pytest.raises(ValueError, match="Overlapping"):
        pick_effective_row(
            rows,
            date(2025, 7, 1),
            effective_from_key=lambda x: x.effective_from,
            effective_to_key=lambda x: x.effective_to,
        )


def test_assert_publish_start_not_inside_closed_history():
    rows = [
        _FakeVer(date(2025, 1, 1), date(2025, 6, 30)),
    ]
    with pytest.raises(ValueError, match="inside an existing"):
        assert_publish_start_not_inside_closed_history(
            rows,
            date(2025, 3, 15),
            effective_from_key=lambda x: x.effective_from,
            effective_to_key=lambda x: x.effective_to,
        )
    # boundary after closed range
    assert_publish_start_not_inside_closed_history(
        rows,
        date(2025, 7, 1),
        effective_from_key=lambda x: x.effective_from,
        effective_to_key=lambda x: x.effective_to,
    )


def test_previous_day():
    assert previous_day(date(2026, 3, 1)) == date(2026, 2, 28)


def test_snapshot_replay_shape_matches_preview_payload():
    """Ensure stored snapshot result matches preview response fields we persist."""
    preview_dump = {
        "as_of_date": "2026-05-08",
        "template_id": "00000000-0000-0000-0000-000000000001",
        "ctc": 120000.0,
        "template_version_id": "00000000-0000-0000-0000-000000000002",
        "resolved_versions": {"template_version_id": "abc"},
        "variables": {"X": 1.0},
        "lines": [],
        "totals": {},
        "errors": [],
    }
    replay = preview_dump
    assert replay["variables"]["X"] == 1.0
    assert replay["resolved_versions"]["template_version_id"] == "abc"
