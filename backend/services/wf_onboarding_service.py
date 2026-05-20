"""Post-activation onboarding: default policy + feature flags."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import WfAttendancePolicy, WfPolicyRule
from services.wf_feature_flag_service import set_org_flag


DEFAULT_RULES = [
    ("grace_time", 10, {"grace_minutes": 15}, {}),
    ("late_entry", 20, {"late_threshold_minutes": 30}, {}),
    ("missing_punch", 30, {}, {"mark": "half_day"}),
    ("overtime", 40, {"hours_after": 8}, {}),
]


async def bootstrap_org_wf_defaults(db: AsyncSession, organisation_id: UUID) -> dict:
    """Enable core flags and create a published default policy if none exists."""
    for flag, enabled in (
        ("wf_labels", True),
        ("wf_engine_v2", True),
        ("wf_dual_write", True),
    ):
        await set_org_flag(db, organisation_id, flag, enabled)

    from sqlalchemy import select

    existing = await db.execute(
        select(WfAttendancePolicy.policy_id).where(
            WfAttendancePolicy.organisation_id == organisation_id,
            WfAttendancePolicy.status == "published",
        ).limit(1)
    )
    if existing.scalar_one_or_none():
        return {"policy_created": False}

    pol = WfAttendancePolicy(
        organisation_id=organisation_id,
        name="System default attendance policy",
        status="published",
        version=1,
    )
    db.add(pol)
    await db.flush()
    for rule_type, priority, cond, action in DEFAULT_RULES:
        db.add(
            WfPolicyRule(
                policy_id=pol.policy_id,
                rule_type=rule_type,
                priority=priority,
                condition_json=cond,
                action_json=action,
            )
        )
    await db.commit()
    return {"policy_created": True, "policy_id": str(pol.policy_id)}
