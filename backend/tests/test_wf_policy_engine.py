from datetime import datetime, timezone
from decimal import Decimal

from services.wf_policy_engine import apply_policy_rules, PolicyDayOutcome
from models.wf_models import WfPolicyRule
from uuid import uuid4


def _rule(rule_type: str, priority: int, cond: dict, action: dict) -> WfPolicyRule:
    return WfPolicyRule(
        rule_id=uuid4(),
        policy_id=uuid4(),
        rule_type=rule_type,
        priority=priority,
        condition_json=cond,
        action_json=action,
        is_active=True,
    )


def test_missing_punch_half_day():
    rules = [_rule("missing_punch", 30, {}, {"mark": "half_day"})]
    out = apply_policy_rules(
        rules=rules,
        time_in=datetime(2026, 5, 1, 9, 0, tzinfo=timezone.utc),
        time_out=None,
        work_hours=0,
        missing_punch_out=True,
    )
    assert out.status == "half_day"
    assert out.payable_fraction == Decimal("0.5")


def test_overtime_after_eight_hours():
    rules = [_rule("overtime", 40, {"hours_after": 8}, {})]
    out = apply_policy_rules(
        rules=rules,
        time_in=datetime(2026, 5, 1, 9, 0, tzinfo=timezone.utc),
        time_out=datetime(2026, 5, 1, 18, 0, tzinfo=timezone.utc),
        work_hours=9.5,
    )
    assert "ot_eligible" in out.flags
    assert out.overtime_hours > 0
