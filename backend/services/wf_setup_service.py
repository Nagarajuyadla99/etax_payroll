"""Enterprise attendance setup wizard — mandatory first-time org configuration."""

from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.org_models import Organisation
from models.wf_models import (
    OrganisationAttendanceProfile,
    WfAttendanceCycle,
    WfRosterAssignment,
    WfWeeklyOffRule,
)
from services.wf_feature_flag_service import set_org_flag
from services.wf_onboarding_service import bootstrap_org_wf_defaults
from services.wf_profile_service import activate_attendance_ecosystem, ensure_attendance_profile
from services.wf_setup_catalog import (
    CYCLE_OPTIONS,
    CYCLE_PRESETS,
    INDUSTRY_OPTIONS,
    INDUSTRY_TEMPLATES,
    PAYROLL_BEHAVIOR_OPTIONS,
    SOURCE_FLAG_MAP,
    SOURCE_OPTIONS,
)


def setup_required(profile: OrganisationAttendanceProfile | None) -> bool:
    if not profile:
        return True
    return profile.setup_completed_at is None


def get_setup_status(profile: OrganisationAttendanceProfile) -> dict[str, Any]:
    return {
        "setup_required": setup_required(profile),
        "setup_completed_at": profile.setup_completed_at.isoformat() if profile.setup_completed_at else None,
        "current_step": (profile.setup_progress_json or {}).get("current_step", 1),
        "engine_version": profile.engine_version,
        "industry_template": profile.industry_template,
        "attendance_cycle_type": profile.attendance_cycle_type,
    }


def get_setup_options() -> dict[str, Any]:
    return {
        "sources": SOURCE_OPTIONS,
        "industries": INDUSTRY_OPTIONS,
        "cycles": CYCLE_OPTIONS,
        "payroll_behaviors": PAYROLL_BEHAVIOR_OPTIONS,
    }


async def save_setup_progress(
    db: AsyncSession,
    organisation_id: UUID,
    *,
    step: int,
    payload: dict[str, Any],
) -> OrganisationAttendanceProfile:
    profile = await ensure_attendance_profile(db, organisation_id)
    progress = dict(profile.setup_progress_json or {})
    progress["current_step"] = step
    progress[f"step_{step}"] = payload
    profile.setup_progress_json = progress
    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)
    return profile


def _merge_template_into_progress(
    industry: str,
    progress: dict[str, Any],
) -> dict[str, Any]:
    tmpl = INDUSTRY_TEMPLATES.get(industry) or INDUSTRY_TEMPLATES["custom"]
    out = copy.deepcopy(progress)
    if "step_1" not in out or not out["step_1"].get("sources"):
        out["step_1"] = {"sources": tmpl.get("enabled_modes", ["manual_hr"])}
    if "step_2" not in out or not out["step_2"].get("industry"):
        out["step_2"] = {"industry": industry}
    if "step_3" not in out or not out["step_3"].get("cycle"):
        out["step_3"] = {
            "cycle": tmpl.get("attendance_cycle_type", "five_day"),
            "config": tmpl.get("attendance_cycle_config", {}),
        }
    if "step_4" not in out or not out["step_4"].get("behaviors"):
        out["step_4"] = {"behaviors": tmpl.get("payroll_behaviors", [])}
    return out


def _flags_for_setup(sources: list[str], industry: str, extra_flags: dict[str, bool]) -> dict[str, bool]:
    flags: dict[str, bool] = {
        "wf_engine_v2": True,
        "wf_labels": True,
        "wf_policy_engine": True,
        "wf_dual_write": True,
    }
    for src in sources:
        for code in SOURCE_FLAG_MAP.get(src, []):
            flags[code] = True
    flags.update({k: v for k, v in extra_flags.items() if v})
    return flags


