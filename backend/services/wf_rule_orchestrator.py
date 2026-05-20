"""
Deterministic rule execution pipeline with traceability.

Raw Events → Validation → Shift Match → Grace → Late → OT → Holiday → Compliance → Day Result
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import RawAttendanceEvent
from models.wf_enterprise_models import WfPolicyExecutionLog
from services.wf_policy_engine import PolicyDayOutcome, evaluate_day_policies
from services.wf_shift_engine import match_shift_for_day, net_work_minutes, check_fatigue


STAGES = (
    "validation",
    "shift_match",
    "grace",
    "late",
    "overtime",
    "holiday",
    "compliance",
    "finalize",
)

# Deterministic dependency graph (P3 explainability)
STAGE_DEPENDS_ON: dict[str, list[str]] = {
    "validation": [],
    "shift_match": ["validation"],
    "grace": ["shift_match"],
    "late": ["grace"],
    "overtime": ["late"],
    "holiday": ["shift_match"],
    "compliance": ["grace", "late", "overtime", "holiday"],
    "finalize": ["compliance"],
}


@dataclass
class OrchestratorContext:
    organisation_id: UUID
    employee_id: UUID
    work_date: date
    events: list[RawAttendanceEvent]
    time_in: Any = None
    time_out: Any = None
    work_hours: float = 0.0
    shift_window: Any = None
    stages: list[dict[str, Any]] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    outcome: PolicyDayOutcome | None = None


@dataclass
class OrchestratorResult:
    status: str
    payable_fraction: Decimal
    late_minutes: int
    early_exit_minutes: int
    overtime_hours: Decimal
    policy_result: dict[str, Any]
    execution_graph: dict[str, Any]


async def run_attendance_pipeline(
    db: AsyncSession,
    ctx: OrchestratorContext,
) -> OrchestratorResult:
    t0 = time.perf_counter()
    missing_out = len(ctx.events) == 1 and ctx.events and ctx.events[0].event_type.upper() == "IN"

    # validation
    ctx.stages.append(
        {
            "stage": "validation",
            "duplicate_count": sum(1 for e in ctx.events if e.duplicate_flag),
            "anomaly_count": sum(1 for e in ctx.events if e.anomaly_flag),
            "event_count": len(ctx.events),
        }
    )

    # shift match
    ctx.shift_window = await match_shift_for_day(db, ctx.organisation_id, ctx.employee_id, ctx.work_date)
    if ctx.shift_window:
        fatigue = check_fatigue([ctx.shift_window])
        ctx.flags.extend(fatigue)
        net_min = net_work_minutes(ctx.shift_window, ctx.time_in, ctx.time_out)
        ctx.work_hours = net_min / 60.0
        ctx.stages.append(
            {
                "stage": "shift_match",
                "shift": ctx.shift_window.name,
                "cross_midnight": ctx.shift_window.cross_midnight,
                "net_minutes": net_min,
            }
        )
    else:
        ctx.stages.append({"stage": "shift_match", "shift": None})

    # policy engine (grace, late, ot, holiday, absent)
    ctx.outcome = await evaluate_day_policies(
        db,
        ctx.organisation_id,
        time_in=ctx.time_in,
        time_out=ctx.time_out,
        work_hours=ctx.work_hours,
        missing_punch_out=missing_out,
    )
    ctx.flags.extend(ctx.outcome.flags)

    for stage_name in ("grace", "late", "overtime", "holiday"):
        hits = [h for h in ctx.outcome.policy_hits if h.get("rule_type", "").startswith(stage_name.split("_")[0])]
        if hits or stage_name in ("late", "overtime"):
            ctx.stages.append({"stage": stage_name, "hits": hits})

    # compliance
    compliance_issues = [f for f in ctx.flags if "fatigue" in f or "violation" in f]
    ctx.stages.append({"stage": "compliance", "issues": compliance_issues})

    # finalize status codes for legacy attendances
    status = ctx.outcome.status
    if status == "present":
        status = "P"
    elif status == "absent":
        status = "A"
    elif status == "half_day":
        status = "HD"

    duration_ms = int((time.perf_counter() - t0) * 1000)
    graph = {
        "stages": list(STAGES),
        "depends_on": STAGE_DEPENDS_ON,
        "executed": [s["stage"] for s in ctx.stages],
    }

    policy_result = {
        "engine": "orchestrator_v1",
        "flags": ctx.flags,
        "policy_hits": ctx.outcome.policy_hits,
        "execution_graph": graph,
        "stages": ctx.stages,
    }

    log = WfPolicyExecutionLog(
        organisation_id=ctx.organisation_id,
        employee_id=ctx.employee_id,
        work_date=ctx.work_date,
        execution_graph_json=graph,
        stages_json=ctx.stages,
        final_status=status,
        duration_ms=duration_ms,
    )
    db.add(log)
    await db.flush()

    return OrchestratorResult(
        status=status,
        payable_fraction=ctx.outcome.payable_fraction,
        late_minutes=ctx.outcome.late_minutes,
        early_exit_minutes=ctx.outcome.early_exit_minutes,
        overtime_hours=ctx.outcome.overtime_hours,
        policy_result=policy_result,
        execution_graph=graph,
    )
