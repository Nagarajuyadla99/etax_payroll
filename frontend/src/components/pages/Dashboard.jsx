import {
  Users,
  IndianRupee,
  TrendingDown,
  ShieldCheck,
  FileCheck,
  Zap,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Play,
  XCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  Info,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../Moduels/Context/AuthContext";
import QuickActionCard from "../dashboard/QuickActionCard";
import { getQuickActionsForRole } from "../../config/dashboardQuickActions";
import { getDashboardOverview } from "../../services/dashboardApi";
import { useToast } from "../../Moduels/Context/ToastContext";
import { formatInr, formatInrCompact } from "../../utils/formatCurrency";
import { API_DEBUG } from "../../config/apiConfig";
import "../../styles/dashboard-page.css";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const DASHBOARD_ROLES = new Set(["admin", "hr", "finance"]);

function formatTxnDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, loading: authLoading } = useContext(AuthContext);
  const toast = useToast();
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const canLoadMetrics = !authLoading && role && DASHBOARD_ROLES.has(role);

  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard-overview", role],
    queryFn: getDashboardOverview,
    enabled: canLoadMetrics,
    staleTime: 30_000,
    retry: 2,
    onError: (err) => {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not load dashboard data";
      toast.error(typeof detail === "string" ? detail : "Dashboard load failed");
      if (API_DEBUG) {
        console.error("[dashboard] overview failed", err?.response?.data || err);
      }
    },
  });

  const handleComingSoon = (feature) => {
    setPopupMessage(`${feature} will be available soon`);
    setShowPopup(true);
  };

  const quickActions = useMemo(() => getQuickActionsForRole(role), [role]);

  const runQuickAction = (action) => {
    if (action.type === "navigate") navigate(action.path);
    else handleComingSoon(action.feature);
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const currentPeriod =
    overview?.payroll?.period_label ||
    new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const employees = overview?.employees;
  const payroll = overview?.payroll;
  const compliance = overview?.compliance;
  const alerts = overview?.alerts ?? [];
  const transactions = overview?.recent_transactions ?? [];

  const totalEmployees = employees?.total ?? 0;
  const netPayLabel = payroll?.period_label
    ? `Net Pay — ${payroll.period_label}`
    : "Net Pay";
  const netPayValue =
    payroll?.net_pay != null ? formatInrCompact(payroll.net_pay) : "—";
  const deductionsValue =
    payroll?.deductions != null ? formatInrCompact(payroll.deductions) : "—";
  const progressPct = payroll?.progress_percent ?? 0;
  const processedCount = payroll?.processed_count ?? 0;
  const payrollTotal = payroll?.total_employees ?? totalEmployees;

  const loading = authLoading || (canLoadMetrics && isLoading);

  return (
    <>
      {showPopup ? (
        <motion.div
          className="pw-popup-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Feature notice"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="pw-popup-box">
            <motion.div className="pw-popup-icon" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <Sparkles size={22} />
            </motion.div>
            <p className="pw-popup-msg">{popupMessage}</p>
            <button type="button" className="pw-popup-btn" onClick={() => setShowPopup(false)}>
              Got it
            </button>
          </div>
        </motion.div>
      ) : null}

      <motion.div className="dash-root" variants={stagger} initial="hidden" animate="show">
        <motion.div className="dash-header" variants={fadeUp}>
          <div>
            <h1 className="dash-title">Payroll Dashboard</h1>
            <motion.div className="dash-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
              <span>{today}</span>
              <span className="dash-sub-dot" />
              <span>India Compliance · PF · ESI · TDS · PT</span>
            </motion.div>
          </div>
          <motion.div className="dash-header-right">
            <div className="dash-period-badge">
              <span className="dash-period-dot" />
              {currentPeriod} {payroll?.status === "processed" ? "Processed" : "Active"}
            </div>
            {canLoadMetrics ? (
              <button
                type="button"
                className="dash-run-btn"
                style={{ marginRight: 8 }}
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh dashboard"
              >
                <RefreshCw size={14} className={isFetching ? "spin-icon" : undefined} />
              </button>
            ) : null}
            <button
              type="button"
              className="dash-run-btn"
              onClick={() =>
                canLoadMetrics
                  ? navigate("/process-payroll")
                  : handleComingSoon("Run Payroll")
              }
            >
              <Play size={14} /> Run Payroll
            </button>
          </motion.div>
        </motion.div>

        {isError && canLoadMetrics ? (
          <motion.div className="pw-card" variants={fadeUp} style={{ marginBottom: 16, borderColor: "var(--red-200)" }}>
            <div className="pw-card-body" style={{ color: "var(--red-700)", fontSize: 14 }}>
              {error?.response?.data?.detail || error?.message || "Failed to load dashboard metrics."}{" "}
              <button type="button" className="pw-card-link" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          </motion.div>
        ) : null}

        {role === "employee" ? (
          <motion.div className="pw-card" variants={fadeUp} style={{ marginBottom: 16 }}>
            <div className="pw-card-body" style={{ fontSize: 14, color: "var(--slate-600)" }}>
              Employee view: open{" "}
              <button type="button" className="pw-card-link" onClick={() => navigate("/payslip")}>
                Payslips
              </button>{" "}
              for your records.
            </div>
          </motion.div>
        ) : null}

        <motion.div className="kpi-grid" variants={fadeUp}>
          <KpiCard
            accent="kpi-blue"
            label="Total Employees"
            value={loading ? "…" : totalEmployees}
            sub="Active in organisation"
            trend={
              employees?.missing_bank_account
                ? `${employees.missing_bank_account} need bank setup`
                : "All departments"
            }
            trendType={employees?.missing_bank_account ? "warn" : "up"}
            icon={<Users size={18} />}
            iconClass="ic-blue"
          />
          <KpiCard
            accent="kpi-green"
            label={netPayLabel}
            value={loading ? "…" : netPayValue}
            sub={payroll?.status ? `Run: ${payroll.status}` : "Latest payroll run"}
            trend={
              payroll?.lifecycle_status
                ? `Lifecycle: ${payroll.lifecycle_status}`
                : payroll?.execution_status || "—"
            }
            trendType="up"
            icon={<IndianRupee size={18} />}
            iconClass="ic-green"
          />
          <KpiCard
            accent="kpi-red"
            label="Total Deductions"
            value={loading ? "…" : deductionsValue}
            sub="PF · ESI · TDS · PT"
            trend={payroll?.gross_pay ? `Gross ${formatInrCompact(payroll.gross_pay)}` : "From latest run"}
            trendType="down"
            icon={<TrendingDown size={18} />}
            iconClass="ic-red"
          />
          <KpiCard
            accent="kpi-amber"
            label="Compliance Items"
            value={loading ? "…" : compliance?.open_items ?? 0}
            sub="Alerts & data gaps"
            trend={
              compliance?.urgent_items
                ? `${compliance.urgent_items} urgent`
                : "No critical items"
            }
            trendType={compliance?.urgent_items ? "warn" : "up"}
            icon={<ShieldCheck size={18} />}
            iconClass="ic-amber"
          />
        </motion.div>

        <motion.div className="mid-grid" variants={fadeUp}>
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <motion.div className="pw-card-icon" style={{ background: "var(--green-50)", color: "var(--green-600)" }}>
                  <FileCheck size={15} />
                </motion.div>
                Payroll Status
              </div>
              <span className="badge badge-info">{currentPeriod}</span>
            </div>
            <div className="pw-card-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-500)" }}>Processing Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green-600)" }}>
                    {processedCount} / {payrollTotal} · {progressPct}%
                  </span>
                </div>
                <div className="progress-bar-wrap" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                  <motion.div
                    className="progress-bar-fill"
                    style={{ background: "linear-gradient(90deg, var(--green-500), var(--teal-500))" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
              <StatusRow
                label="Salary Processed"
                val={`${processedCount} / ${payrollTotal}`}
                type={progressPct >= 100 ? "success" : "warning"}
                dot={progressPct >= 100 ? "var(--green-500)" : "var(--amber-500)"}
              />
              <StatusRow
                label="Run status"
                val={payroll?.status || "—"}
                type={payroll?.status === "processed" ? "success" : "info"}
                dot="var(--green-500)"
              />
              <StatusRow
                label="Execution"
                val={payroll?.execution_status || "—"}
                type="warning"
                dot="var(--amber-500)"
              />
              <StatusRow
                label="Lifecycle"
                val={payroll?.lifecycle_status || "draft"}
                type="info"
                dot="var(--blue-500)"
              />
            </div>
          </div>

          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <motion.div className="pw-card-icon" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}>
                  <Zap size={15} />
                </motion.div>
                Quick Actions
              </div>
            </div>
            <div className="pw-card-body">
              <div className="qa-grid">
                {quickActions.map((item) => {
                  const Icon = item.Icon;
                  return (
                    <QuickActionCard
                      key={item.id}
                      cls={item.cls}
                      label={item.label}
                      icon={<Icon size={16} strokeWidth={2} />}
                      onClick={() => runQuickAction(item.action)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <motion.div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--red-50)", color: "var(--red-600)" }}>
                  <AlertTriangle size={15} />
                </div>
                Alerts & Issues
              </div>
              <span className="badge badge-danger">
                {alerts.length} issue{alerts.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="pw-card-body">
              {loading ? (
                <p style={{ fontSize: 13, color: "var(--slate-500)" }}>Loading alerts…</p>
              ) : alerts.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--slate-500)" }}>No open issues for your organisation.</p>
              ) : (
                alerts.map((a, i) => (
                  <AlertItem
                    key={i}
                    icon={
                      a.level === "danger" ? (
                        <XCircle size={14} />
                      ) : a.level === "warning" ? (
                        <AlertCircle size={14} />
                      ) : (
                        <Info size={14} />
                      )
                    }
                    text={a.text}
                    level={a.level}
                    priority={a.priority}
                    time="Now"
                  />
                ))
              )}
            </div>
          </motion.div>
        </motion.div>

        <motion.div className="bottom-grid" variants={fadeUp}>
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <motion.div className="pw-card-icon" style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}>
                  <Clock size={15} />
                </motion.div>
                Recent Transactions
              </div>
              <button type="button" className="pw-card-link" onClick={() => navigate("/register")}>
                Payroll register <ChevronRight size={12} />
              </button>
            </div>
            <div className="txn-table-wrap">
              <table className="txn-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--slate-500)" }}>
                        Loading…
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--slate-500)" }}>
                        No payroll transactions yet. Process a payroll run to see entries here.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <motion.div className="txn-emp-name" whileHover={{ x: 2 }}>
                            {row.employee_name}
                          </motion.div>
                          <div className="txn-emp-role">{row.department || "—"}</div>
                        </td>
                        <td>
                          <Chip text={row.type || "Salary"} />
                        </td>
                        <td>
                          <span className="txn-amount">{formatInr(row.amount)}</span>
                        </td>
                        <td>
                          <span className="txn-date">{formatTxnDate(row.date)}</span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              row.status === "processed" || row.status === "Completed"
                                ? "badge-success"
                                : row.status === "pending" || row.status === "draft"
                                  ? "badge-warning"
                                  : "badge-info"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pw-card">
            <div className="pw-card-header">
              <motion.div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--amber-50)", color: "var(--amber-700)" }}>
                  <Calendar size={15} />
                </div>
                Compliance Deadlines
              </motion.div>
            </div>
            <div className="pw-card-body">
              {COMPLIANCE_DATA.map((c, i) => (
                <motion.div key={i} className="compliance-item" variants={fadeUp} initial="hidden" animate="show">
                  <div className="compliance-icon" style={{ background: c.bg, color: c.color }}>
                    {c.icon}
                  </div>
                  <div className="compliance-info">
                    <div className="compliance-name">{c.name}</div>
                    <div className="compliance-desc">{c.desc}</div>
                  </div>
                  <span className={`compliance-due ${c.urgency}`}>{c.due}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

function KpiCard({ accent, label, value, sub, trend, trendType, icon, iconClass }) {
  return (
    <motion.div className={`kpi-card ${accent}`} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        <div className={`kpi-icon ${iconClass}`}>{icon}</div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-footer">
        <span className="kpi-sub">{sub}</span>
        <span
          className={`kpi-trend ${
            trendType === "up" ? "trend-up" : trendType === "down" ? "trend-down" : "trend-warn"
          }`}
        >
          {trendType === "up" ? <ArrowUpRight size={10} /> : trendType === "down" ? <ArrowDownRight size={10} /> : null}
          {trend}
        </span>
      </div>
    </motion.div>
  );
}

function StatusRow({ label, val, type, dot }) {
  const cls = { success: "badge-success", warning: "badge-warning", danger: "badge-danger", info: "badge-info" };
  return (
    <div className="status-row">
      <div className="status-row-label">
        <span className="status-dot" style={{ background: dot }} />
        {label}
      </div>
      <span className={`badge ${cls[type]}`}>{val}</span>
    </div>
  );
}

function AlertItem({ icon, text, level, priority, time }) {
  const cls = { danger: "ai-danger", warning: "ai-warning", info: "ai-info", success: "ai-success" };
  return (
    <div className={`alert-item ${cls[level]}`}>
      <span className="alert-icon" aria-hidden>
        {icon}
      </span>
      <div className="alert-content">
        <motion.div>{text}</motion.div>
        <div className="alert-meta">
          <span className="alert-priority">{priority}</span>
          <span className="alert-time">{time}</span>
        </div>
      </div>
    </div>
  );
}

function Chip({ text }) {
  const color = text.includes("Salary")
    ? "chip-green"
    : text.includes("Full")
      ? "chip-purple"
      : text.includes("Reim")
        ? "chip-amber"
        : "chip-blue";
  return <span className={`chip ${color}`}>{text}</span>;
}

const COMPLIANCE_DATA = [
  { icon: "📑", name: "TDS Payment", desc: "Monthly TDS deposit", due: "07th", urgency: "due-red", bg: "var(--red-50)", color: "var(--red-600)" },
  { icon: "🏦", name: "PF Return", desc: "ECR filing", due: "15th", urgency: "due-red", bg: "var(--red-50)", color: "var(--red-600)" },
  { icon: "🏥", name: "ESI Return", desc: "Monthly contribution", due: "15th", urgency: "due-amber", bg: "var(--amber-50)", color: "var(--amber-700)" },
  { icon: "🗂️", name: "Professional Tax", desc: "State PT payment", due: "20th", urgency: "due-amber", bg: "var(--amber-50)", color: "var(--amber-700)" },
];
