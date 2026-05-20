"""Smoke tests for WF engine modules (no DB required for imports)."""

from models.wf_models import ATTENDANCE_SOURCE_MODES, RawAttendanceEvent
from services.wf_seed_service import DEFAULT_LABELS, FEATURE_FLAGS
from schemas.wf_schemas import AttendanceProfileActivateIn, RawEventIngestIn


def test_source_modes_count():
    assert len(ATTENDANCE_SOURCE_MODES) >= 10


def test_default_labels():
    assert "attendance.entity" in DEFAULT_LABELS


def test_feature_flags_defined():
    codes = {f[0] for f in FEATURE_FLAGS}
    assert "wf_labels" in codes


def test_schemas():
    p = AttendanceProfileActivateIn(enabled_modes=["manual_hr"])
    assert p.engine_version == "v2"
