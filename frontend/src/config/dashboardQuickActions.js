import {
  UserPlus,
  FileText,
  ShieldCheck,
  Download,
  TrendingUp,
  Receipt,
  CalendarDays,
  CalendarPlus,
  ScrollText,
  UserRound,
  FolderDown,
} from "lucide-react";

/**
 * Centralized Quick Actions for Payroll Dashboard (RBAC).
 * Roles align with AuthContext: "admin" | "hr" | "employee"
 */
export function normalizeDashboardRole(role) {
  const r = (role ?? "").toString().toLowerCase().trim();
  if (r === "admin" || r === "hr" || r === "employee") return r;
  if (r === "superuser" || r === "super_admin") return "admin";
  return "employee";
}

const managementActions = [
  {
    id: "add-employee",
    label: "Add Employee",
    cls: "qa-blue",
    Icon: UserPlus,
    action: { type: "navigate", path: "/employeeCreate" },
  },
  {
    id: "gen-payslip",
    label: "Gen Payslip",
    cls: "qa-green",
    Icon: FileText,
    action: { type: "comingSoon", feature: "Payslip Generation" },
  },
  {
    id: "tax-declaration",
    label: "Tax Declaration",
    cls: "qa-teal",
    Icon: ShieldCheck,
    action: { type: "comingSoon", feature: "Tax Declaration" },
  },
  {
    id: "leave-import",
    label: "Leave Import",
    cls: "qa-amber",
    Icon: Download,
    action: { type: "comingSoon", feature: "Leave Import" },
  },
  {
    id: "pf-report",
    label: "PF Report",
    cls: "qa-purple",
    Icon: TrendingUp,
    action: { type: "comingSoon", feature: "PF Report" },
  },
  {
    id: "esi-report",
    label: "ESI Report",
    cls: "qa-red",
    Icon: ShieldCheck,
    action: { type: "comingSoon", feature: "ESI Report" },
  },
];

const employeeActions = [
  {
    id: "view-payslip",
    label: "View Payslip",
    cls: "qa-green",
    Icon: Receipt,
    action: { type: "navigate", path: "/payslip" },
  },
  {
    id: "my-attendance",
    label: "My Attendance",
    cls: "qa-blue",
    Icon: CalendarDays,
    action: { type: "navigate", path: "/attendanceSummary" },
  },
  {
    id: "apply-leave",
    label: "Apply Leave",
    cls: "qa-teal",
    Icon: CalendarPlus,
    action: { type: "comingSoon", feature: "Apply Leave" },
  },
  {
    id: "my-tax-declaration",
    label: "My Tax Declaration",
    cls: "qa-amber",
    Icon: ScrollText,
    action: { type: "navigate", path: "/form16" },
  },
  {
    id: "profile-settings",
    label: "Profile / Settings",
    cls: "qa-purple",
    Icon: UserRound,
    action: { type: "navigate", path: "/profile" },
  },
  {
    id: "download-documents",
    label: "Download Documents",
    cls: "qa-red",
    Icon: FolderDown,
    action: { type: "comingSoon", feature: "Download Documents" },
  },
];

export const roleActions = {
  admin: managementActions,
  hr: managementActions,
  employee: employeeActions,
};

export function getQuickActionsForRole(role) {
  const r = normalizeDashboardRole(role);
  return roleActions[r] ?? roleActions.employee;
}
