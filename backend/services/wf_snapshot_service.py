"""Persist attendance snapshots at payroll finalization for audit."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.payroll_models import PayrollRun
from models.wf_models import AttendanceSnapshot, OrganisationAttendanceProfile, WfAttendanceFreezeLog
from services.payroll_run_gather import PayrollGatherResult

logger = logging.getLogger(__name__)


def _stable_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


async def persist_payroll_attendance_snapshot(
    db: AsyncSession,
    payroll: PayrollRun,
    gathered: PayrollGatherResult,
    input_snapshot: dict[str, Any],
) -> AttendanceSnapshot | None:
    """Store immutable attendance snapshot linked to pay period (WF audit)."""
    try:
        profile = await db.get(OrganisationAttendanceProfile, payroll.organisation_id)
        engine_version = profile.engine_version if profile else "legacy"

        payload = {
            "payroll_run_id": str(payroll.payroll_run_id),
            "pay_period_id": str(gathered.pay_period.pay_period_id),
            "attendance_breakdown_by_employee": input_snapshot.get("attendance_breakdown_by_employee"),
            "units_agg": input_snapshot.get("units_agg"),
            "payroll_settings_fingerprint": input_snapshot.get("payroll_settings_fingerprint"),
        }
        snap_hash = _stable_hash(payload)

        row = AttendanceSnapshot(
            organisation_id=payroll.organisation_id,
            pay_period_id=gathered.pay_period.pay_period_id,
            snapshot_hash=snap_hash,
            payload_json=payload,
            policy_version_ids=[],
            engine_version=engine_version,
        )
        db.add(row)

        from models.wf_enterprise_models import WF_EVENT_PAYROLL_FINALIZED
        from services.wf_event_bus import publish_wf_domain_event
        from services.wf_freeze_service import apply_freeze, FREEZE_PAYROLL

        await apply_freeze(
            db,
            payroll.organisation_id,
            FREEZE_PAYROLL,
            range_start=gathered.pay_period.start_date,
            range_end=gathered.pay_period.end_date,
            pay_period_id=gathered.pay_period.pay_period_id,
            notes=f"Payroll run {payroll.payroll_run_id}",
            auto_commit=False,
        )
        await publish_wf_domain_event(
            db,
            payroll.organisation_id,
            WF_EVENT_PAYROLL_FINALIZED,
            {"payroll_run_id": str(payroll.payroll_run_id), "pay_period_id": str(gathered.pay_period.pay_period_id)},
            dedupe_key=f"payroll_finalized:{payroll.payroll_run_id}",
        )

        db.add(
            WfAttendanceFreezeLog(
                organisation_id=payroll.organisation_id,
                pay_period_id=gathered.pay_period.pay_period_id,
                action="freeze",
                range_start=gathered.pay_period.start_date,
                range_end=gathered.pay_period.end_date,
                notes=f"Payroll run {payroll.payroll_run_id}",
            )
        )
        await db.flush()
        return row
    except Exception as exc:
        logger.warning("WF attendance snapshot skipped: %s", exc)
        return None
