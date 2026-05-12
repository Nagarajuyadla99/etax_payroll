"""Pure helpers for effective-dated version selection (testable)."""

from __future__ import annotations

from datetime import date
from typing import Any, Callable, Optional, TypeVar

T = TypeVar("T")


def pick_effective_row(
    rows: list[T],
    as_of: date,
    *,
    effective_from_key: Callable[[T], date],
    effective_to_key: Callable[[T], Optional[date]],
) -> Optional[T]:
    """Pick the row active on as_of: effective_from <= as_of <= effective_to (or open-ended)."""
    candidates: list[T] = []
    for r in rows:
        ef = effective_from_key(r)
        et = effective_to_key(r)
        if ef <= as_of and (et is None or et >= as_of):
            candidates.append(r)
    if not candidates:
        return None
    if len(candidates) > 1:
        raise ValueError(
            "Overlapping salary configuration versions detected for the same logical entity; "
            "fix effective_from / effective_to ranges before preview."
        )
    return max(candidates, key=lambda x: effective_from_key(x))


def assert_publish_start_not_inside_closed_history(
    rows: list[T],
    effective_from_new: date,
    *,
    effective_from_key: Callable[[T], date],
    effective_to_key: Callable[[T], Optional[date]],
) -> None:
    """
    Reject publishing a new version starting on effective_from_new if that date still falls
    inside a *closed* historical range. Open-ended rows are ignored here (they are closed by publish).
    """
    for r in rows:
        et = effective_to_key(r)
        if et is None:
            continue
        ef = effective_from_key(r)
        if ef <= effective_from_new <= et:
            raise ValueError(
                "effective_from falls inside an existing version date range; "
                "choose a date after the latest closed version end, or after any open-ended version start."
            )


def previous_day(d: date) -> date:
    from datetime import timedelta

    return d - timedelta(days=1)
