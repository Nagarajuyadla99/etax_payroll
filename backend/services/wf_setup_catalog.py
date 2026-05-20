"""Static catalog for attendance setup wizard (tenant config is stored on profile, not here)."""

from __future__ import annotations

# UI source code → plugin registry code
SOURCE_OPTIONS: list[dict[str, str]] = [
    {"code": "biometric", "label": "Biometric Attendance"},
    {"code": "mobile_checkin", "label": "Mobile Check-in"},
    {"code": "manual_hr", "label": "Manual HR Entry"},
    {"code": "shift_roster", "label": "Shift Roster"},
    {"code": "geo_fence", "label": "Geo Fence"},
    {"code": "qr", "label": "QR Attendance"},
    {"code": "face_scan", "label": "Face Scan"},
    {"code": "excel_upload", "label": "Excel Upload"},
    {"code": "default_present", "label": "Default Present"},
]

INDUSTRY_OPTIONS: list[dict[str, str]] = [
    {"code": "hospital", "label": "Hospital"},
    {"code": "manufacturing", "label": "Manufacturing"},
    {"code": "it", "label": "IT Company"},
    {"code": "school", "label": "School"},
    {"code": "retail", "label": "Retail"},
    {"code": "logistics", "label": "Logistics"},
    {"code": "construction", "label": "Construction"},
    {"code": "factory", "label": "Factory"},
    {"code": "custom", "label": "Custom"},
]

CYCLE_OPTIONS: list[dict[str, str]] = [
    {"code": "five_day", "label": "5 Days / Week"},
    {"code": "five_half_day", "label": "5.5 Days (alternate Saturday)"},
    {"code": "six_day", "label": "6 Days / Week"},
    {"code": "shift_based", "label": "Shift Based"},
    {"code": "roster_based", "label": "Roster Based"},
]

PAYROLL_BEHAVIOR_OPTIONS: list[dict[str, str]] = [
    {"code": "ot_enabled", "label": "OT Enabled"},
    {"code": "night_shift_allowance", "label": "Night Shift Allowance"},
    {"code": "holiday_pay", "label": "Holiday Pay"},
    {"code": "weekoff_pay", "label": "Weekoff Pay"},
    {"code": "late_penalty", "label": "Late Attendance Penalty"},
    {"code": "grace_time", "label": "Grace Time"},
    {"code": "auto_lop", "label": "Auto LOP"},
    {"code": "shift_differential", "label": "Shift Differential"},
    {"code": "sunday_ot", "label": "Sunday OT"},
    {"code": "holiday_ot", "label": "Holiday OT"},
]

