# Enterprise WF Layers (Priorities 1–10)

## Architecture principle (preserved)

```
Raw Events → Rule Orchestrator → attendances (day result)
  → Payroll Scalars → Formula Engine → Payroll
```

Salary is never written from attendance status directly.

## Priority 1 — Shift engine

- `services/wf_shift_engine.py`: cross-midnight, split segments, overlap resolution, fatigue checks, roster/template match
- `wf_shift_segments`: paid/unpaid breaks, standby/on-call
- `wf_shift_versions`: template inheritance + effective dating

## Priority 2 — Roster state machine

States: `draft` → `pending_approval` → `approved` → `published` → `frozen` → `archived`

APIs under `/api/wf/enterprise/rosters/{id}/submit|approve|freeze|archive`

## Priority 3 — Rule orchestrator

- `services/wf_rule_orchestrator.py`
- Stages: validation → shift_match → grace → late → overtime → holiday → compliance → finalize
- Trace: `wf_policy_execution_log` (execution_graph_json, stages_json)

## Priority 4 — Observability

- In-process counters: `services/wf_observability_service.py`
- `GET /api/wf/enterprise/ops/metrics`
- `wf_ops_metrics`, `wf_dead_letter_events` tables
- Policy execution logs API

## Priority 5 — Devices

- `attendance_devices`, `device_health_logs`, `device_sync_logs`
- `/api/wf/enterprise/devices`

## Priority 6 — Event bus

Canonical types in `wf_enterprise_models.WF_EVENT_TYPES`  
Publisher: `services/wf_event_bus.py` (outbox + DLQ)

## Priority 7 — ESS

- `/api/wf/ess/*` (regularization, punch correction)
- `/api/wf/enterprise/ess/shift-swap`, `/ess/ot-request`

## Priority 8 — Temporal versioning

Columns: `effective_from`, `effective_to` on templates, rosters, policies  
`wf_shift_versions.version_start` / `version_end`

## Priority 9 — Freeze hierarchy

| Level | Purpose |
|-------|---------|
| `attendance` | Blocks attendance edits |
| `payroll` | Applied on payroll process |
| `financial` | Future statutory lock |

`wf_freeze_records` + legacy `pay_periods.attendance_leave_locked`

## Priority 10 — Materialized analytics

- `wf_attendance_daily_projection` read model
- `POST /api/wf/enterprise/projections/refresh`
- `GET /api/wf/enterprise/projections/summary`

Do not run heavy dashboards on `attendances` directly in production.

## Requirement map (your 10 priorities only)

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | Full shift engine | `wf_shift_engine.py`, `wf_shift_ops_service.py`, segments/inherit/allocate APIs |
| 2 | Roster state machine | `wf_roster_state_machine.py`, lifecycle APIs |
| 3 | Rule orchestrator | `wf_rule_orchestrator.py`, `STAGE_DEPENDS_ON`, execution logs + explain endpoint |
| 4 | Observability | ingest latency, recompute/queue counters, worker-health, DLQ |
| 5 | Devices | `attendance_devices`, sync/health logs, `/devices` + `/terminals` |
| 6 | Event bus | six canonical `WF_EVENT_*` types via `wf_event_bus.py` |
| 7 | ESS | regularization, punch correction, dispute, mobile, shift-swap, OT |
| 8 | Temporal versioning | effective dates + `wf_shift_versions`; labels/flags migration `c8d9e0f1a2b4` |
| 9 | Freeze hierarchy | attendance / payroll / financial in `wf_freeze_service.py` |
| 10 | Materialized analytics | `wf_attendance_daily_projection` + refresh/summary APIs |

## Migration

```bash
alembic upgrade head   # b2c3d4e5f6a7 + c8d9e0f1a2b4
```