def _hr_settings_patch(
    cycle_type: str,
    cycle_config: dict[str, Any],
    behaviors: list[str],
) -> dict[str, Any]:
    cycle_preset = CYCLE_PRESETS.get(cycle_type, CYCLE_PRESETS["five_day"])
    week_offs = cycle_config.get("week_off_weekdays") or cycle_preset.get("week_off_weekdays", [5, 6])
    total_mode = cycle_preset.get("total_working_days_mode", "calendar_minus_weekoffs_holidays")

    payroll_cfg: dict[str, Any] = {
        "payable_days_mode": "attendance_units",
        "total_working_days_mode": total_mode,
        "missing_attendance_policy": "treat_missing_as_absent" if "auto_lop" in behaviors else "none",
        "apply_lop_deduction": "auto_lop" in behaviors,
        "prorate_with_attendance": True,
        "count_holidays_as_payable": "holiday_pay" in behaviors,
        "count_weekoffs_as_payable": "weekoff_pay" in behaviors,
    }

    attendance_slice: dict[str, Any] = {
        "week_off_weekdays": week_offs,
        "alternate_saturday": bool(cycle_config.get("alternate_saturday") or cycle_preset.get("alternate_saturday")),
        "half_day_saturday_fraction": cycle_config.get("half_day_saturday_fraction")
        or cycle_preset.get("half_day_saturday_fraction"),
        "cycle_type": cycle_type,
        "derived_scalars": {
            "night_shift_allowance_enabled": "night_shift_allowance" in behaviors,
            "holiday_shift_allowance_enabled": "holiday_pay" in behaviors,
            "shift_differential_enabled": "shift_differential" in behaviors,
            "ot_enabled": "ot_enabled" in behaviors,
            "sunday_ot": "sunday_ot" in behaviors,
            "holiday_ot": "holiday_ot" in behaviors,
        },
    }

    return {"payroll": payroll_cfg, "attendance": attendance_slice}


async def _upsert_weekly_off_rule(
    db: AsyncSession,
    organisation_id: UUID,
    cycle_config: dict[str, Any],
    cycle_type: str,
) -> None:
    preset = CYCLE_PRESETS.get(cycle_type, {})
    weekdays = cycle_config.get("week_off_weekdays") or preset.get("week_off_weekdays", [5, 6])
    pattern = {"weekdays": weekdays}
    if preset.get("alternate_saturday") or cycle_config.get("alternate_saturday"):
        pattern["alternate_saturday"] = True
        pattern["half_day_saturday_fraction"] = float(
            cycle_config.get("half_day_saturday_fraction") or preset.get("half_day_saturday_fraction") or 0.5
        )

    existing = await db.execute(
        select(WfWeeklyOffRule).where(
            WfWeeklyOffRule.organisation_id == organisation_id,
            WfWeeklyOffRule.rule_type == "weekly_off",
        ).limit(1)
    )
    row = existing.scalar_one_or_none()
    if row:
        row.pattern_json = pattern
        row.is_active = True
    else:
        db.add(
            WfWeeklyOffRule(
                organisation_id=organisation_id,
                rule_type="weekly_off",
                pattern_json=pattern,
                priority=0,
                is_active=True,
            )
        )
    await db.flush()


async def _upsert_attendance_cycle(
    db: AsyncSession,
    organisation_id: UUID,
    cycle_type: str,
    cycle_config: dict[str, Any],
) -> None:
    from datetime import date

    existing = await db.execute(
        select(WfAttendanceCycle).where(
            WfAttendanceCycle.organisation_id == organisation_id,
            WfAttendanceCycle.is_active.is_(True),
        ).limit(1)
    )
    row = existing.scalar_one_or_none()
    cfg = {**CYCLE_PRESETS.get(cycle_type, {}), **cycle_config, "cycle_type": cycle_type}
    if row:
        row.cycle_type = cycle_type
        row.config_json = cfg
    else:
        db.add(
            WfAttendanceCycle(
                organisation_id=organisation_id,
                cycle_type=cycle_type,
                config_json=cfg,
                effective_from=date.today().replace(day=1),
                is_active=True,
            )
        )
    await db.flush()


async def _apply_industry_policy_rules(
    db: AsyncSession,
    organisation_id: UUID,
    industry: str,
    behaviors: list[str],
) -> None:
    """Extend default policy with industry-specific rules (additive)."""
    from models.wf_models import WfAttendancePolicy, WfPolicyRule

    pol_q = await db.execute(
        select(WfAttendancePolicy).where(
            WfAttendancePolicy.organisation_id == organisation_id,
            WfAttendancePolicy.status == "published",
        ).limit(1)
    )
    pol = pol_q.scalar_one_or_none()
    if not pol:
        return

    if "grace_time" in behaviors:
        db.add(
            WfPolicyRule(
                policy_id=pol.policy_id,
                rule_type="grace_time",
                priority=5,
                condition_json={"grace_minutes": 15},
                action_json={},
                is_active=True,
            )
        )
    if "late_penalty" in behaviors:
        db.add(
            WfPolicyRule(
                policy_id=pol.policy_id,
                rule_type="late_entry",
                priority=15,
                condition_json={"late_threshold_minutes": 30, "strikes_before_half_day": 3},
                action_json={},
                is_active=True,
            )
        )
    if "ot_enabled" in behaviors:
        db.add(
            WfPolicyRule(
                policy_id=pol.policy_id,
                rule_type="overtime",
                priority=40,
                condition_json={"hours_after": 8},
                action_json={},
                is_active=True,
            )
        )
    if industry == "hospital":
        db.add(
            WfPolicyRule(
                policy_id=pol.policy_id,
                rule_type="night_shift",
                priority=25,
                condition_json={"night_start": "22:00", "night_end": "06:00"},
                action_json={"allowance_tag": True},
                is_active=True,
            )
        )
    await db.flush()


