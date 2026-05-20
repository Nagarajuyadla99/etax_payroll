/**
 * Single source of truth for attendance module navigation (user-friendly labels).
 */

export const ATTENDANCE_SECTIONS = [
  {
    id: "daily",
    title: "Daily attendance",
    description: "Mark and review employee attendance for payroll.",
    items: [
      { path: "/attendance/mark", label: "Mark attendance", desc: "Add or update one employee day", roles: ["admin", "hr"] },
      { path: "/attendance/records", label: "Attendance records", desc: "Search and view all entries", roles: ["admin", "hr"] },
      { path: "/attendance/calendar", label: "Calendar view", desc: "Month-wise daily attendance", roles: ["admin", "hr"] },
      { path: "/attendance/bulk", label: "Bulk upload", desc: "Import many rows at once", roles: ["admin", "hr"] },
      { path: "/attendance/apply-calendar", label: "Apply calendar", desc: "Apply pattern to a date range", roles: ["admin", "hr"] },
    ],
  },
  {
    id: "leave",
    title: "Leave & holidays",
    description: "Approvals and organisation holidays.",
    items: [
      { path: "/attendance/leave", label: "Leave approval", desc: "Approve or reject leave requests", roles: ["admin", "hr"] },
      { path: "/attendance/holidays", label: "Holidays", desc: "Manage organisation holiday list", roles: ["admin", "hr"] },
    ],
  },
  {
    id: "payroll",
    title: "Payroll period",
    description: "Summary used when running payroll.",
    items: [
      { path: "/attendance/summary", label: "Period summary", desc: "Attendance totals for a pay period", roles: ["admin", "hr"] },
    ],
  },
  {
    id: "workforce",
    title: "Workforce engine",
    description: "Punches, roster, exceptions, and analytics (advanced).",
    items: [
      { path: "/attendance/dashboard", label: "Analytics dashboard", desc: "Status mix and exceptions overview", roles: ["admin", "hr"] },
      { path: "/attendance/punches", label: "Live punches", desc: "Raw clock-in / clock-out events", roles: ["admin", "hr"] },
      { path: "/attendance/roster", label: "Roster", desc: "Shift plans and publish workflow", roles: ["admin", "hr"] },
      { path: "/attendance/exceptions", label: "Exceptions", desc: "Missing punch and anomalies", roles: ["admin", "hr"] },
      { path: "/attendance/approvals", label: "Employee requests", desc: "Regularization and corrections", roles: ["admin", "hr"] },
    ],
  },
  {
    id: "admin",
    title: "Setup & control",
    description: "Policies, freeze, and system configuration (admin).",
    roles: ["admin"],
    items: [
      { path: "/attendance/setup", label: "Engine setup", desc: "Activate workforce modes and flags", roles: ["admin"] },
      { path: "/attendance/policies", label: "Attendance policies", desc: "Grace, late, OT rules", roles: ["admin"] },
      { path: "/attendance/freeze", label: "Freeze periods", desc: "Lock attendance or payroll edits", roles: ["admin"] },
      { path: "/attendance/devices", label: "Biometric terminals", desc: "Device registry", roles: ["admin", "hr"] },
      { path: "/attendance/policy-trace", label: "Policy trace", desc: "Debug rule pipeline per day", roles: ["admin", "hr"] },
      { path: "/attendance/ops", label: "Operations", desc: "Queues and worker health", roles: ["admin"] },
      { path: "/attendance/labels", label: "Labels", desc: "UI terminology overrides", roles: ["admin"] },
    ],
  },
];

/** Tabs shown on inner pages for quick switching */
export const ATTENDANCE_QUICK_TABS = [
  { path: "/attendance", label: "Home", end: true },
  { path: "/attendance/mark", label: "Mark" },
  { path: "/attendance/records", label: "Records" },
  { path: "/attendance/calendar", label: "Calendar" },
  { path: "/attendance/leave", label: "Leave" },
  { path: "/attendance/holidays", label: "Holidays" },
];

export function filterSectionsByRole(sections, role) {
  return sections
    .filter((sec) => !sec.roles || sec.roles.includes(role))
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => !it.roles || it.roles.includes(role)),
    }))
    .filter((sec) => sec.items.length > 0);
}