# Industry → default sources, cycle, behaviors, policy pack, terminology
INDUSTRY_TEMPLATES: dict[str, dict] = {
    "hospital": {
        "enabled_modes": ["biometric", "shift_roster", "manual_hr"],
        "attendance_cycle_type": "shift_based",
        "attendance_cycle_config": {
            "shifts_per_day": 3,
            "allow_4_shift": True,
            "rotating": True,
            "night_shift": True,
        },
        "payroll_behaviors": ["ot_enabled", "night_shift_allowance", "holiday_pay", "grace_time"],
        "policy_pack": "healthcare_24x7",
        "terminology_pack": "healthcare_duty",
        "flags": {"wf_roster": True, "wf_raw_events": True, "wf_policy_engine": True},
    },
    "manufacturing": {
        "enabled_modes": ["biometric", "excel_upload", "shift_roster"],
        "attendance_cycle_type": "shift_based",
        "attendance_cycle_config": {"shifts_per_day": 2, "strict_biometric": True},
        "payroll_behaviors": ["ot_enabled", "late_penalty", "grace_time", "auto_lop"],
        "policy_pack": "factory_strict",
        "terminology_pack": "default_en",
        "flags": {"wf_roster": True, "wf_raw_events": True},
    },
    "factory": {
        "enabled_modes": ["biometric", "excel_upload", "shift_roster"],
        "attendance_cycle_type": "six_day",
        "attendance_cycle_config": {"week_off_weekdays": [6]},
        "payroll_behaviors": ["ot_enabled", "late_penalty", "auto_lop"],
        "policy_pack": "factory_strict",
        "terminology_pack": "default_en",
        "flags": {"wf_roster": True},
    },
    "it": {
        "enabled_modes": ["default_present", "mobile_checkin", "manual_hr", "excel_upload"],
        "attendance_cycle_type": "five_day",
        "attendance_cycle_config": {"week_off_weekdays": [5, 6]},
        "payroll_behaviors": ["grace_time", "weekoff_pay"],
        "policy_pack": "it_flexible",
        "terminology_pack": "it_associate",
        "flags": {"wf_dual_write": True},
    },
    "school": {
        "enabled_modes": ["manual_hr", "excel_upload", "default_present"],
        "attendance_cycle_type": "five_day",
        "attendance_cycle_config": {"week_off_weekdays": [6]},
        "payroll_behaviors": ["holiday_pay", "weekoff_pay"],
        "policy_pack": "it_flexible",
        "terminology_pack": "default_en",
        "flags": {},
    },
    "retail": {
        "enabled_modes": ["shift_roster", "excel_upload", "qr"],
        "attendance_cycle_type": "roster_based",
        "attendance_cycle_config": {},
        "payroll_behaviors": ["ot_enabled", "sunday_ot", "holiday_ot"],
        "policy_pack": "retail_split",
        "terminology_pack": "default_en",
        "flags": {"wf_roster": True},
    },
    "logistics": {
        "enabled_modes": ["mobile_checkin", "geo_fence", "manual_hr"],
        "attendance_cycle_type": "six_day",
        "attendance_cycle_config": {"week_off_weekdays": [6]},
        "payroll_behaviors": ["ot_enabled", "grace_time"],
        "policy_pack": "staffing_geo",
        "terminology_pack": "default_en",
        "flags": {"wf_raw_events": True},
    },
    "construction": {
        "enabled_modes": ["manual_hr", "mobile_checkin", "excel_upload"],
        "attendance_cycle_type": "six_day",
        "attendance_cycle_config": {"week_off_weekdays": [6]},
        "payroll_behaviors": ["ot_enabled", "auto_lop"],
        "policy_pack": "factory_strict",
        "terminology_pack": "default_en",
        "flags": {},
    },
    "custom": {
        "enabled_modes": ["manual_hr", "excel_upload"],
        "attendance_cycle_type": "five_day",
        "attendance_cycle_config": {"week_off_weekdays": [5, 6]},
        "payroll_behaviors": ["grace_time"],
        "policy_pack": None,
        "terminology_pack": "default_en",
        "flags": {},
    },
}

CYCLE_PRESETS: dict[str, dict] = {
    "five_day": {"week_off_weekdays": [5, 6], "total_working_days_mode": "calendar_minus_weekoffs_holidays"},
    "five_half_day": {
        "week_off_weekdays": [6],
        "alternate_saturday": True,
        "half_day_saturday_fraction": 0.5,
        "total_working_days_mode": "calendar_minus_weekoffs_holidays",
    },
    "six_day": {"week_off_weekdays": [6], "total_working_days_mode": "calendar_minus_weekoffs_holidays"},
    "shift_based": {"total_working_days_mode": "calendar_minus_weekoffs_holidays", "use_shift_engine": True},
    "roster_based": {"total_working_days_mode": "roster_based", "use_roster_engine": True},
}

# Source → feature flags to enable
SOURCE_FLAG_MAP: dict[str, list[str]] = {
    "biometric": ["wf_raw_events", "wf_engine_v2"],
    "mobile_checkin": ["wf_raw_events", "wf_ess", "wf_engine_v2"],
    "manual_hr": ["wf_dual_write", "wf_engine_v2"],
    "shift_roster": ["wf_roster", "wf_engine_v2"],
    "geo_fence": ["wf_raw_events", "wf_engine_v2"],
    "qr": ["wf_raw_events", "wf_engine_v2"],
    "face_scan": ["wf_raw_events", "wf_engine_v2"],
    "excel_upload": ["wf_engine_v2"],
    "default_present": ["wf_engine_v2"],
}
