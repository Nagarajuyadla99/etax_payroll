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
} from "lucide-react";
import { motion } from "framer-motion";
import { useContext, useEffect, useMemo, useState } from "react";
import { getEmployees } from "../../Moduels/Employees/EmployeeApi";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../Moduels/Context/AuthContext";
import QuickActionCard from "../dashboard/QuickActionCard";
import { getQuickActionsForRole } from "../../config/dashboardQuickActions";
import "../../styles/dashboard-page.css";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();
  const { role } = useContext(AuthContext);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const currentPeriod = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        if (role === "employee") {
          setEmployees([]);
          return;
        }
        const data = await getEmployees();
        setEmployees(data);
      } catch (error) {
        console.error("Error loading employees", error);
      }
    };
    fetchEmployees();
  }, [role]);

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

  return (
    <>
      {showPopup ? (
        <div className="pw-popup-overlay" role="dialog" aria-modal="true" aria-label="Feature notice">
          <div className="pw-popup-box">
            <div className="pw-popup-icon">
              <Sparkles size={22} />
            </div>
            <p className="pw-popup-msg">{popupMessage}</p>
            <button type="button" className="pw-popup-btn" onClick={() => setShowPopup(false)}>
              Got it
            </button>
          </div>
        </div>
      ) : null}

      <motion.div className="dash-root" variants={stagger} initial="hidden" animate="show">
        <motion.div className="dash-header" variants={fadeUp}>
          <div>
            <h1 className="dash-title">Payroll Dashboard</h1>
            <div className="dash-sub">
              <span>{today}</span>
              <span className="dash-sub-dot" />
              <span>India Compliance · PF · ESI · TDS · PT</span>
            </div>
          </div>
          <div className="dash-header-right">
            <div className="dash-period-badge">
              <span className="dash-period-dot" />
              {currentPeriod} Active
            </div>
            <button type="button" className="dash-run-btn" onClick={() => handleComingSoon("Run Payroll")}>
              <Play size={14} /> Run Payroll
            </button>
          </div>
        </motion.div>

        <motion.div className="kpi-grid" variants={fadeUp}>
          <KpiCard
            accent="kpi-blue"
            label="Total Employees"
            value={employees.length || 0}
            sub="Across all departments"
            trend="+12 this month"
            trendType="up"
            icon={<Users size={18} />}
            iconClass="ic-blue"
          />
          <KpiCard
            accent="kpi-green"
            label="Net Pay — March"
            value="₹19.8L"
            sub="Credited 01-Mar-2025"
            trend="+3.2% vs Feb"
            trendType="up"
            icon={<IndianRupee size={18} />}
            iconClass="ic-green"
          />
          <KpiCard
            accent="kpi-red"
            label="Total Deductions"
            value="₹2.4L"
            sub="PF · ESI · TDS · PT"
            trend="↑ ₹14K vs last"
            trendType="down"
            icon={<TrendingDown size={18} />}
            iconClass="ic-red"
          />
          <KpiCard
            accent="kpi-amber"
            label="Compliance Due"
            value="7"
            sub="Returns & filings"
            trend="3 urgent"
            trendType="warn"
            icon={<ShieldCheck size={18} />}
            iconClass="ic-amber"
          />
        </motion.div>

        <motion.div className="mid-grid" variants={fadeUp}>
          <div className="pw-card">
            <motion.div className="pw-card-header" whileHover={{ backgroundColor: "var(--bg-subtle)" }}>
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--green-50)", color: "var(--green-600)" }}>
                  <FileCheck size={15} />
                </div>
                Payroll Status
              </div>
              <span className="badge badge-info">March 2025</span>
            </motion.div>
            <div className="pw-card-body">
              <div style={{ marginBottom: 16 }}>
                <motion.div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }} initial={false}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-500)" }}>Processing Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green-600)" }}>142 / 156 · 91%</span>
                </motion.div>
                <div className="progress-bar-wrap" role="progressbar" aria-valuenow={91} aria-valuemin={0} aria-valuemax={100}>
                  <motion.div
                    className="progress-bar-fill"
                    style={{ background: "linear-gradient(90deg, var(--green-500), var(--teal-500))" }}
                    initial={{ width: 0 }}
                    animate={{ width: "91%" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
              <StatusRow label="Salary Processed" val="142 / 156" type="success" dot="var(--green-500)" />
              <StatusRow label="Bank File" val="Generated" type="success" dot="var(--green-500)" />
              <StatusRow label="Payslips Email" val="Pending" type="warning" dot="var(--amber-500)" />
              <StatusRow label="PF Return" val="Due 14 Mar" type="danger" dot="var(--red-600)" />
              <StatusRow label="ESI Return" val="Due 15 Mar" type="danger" dot="var(--red-600)" />
              <StatusRow label="TDS Payment" val="Due 07 Mar" type="danger" dot="var(--red-600)" />
            </div>
          </div>

          <div className="pw-card">
            <div className="pw-card-header">
              <motion.div className="pw-card-title" whileHover={{ x: 1 }}>
                <div className="pw-card-icon" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}>
                  <Zap size={15} />
                </div>
                Quick Actions
              </motion.div>
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

          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--red-50)", color: "var(--red-600)" }}>
                  <AlertTriangle size={15} />
                </div>
                Alerts & Issues
              </div>
              <span className="badge badge-danger">4 issues</span>
            </div>
            <div className="pw-card-body">
              <AlertItem
                icon={<XCircle size={14} />}
                text="5 employees missing Bank Account"
                level="danger"
                priority="Critical"
                time="12m ago"
              />
              <AlertItem
                icon={<AlertCircle size={14} />}
                text="2 employees missing PAN number"
                level="warning"
                priority="Warning"
                time="1h ago"
              />
              <AlertItem
                icon={<XCircle size={14} />}
                text="PF return filing is overdue"
                level="danger"
                priority="Critical"
                time="3h ago"
              />
              <AlertItem
                icon={<Info size={14} />}
                text="Professional Tax due — 20 Mar"
                level="info"
                priority="Info"
                time="Today"
              />
            </div>
          </div>
        </motion.div>

        <motion.div className="bottom-grid" variants={fadeUp}>
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}>
                  <Clock size={15} />
                </div>
                Recent Transactions
              </div>
              <button type="button" className="pw-card-link">
                View all <ChevronRight size={12} />
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
                  {TXN_DATA.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <div className="txn-emp-name">{row.emp}</div>
                        <div className="txn-emp-role">{row.dept}</div>
                      </td>
                      <td>
                        <Chip text={row.action} />
                      </td>
                      <td>
                        <span className="txn-amount">{row.amount}</span>
                      </td>
                      <td>
                        <span className="txn-date">{row.date}</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.status === "Completed"
                              ? "badge-success"
                              : row.status === "Pending"
                                ? "badge-warning"
                                : "badge-info"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--amber-50)", color: "var(--amber-700)" }}>
                  <Calendar size={15} />
                </div>
                Compliance Deadlines
              </div>
            </div>
            <motion.div className="pw-card-body" variants={stagger} initial="hidden" animate="show">
              {COMPLIANCE_DATA.map((c, i) => (
                <motion.div key={i} className="compliance-item" variants={fadeUp}>
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
            </motion.div>
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
        <div>{text}</div>
        <div className="alert-meta">
          <span className="alert-priority">{priority}</span>
          <span className="alert-time">{time}</span>
          <span className="alert-actions">
            <button type="button" className="alert-action-btn">
              Resolve
            </button>
            <button type="button" className="alert-action-btn">
              View details
            </button>
          </span>
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

const TXN_DATA = [
  { emp: "Ramesh Patil", dept: "Engineering", action: "Salary Credited", amount: "₹48,500", date: "01 Mar 2025", status: "Completed" },
  { emp: "Priya Nair", dept: "Finance", action: "Reimbursement", amount: "₹4,200", date: "03 Mar 2025", status: "Completed" },
  { emp: "Amit Verma", dept: "Operations", action: "Full & Final", amount: "₹72,900", date: "04 Mar 2025", status: "Completed" },
  { emp: "Sunita Iyer", dept: "HR", action: "Bonus Credit", amount: "₹12,000", date: "05 Mar 2025", status: "Pending" },
  { emp: "Rohan Desai", dept: "Sales", action: "Salary Credited", amount: "₹55,000", date: "01 Mar 2025", status: "Completed" },
];

const COMPLIANCE_DATA = [
  { icon: "📑", name: "TDS Payment", desc: "Monthly TDS deposit", due: "07 Mar", urgency: "due-red", bg: "var(--red-50)", color: "var(--red-600)" },
  { icon: "🏦", name: "PF Return", desc: "ECR filing for March", due: "14 Mar", urgency: "due-red", bg: "var(--red-50)", color: "var(--red-600)" },
  { icon: "🏥", name: "ESI Return", desc: "Monthly contribution", due: "15 Mar", urgency: "due-amber", bg: "var(--amber-50)", color: "var(--amber-700)" },
  { icon: "🗂️", name: "Professional Tax", desc: "State PT payment", due: "20 Mar", urgency: "due-amber", bg: "var(--amber-50)", color: "var(--amber-700)" },
  { icon: "📋", name: "Form 16", desc: "Q4 TDS certificate issue", due: "15 Jun", urgency: "due-green", bg: "var(--green-50)", color: "var(--green-700)" },
];