async def count_roster_working_days(
    db: AsyncSession,
    organisation_id: UUID,
    period_start,
    period_end,
) -> int | None:
    """Roster-based expected working days for payroll (P0 extension)."""
    q = await db.execute(
        select(func.count())
        .select_from(WfRosterAssignment)
        .where(
            WfRosterAssignment.organisation_id == organisation_id,
            WfRosterAssignment.work_date >= period_start,
            WfRosterAssignment.work_date <= period_end,
        )
    )
    n = q.scalar()
    return int(n) if n else None


async def complete_setup(
    db: AsyncSession,
    organisation_id: UUID,
    *,
    sources: list[str],
    industry: str,
    cycle_type: str,
    cycle_config: dict[str, Any] | None = None,
    behaviors: list[str] | None = None,
    progress: dict[str, Any] | None = None,
) -> OrganisationAttendanceProfile:
    """Atomic setup completion — rolls back on failure if caller wraps in transaction."""
    tmpl = INDUSTRY_TEMPLATES.get(industry) or INDUSTRY_TEMPLATES["custom"]
    cycle_config = {**(cycle_config or {}), **(tmpl.get("attendance_cycle_config") or {})}
    behaviors = behaviors or list(tmpl.get("payroll_behaviors") or [])
    terminology = tmpl.get("terminology_pack") or "default_en"
    extra_flags = tmpl.get("flags") or {}

    profile = await activate_attendance_ecosystem(
        db,
        organisation_id,
        sources,
        default_source=sources[0] if sources else "manual_hr",
        terminology_pack_code=terminology,
        engine_version="v2",
    )

    flags = _flags_for_setup(sources, industry, extra_flags)
    for code, enabled in flags.items():
        await set_org_flag(db, organisation_id, code, enabled)

    org = await db.get(Organisation, organisation_id)
    if org:
        hr = dict(org.hr_settings or {})
        patch = _hr_settings_patch(cycle_type, cycle_config, behaviors)
        hr.setdefault("payroll", {}).update(patch.get("payroll", {}))
        hr.setdefault("attendance", {}).update(patch.get("attendance", {}))
        org.hr_settings = hr
        org.is_setup_complete = True

    await _upsert_weekly_off_rule(db, organisation_id, cycle_config, cycle_type)
    await _upsert_attendance_cycle(db, organisation_id, cycle_type, cycle_config)

    await bootstrap_org_wf_defaults(db, organisation_id)
    await _apply_industry_policy_rules(db, organisation_id, industry, behaviors)

    modules = {
        "sources": sources,
        "flags": flags,
        "industry": industry,
        "cycle_type": cycle_type,
        "behaviors": behaviors,
    }

    profile.industry_template = industry
    profile.attendance_cycle_type = cycle_type
    profile.attendance_cycle_config = cycle_config
    profile.payroll_behavior_config = {b: True for b in behaviors}
    profile.activated_modules_json = modules
    profile.setup_progress_json = progress or profile.setup_progress_json or {}
    profile.setup_completed_at = datetime.now(timezone.utc)
    profile.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(profile)
    return profile


async def complete_setup_from_progress(
    db: AsyncSession,
    organisation_id: UUID,
) -> OrganisationAttendanceProfile:
    profile = await ensure_attendance_profile(db, organisation_id)
    progress = _merge_template_into_progress(
        (profile.setup_progress_json or {}).get("step_2", {}).get("industry", "custom"),
        profile.setup_progress_json or {},
    )
    s1 = progress.get("step_1", {})
    s2 = progress.get("step_2", {})
    s3 = progress.get("step_3", {})
    s4 = progress.get("step_4", {})
    return await complete_setup(
        db,
        organisation_id,
        sources=s1.get("sources") or ["manual_hr"],
        industry=s2.get("industry") or "custom",
        cycle_type=s3.get("cycle") or "five_day",
        cycle_config=s3.get("config") or {},
        behaviors=s4.get("behaviors") or [],
        progress=progress,
    )
