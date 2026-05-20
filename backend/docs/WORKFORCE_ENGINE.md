# Workforce Management Engine

Additive layer on legacy `/api/attendance/*` and payroll scalars.

## Setup

```bash
cd backend
alembic upgrade head
# optional: seed via API
curl -X POST http://localhost:9000/api/wf/platform/seed -H "Authorization: Bearer ..."
```

## Activate org (admin UI: `/attendanceSetup`)

1. `POST /api/wf/platform/seed` — labels, source plugins, feature flags
2. `POST /api/wf/attendance-profile/activate` — enable modes (IT/hospital presets in UI)
3. `PATCH /api/wf/feature-flags/wf_raw_events` — enable raw punch ingest when ready

## Key APIs (`/api/wf/*`)

| Area | Routes |
|------|--------|
| Profile | `GET/POST .../attendance-profile` |
| Labels | `GET/PATCH .../labels` |
| Holidays | `GET/POST/PUT/DELETE .../holidays` |
| Events | `POST .../events/ingest` |
| Recompute | `POST .../jobs/recompute` |
| Shifts/Rosters/Policies | `/shift-templates`, `/rosters`, `/policies` |
| Exceptions | `/exceptions` |
| Approvals / ESS | `/approvals`, `/ess/*` |

## Payroll safety

`raw_attendance_events` → recompute → `attendances` → `payroll_attendance_calculator` → formula engine.

Never write net pay from attendance CRUD.

## Feature flags

- `wf_labels` (default on)
- `wf_raw_events`, `wf_recompute_async`, `wf_ess`, `wf_engine_v2`, etc.

Legacy orgs stay `engine_version=legacy` until activation.

## Policy + exceptions flow

1. `POST /api/wf/policies` → add rules → `POST .../publish`
2. Raw ingest / recompute runs policy engine on each employee-day
3. Exceptions appear at `GET /api/wf/exceptions` — resolve via UI `/attendanceExceptions`
4. Payroll process stores `attendance_snapshot` + freeze log automatically
