# Payroll attendance integration (enterprise)

## Lifecycle

1. HR marks **attendances** for `work_date` within the pay period (`pay_periods.start_date` … `end_date`).
2. Optional: org calendar job marks **H** / **WO**; approved **LOP** leave rows add `lop_leave_units`.
3. **Preview** (`POST /api/salary/v2/preview` + `pay_period_id`) or **process payroll** calls `gather_payroll_inputs()`.
4. Per employee: aggregate → missing working dates → optional missing-as-absent → scalars → engine overrides.
5. If template `prorate_with_attendance: true`, earnings may multiply by `WAGE_PRORATION_FACTOR` (capped at 1 in `attendance_units` mode).
6. On process: `execution_meta.input_snapshot` stores breakdown, warnings, validation; pay period may lock attendance.

## Configuration (`organisations.hr_settings.payroll`)

| Key | Default | Purpose |
|-----|---------|---------|
| `payable_days_mode` | `"calendar"` | `"calendar"` (legacy) or `"attendance_units"` (working-day payroll) |

**Enable working-day mode (admin):** `POST /api/organisation/me/hr-settings/enable-attendance-payroll`  
Or run: `py scripts/apply_enterprise_payroll_settings.py` from `backend/`.
| `total_working_days_mode` | `"calendar_minus_weekoffs_holidays"` | Denominator mode; `roster_based` reserved (uses `roster_working_days` when supplied) |
| `missing_attendance_policy` | `"none"` | `"treat_missing_as_absent"` adds missing working days to `absent_units` |
| `strict_attendance_validation` | `false` | If true, block payroll on missing/unknown/duplicates/lock |
| `require_attendance_lock_before_payroll` | `false` | If true, require `pay_periods.attendance_leave_locked` |
| `apply_lop_deduction` | `true` | Compute `WAGE_PRORATION_FACTOR`; if false, factor = 1 |
| `paid_leave_statuses` / `unpaid_leave_statuses` | see code | Status alias lists |

Org calendar: `hr_settings.attendance.week_off_weekdays` (0=Mon … 6=Sun), `organisation_holidays` table.

## Payable modes

### Calendar (default — unchanged)

- `PAYABLE_DAYS` = calendar days in period
- `LOP_UNITS` = absent + LOP leave [+ half days if configured]
- `WAGE_PRORATION_FACTOR` = `WORKED_DAYS / PAYABLE_DAYS`

### Attendance units (opt-in)

- `TOTAL_WORKING_DAYS` = calendar − holiday_units − week_off_units (from attendance buckets)
- `PAYABLE_DAYS` = present + paid_leave + half_day_units (**WO/H excluded**)
- `PAYABLE_DAYS` capped to `TOTAL_WORKING_DAYS`
- `WAGE_PRORATION_FACTOR` = **min(1, PAYABLE_DAYS / TOTAL_WORKING_DAYS)**

Missing working days (no row on a working date, excluding org holidays / configured week-offs and rows marked H/WO):

- Counted in `missing_attendance_units`
- With `treat_missing_as_absent`: added to `absent_units` → affects LOP and factor

## Formula variables (engine overrides)

`PAYABLE_DAYS`, `TOTAL_WORKING_DAYS`, `WORKED_DAYS`, `LOP_UNITS`, `WAGE_PRORATION_FACTOR`,  
`PRESENT_UNITS`, `ABSENT_UNITS`, `HALF_DAY_UNITS`, `PAID_LEAVE_UNITS`, `UNPAID_LEAVE_UNITS`,  
`MISSING_ATTENDANCE_UNITS`, `OVERTIME_UNITS` (reporting only), `HOLIDAY_UNITS`, `WEEK_OFF_UNITS`, …

## Template proration

`salary_template_versions.meta`: `{ "prorate_with_attendance": true }`  
Component/link: `attendance_proration_mode`: `auto` | `manual` | `disabled`

## Validation

**Warnings** (default): stored in `execution_meta.attendance_warnings` and `input_snapshot.attendance_validation`.

Checks: no rows, unlocked period, unknown statuses, missing days, duplicates, future dates, outside period, bad fractions, excess payable.

**Strict mode** (`strict_attendance_validation: true`): raises `PayrollAttendanceValidationError` → HTTP 400 with structured `detail`.

**Lock enforcement** (`require_attendance_lock_before_payroll: true`): blocks if period not locked.

## Audit snapshot (`input_snapshot` v2)

Per employee (`attendance_breakdown` / `attendance_debug`):

```json
{
  "calendar_days": "31",
  "total_working_days": "21",
  "present_units": "18",
  "paid_leave_units": "2",
  "half_day_units": "0.5",
  "absent_units": "1",
  "missing_attendance_units": "4",
  "holiday_units": "2",
  "week_off_units": "8",
  "payable_days": "20.5",
  "lop_units": "5",
  "wage_proration_factor": "0.976"
}
```

## APIs (additive fields)

- `GET /api/payroll/pay-periods/{id}/attendance-summary` — units + `missing_attendance_units`, `missing_working_dates`, `overtime_*`
- Salary v2 preview `preview_audit.attendance_breakdown` when `pay_period_id` + `employee_id` set

## Rollout

1. Deploy (defaults = legacy calendar behaviour).
2. Clean attendance data; review summary API warnings.
3. Pilot: `payable_days_mode: "attendance_units"`, `missing_attendance_policy` as needed.
4. Enable `prorate_with_attendance` on template version.
5. Optionally enable `strict_attendance_validation` / `require_attendance_lock_before_payroll`.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Net pay unchanged | Template `prorate_with_attendance`? (Also auto-enables when payroll supplies `WAGE_PRORATION_FACTOR` &lt; 1 unless template sets `prorate_with_attendance: false`.) Mode still `calendar`? |
| Factor always 1 | `apply_lop_deduction: false` or full attendance |
| Factor > 1 (old) | Upgrade: factor capped in `attendance_units` |
| High missing units | Incomplete monthly marks; calendar week-offs in org settings |
| Payroll blocked 400 | `detail.blocking_issues` — strict mode or lock config |
| Unknown units | Fix CSV statuses; aliases in `paid_leave_statuses` |

## Overtime / roster (future)

- `overtime_units` / `overtime_hours` collected (OT status); no salary impact yet.
- `total_working_days_mode: roster_based` — placeholder; pass `roster_working_days` when roster engine exists.

## Migrations

None required for attendance modes (JSON config only).
