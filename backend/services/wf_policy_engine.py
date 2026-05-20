"""
Configurable attendance policy evaluation (v1).

Reads published wf_policy_rules for an organisation and returns day-level outcomes.
Does not modify salary — only status, fractions, and policy_result metadata.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import WfAttendancePolicy, WfPolicyRule
from uuid import UUID


@dataclass
class PolicyDayOutcome:
    status: str = "present"
    payable_fraction: Decimal = Decimal("1")
    late_minutes: int = 0
    early_exit_minutes: int = 0
    overtime_hours: Decimal = Decimal("0")
    flags: list[str] = field(default_factory=list)
    policy_hits: list[dict[str, Any]] = field(default_factory=list)


def _parse_hhmm(value: str | None) -> time | None:
    if not value:
        return None
    try:
        parts = value.strip().split(":")
        return time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return None


def _minutes_after(actual: datetime, expected: time) -> int:
    exp_dt = actual.replace(hour=expected.hour, minute=expected.minute, second=0, microsecond=0)
    delta = (actual - exp_dt).total_seconds() / 60
    return int(max(0, delta))


async def load_published_rules(
    db: AsyncSession,
    organisation_id: UUID,
) -> list[WfPolicyRule]:
    pol_q = await db.execute(
        select(WfAttendancePolicy.policy_id).where(
            WfAttendancePolicy.organisation_id == organisation_id,
            WfAttendancePolicy.status == "published",
        )
    )
    policy_ids = [r[0] for r in pol_q.all()]
    if not policy_ids:
        return []
    rules_q = await db.execute(
        select(WfPolicyRule)
        .where(
            WfPolicyRule.policy_id.in_(policy_ids),
            WfPolicyRule.is_active.is_(True),
        )
        .order_by(WfPolicyRule.priority.asc())
    )
    return list(rules_q.scalars().all())


def apply_policy_rules(
    *,
    rules: list[WfPolicyRule],
    time_in: datetime | None,
    time_out: datetime | None,
    work_hours: float,
    shift_start: str | None = "09:00",
    shift_end: str | None = "18:00",
    missing_punch_out: bool = False,
) -> PolicyDayOutcome:
    outcome = PolicyDayOutcome()
    grace = 15
    ot_after_hours = 8.0

    for rule in rules:
        cond = rule.condition_json or {}
        action = rule.action_json or {}
        rtype = rule.rule_type

        if rtype == "grace_time":
            grace = int(cond.get("grace_minutes", grace))
            outcome.policy_hits.append({"rule_type": rtype, "grace_minutes": grace})
            continue

        if rtype == "late_entry" and time_in and shift_start:
            expected = _parse_hhmm(shift_start)
            if expected:
                late = _minutes_after(time_in, expected) - grace
                if late > 0:
                    outcome.late_minutes = max(outcome.late_minutes, late)
                    outcome.flags.append("late")
                    strikes = int(cond.get("strikes_before_half_day", 0))
                    if strikes and late >= int(cond.get("late_threshold_minutes", 60)):
                        outcome.status = "half_day"
                        outcome.payable_fraction = Decimal("0.5")
                    outcome.policy_hits.append({"rule_type": rtype, "late_minutes": late})

        if rtype == "early_exit" and time_out and shift_end:
            expected = _parse_hhmm(shift_end)
            if expected:
                exp_dt = time_out.replace(hour=expected.hour, minute=expected.minute, second=0, microsecond=0)
                early = int(max(0, (exp_dt - time_out).total_seconds() / 60)) - grace
                if early > 0:
                    outcome.early_exit_minutes = max(outcome.early_exit_minutes, early)
                    outcome.flags.append("early_exit")
                    outcome.policy_hits.append({"rule_type": rtype, "early_exit_minutes": early})

        if rtype == "missing_punch" and missing_punch_out:
            outcome.flags.append("missing_punch")
            if action.get("mark") == "half_day":
                outcome.status = "half_day"
                outcome.payable_fraction = Decimal("0.5")
            outcome.policy_hits.append({"rule_type": rtype})

        if rtype == "overtime" and work_hours > 0:
            threshold = float(cond.get("hours_after", ot_after_hours))
            if work_hours > threshold:
                ot = Decimal(str(round(work_hours - threshold, 2)))
                outcome.overtime_hours = max(outcome.overtime_hours, ot)
                outcome.flags.append("ot_eligible")
                outcome.policy_hits.append({"rule_type": rtype, "overtime_hours": str(ot)})

        if rtype == "absent" and not time_in and not time_out:
            outcome.status = "absent"
            outcome.payable_fraction = Decimal("0")
            outcome.policy_hits.append({"rule_type": rtype})

    if outcome.status == "present" and outcome.payable_fraction == Decimal("0.5"):
        outcome.status = "half_day"
    return outcome


async def evaluate_day_policies(
    db: AsyncSession,
    organisation_id: UUID,
    *,
    time_in: datetime | None,
    time_out: datetime | None,
    work_hours: float,
    missing_punch_out: bool = False,
) -> PolicyDayOutcome:
    rules = await load_published_rules(db, organisation_id)
    if not rules:
        out = PolicyDayOutcome()
        if missing_punch_out:
            out.flags.append("missing_punch")
        return out
    return apply_policy_rules(
        rules=rules,
        time_in=time_in,
        time_out=time_out,
        work_hours=work_hours,
        missing_punch_out=missing_punch_out,
    )
