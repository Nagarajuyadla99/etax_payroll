"""Platform seed data for WF engine (idempotent)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_models import (
    ATTENDANCE_SOURCE_MODES,
    FeatureFlag,
    LabelMaster,
    TerminologyPack,
    WfAttendanceLayer,
    WfAttendanceSourcePlugin,
    WfPolicyPack,
)

DEFAULT_LABELS: dict[str, tuple[str, str | None]] = {
    "attendance.entity": ("Attendance", "उपस्थिति"),
    "attendance.punch.in": ("Check-In", "चेक-इन"),
    "attendance.punch.out": ("Check-Out", "चेक-आउट"),
    "employee.entity": ("Employee", "कर्मचारी"),
    "shift.entity": ("Shift", "शिफ्ट"),
    "roster.entity": ("Roster", "रोस्टर"),
    "ot.label": ("Overtime", "ओवरटाइम"),
    "weekoff.label": ("Week Off", "साप्ताहिक अवकाश"),
    "holiday.label": ("Holiday", "अवकाश"),
    "leave.entity": ("Leave", "अवकाश"),
    "present.label": ("Present", "उपस्थित"),
    "absent.label": ("Absent", "अनुपस्थित"),
    "halfday.label": ("Half Day", "आधा दिन"),
}

SOURCE_DISPLAY: dict[str, str] = {
    "biometric": "Biometric Attendance",
    "mobile_checkin": "Mobile Check-In",
    "manual_hr": "Manual HR Entry",
    "shift_roster": "Shift Roster",
    "geo_fence": "Geo-Fence Attendance",
    "qr": "QR Attendance",
    "face_scan": "Face Scan Attendance",
    "excel_upload": "Excel Upload Attendance",
    "default_present": "Default Present Attendance",
    "api_push": "API Attendance Push",
    "browser_login": "Browser Login Attendance",
    "hybrid": "Hybrid Attendance",
    "contractor": "Contractor Attendance",
    "client_site": "Client-Site Attendance",
    "calendar_auto": "Calendar Auto-Mark",
}

FEATURE_FLAGS: list[tuple[str, str, bool, str]] = [
    ("wf_engine_v2", "Workforce management engine v2", False, "attendance"),
    ("wf_raw_events", "Raw attendance event ingestion", False, "attendance"),
    ("wf_policy_engine", "Attendance policy engine", False, "attendance"),
    ("wf_roster", "Shift roster module", False, "attendance"),
    ("wf_ess", "Employee self-service attendance", False, "attendance"),
    ("wf_labels", "Dynamic label engine", True, "attendance"),
    ("wf_recompute_async", "Async attendance recompute", False, "attendance"),
    ("wf_multi_layer", "Multi-layer attendance (billing/compliance)", False, "attendance"),
    ("wf_dual_write", "Mirror legacy attendance rows to raw events", False, "attendance"),
]

POLICY_PACKS: list[tuple[str, str, str]] = [
    ("it_flexible", "IT / Software", "Flexible timing, WFH, default present"),
    ("healthcare_24x7", "Healthcare", "Rotational shifts, night allowance"),
    ("factory_strict", "Manufacturing", "Strict biometric, OT compliance"),
    ("retail_split", "Retail", "Split shifts, festival calendar"),
    ("staffing_geo", "Security / Staffing", "Geo attendance, client-site"),
]


async def seed_wf_platform_data(db: AsyncSession) -> dict[str, int]:
    """Idempotent seed for labels, sources, flags, layers, policy packs."""
    counts = {"labels": 0, "sources": 0, "flags": 0, "packs": 0}

    for key, (en, hi) in DEFAULT_LABELS.items():
        existing = await db.get(LabelMaster, key)
        if not existing:
            db.add(LabelMaster(label_key=key, category="attendance", default_en=en, default_hi=hi))
            counts["labels"] += 1

    for i, code in enumerate(ATTENDANCE_SOURCE_MODES):
        existing = await db.get(WfAttendanceSourcePlugin, code)
        if not existing:
            db.add(
                WfAttendanceSourcePlugin(
                    source_code=code,
                    display_name=SOURCE_DISPLAY.get(code, code.replace("_", " ").title()),
                    sort_order=i,
                )
            )
            counts["sources"] += 1

    for code, desc, default, module in FEATURE_FLAGS:
        existing = await db.get(FeatureFlag, code)
        if not existing:
            db.add(FeatureFlag(flag_code=code, description=desc, default_enabled=default, module=module))
            counts["flags"] += 1

    for pack_code, industry, name in POLICY_PACKS:
        existing = await db.get(WfPolicyPack, pack_code)
        if not existing:
            db.add(WfPolicyPack(pack_code=pack_code, industry=industry, name=name, rules_json=[]))
            counts["packs"] += 1

    packs = [
        ("default_en", None, {"employee.entity": "Employee", "attendance.entity": "Attendance"}),
        ("it_associate", "IT", {"employee.entity": "Associate", "attendance.entity": "Duty", "shift.entity": "Schedule"}),
        ("healthcare_duty", "Healthcare", {"attendance.entity": "Duty", "shift.entity": "Duty Shift"}),
    ]
    for pack_code, industry, labels in packs:
        existing = await db.get(TerminologyPack, pack_code)
        if not existing:
            db.add(TerminologyPack(pack_code=pack_code, industry=industry, labels_json=labels))

    await db.commit()
    return counts
