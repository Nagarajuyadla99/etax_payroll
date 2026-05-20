from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

from models.wf_models import RawAttendanceEvent
from services.wf_policy_engine import PolicyDayOutcome
from services.wf_rule_orchestrator import OrchestratorContext, run_attendance_pipeline

pytestmark = pytest.mark.asyncio


class _FakeDB:
    async def flush(self):
        pass

    def add(self, _):
        pass


async def test_orchestrator_empty_policy_path(monkeypatch):
    org = uuid4()
    emp = uuid4()
    wd = date(2026, 5, 1)
    ev = RawAttendanceEvent(
        event_id=uuid4(),
        organisation_id=org,
        employee_id=emp,
        source="manual",
        punch_time=datetime(2026, 5, 1, 9, 0, tzinfo=timezone.utc),
        event_type="IN",
        duplicate_flag=False,
        anomaly_flag=False,
    )
    ctx = OrchestratorContext(
        organisation_id=org,
        employee_id=emp,
        work_date=wd,
        events=[ev],
        time_in=ev.punch_time,
        time_out=None,
        work_hours=0,
    )

    async def _no_shift(*_args, **_kwargs):
        return None

    async def _eval(*_args, **_kwargs):
        return PolicyDayOutcome(
            status="half_day",
            payable_fraction=Decimal("0.5"),
            late_minutes=0,
            early_exit_minutes=0,
            overtime_hours=Decimal("0"),
            flags=[],
            policy_hits=[],
        )

    monkeypatch.setattr("services.wf_rule_orchestrator.match_shift_for_day", _no_shift)
    monkeypatch.setattr("services.wf_rule_orchestrator.evaluate_day_policies", _eval)

    result = await run_attendance_pipeline(_FakeDB(), ctx)
    assert result.status == "HD"
    assert "execution_graph" in result.policy_result
