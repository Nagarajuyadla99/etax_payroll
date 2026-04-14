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
  FileText,
  UserPlus,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { getEmployees } from "../../Moduels/Employees/EmployeeApi";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../Moduels/Context/AuthContext";

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();
  const { role } = useContext(AuthContext);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const currentPeriod = new Date().toLocaleDateString("en-IN", {
  month: "long",
  year: "numeric"
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

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {showPopup && (
        <div className="pw-popup-overlay">
          <div className="pw-popup-box">
            <div className="pw-popup-icon"><Sparkles size={22} /></div>
            <p className="pw-popup-msg">{popupMessage}</p>
            <button className="pw-popup-btn" onClick={() => setShowPopup(false)}>Got it</button>
          </div>
        </div>
      )}

      <style>{`
        /* ═══════════════════════════════════
           DASHBOARD STYLES
        ═══════════════════════════════════ */
        .dash-root { width: 100%; min-width: 0; }

        /* ── Page Header ── */
        .dash-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border, #E2E8F0);
        }
        .dash-title {
          font-family: var(--font-display, 'DM Serif Display', serif);
          font-size: 24px;
          color: var(--slate-900, #0F172A);
          letter-spacing: -0.3px;
          line-height: 1.1;
          margin-bottom: 3px;
        }
        .dash-sub {
          font-size: 13px;
          color: var(--slate-500, #64748B);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dash-sub-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--slate-300, #CBD5E1);
        }
        .dash-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dash-period-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--blue-50, #EFF6FF);
          border: 1px solid var(--blue-100, #DBEAFE);
          color: var(--blue-700, #1D4ED8);
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: var(--r-full, 999px);
        }
        .dash-period-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--green-500, #22C55E);
          animation: pulse-ring 2s ease-in-out infinite;
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .dash-run-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: linear-gradient(135deg, var(--blue-600, #2563EB), var(--blue-700, #1D4ED8));
          color: #fff;
          border: none;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: var(--r-lg, 12px);
          cursor: pointer;
          font-family: var(--font-body);
          box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          transition: all 0.2s ease;
        }
        .dash-run-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37,99,235,0.38);
        }

        /* ── KPI Cards Row ── */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px)  { .kpi-grid { grid-template-columns: 1fr; } }

        .kpi-card {
          background: var(--bg-surface, #FFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: var(--r-xl, 16px);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: var(--shadow-xs);
          transition: all 0.2s ease;
          border-top: 3px solid transparent;
          position: relative;
          overflow: hidden;
        }
        .kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md, 0 4px 16px rgba(15,23,42,0.08));
          border-color: var(--slate-200);
        }
        .kpi-card::after {
          content: "";
          position: absolute;
          bottom: 0; right: 0;
          width: 80px; height: 80px;
          border-radius: 50%;
          opacity: 0.04;
        }
        .kpi-blue   { border-top-color: var(--blue-500,   #3B82F6); }
        .kpi-green  { border-top-color: var(--green-600,  #16A34A); }
        .kpi-red    { border-top-color: var(--red-600,    #DC2626); }
        .kpi-amber  { border-top-color: var(--amber-500,  #F59E0B); }
        .kpi-blue::after   { background: var(--blue-500); }
        .kpi-green::after  { background: var(--green-500); }
        .kpi-red::after    { background: var(--red-600); }
        .kpi-amber::after  { background: var(--amber-500); }

        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .kpi-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--slate-500, #64748B);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .kpi-icon {
          width: 36px; height: 36px;
          border-radius: var(--r-md, 8px);
          display: flex; align-items: center; justify-content: center;
        }
        .kpi-value {
          font-size: 26px;
          font-weight: 700;
          color: var(--slate-900, #0F172A);
          letter-spacing: -0.5px;
          line-height: 1;
          font-family: var(--font-display, 'DM Serif Display', serif);
        }
        .kpi-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .kpi-sub {
          font-size: 11.5px;
          color: var(--slate-400, #94A3B8);
          font-weight: 500;
        }
        .kpi-trend {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
        }
        .trend-up   { background: var(--green-50, #F0FDF4);  color: var(--green-700, #15803D); }
        .trend-down { background: var(--red-50, #FEF2F2);    color: var(--red-600, #DC2626);   }
        .trend-warn { background: var(--amber-50, #FFFBEB);  color: var(--amber-700, #B45309); }

        /* ── Middle 3-col grid ── */
        .mid-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 1100px) { .mid-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 700px)  { .mid-grid { grid-template-columns: 1fr; } }

        /* ── Bottom 2-col grid ── */
        .bottom-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 900px) { .bottom-grid { grid-template-columns: 1fr; } }

        /* ── Card shell ── */
        .pw-card {
          background: var(--bg-surface, #FFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: var(--r-xl, 16px);
          box-shadow: var(--shadow-xs);
          overflow: hidden;
          transition: box-shadow 0.2s ease;
        }
        .pw-card:hover { box-shadow: var(--shadow-md, 0 4px 16px rgba(15,23,42,0.08)); }

        .pw-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px 12px;
          border-bottom: 1px solid var(--border, #E2E8F0);
        }
        .pw-card-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--slate-800, #1E293B);
        }
        .pw-card-icon {
          width: 28px; height: 28px;
          border-radius: var(--r-sm, 6px);
          display: flex; align-items: center; justify-content: center;
        }
        .pw-card-link {
          font-size: 12px;
          font-weight: 600;
          color: var(--blue-600, #2563EB);
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-body);
          display: flex; align-items: center; gap: 4px;
          transition: gap 0.15s ease;
        }
        .pw-card-link:hover { gap: 6px; }
        .pw-card-body { padding: 14px 18px; }

        /* ── Status rows ── */
        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 7px 0;
          border-bottom: 1px solid var(--border, #E2E8F0);
          font-size: 13px;
          color: var(--slate-700, #334155);
          font-weight: 500;
        }
        .status-row:last-child { border-bottom: none; }
        .status-row-label {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ── Badges ── */
        .badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .badge-success { background: var(--green-50);  color: var(--green-700);  border: 1px solid var(--green-100); }
        .badge-warning { background: var(--amber-50);  color: var(--amber-700);  border: 1px solid var(--amber-100); }
        .badge-danger  { background: var(--red-50);    color: var(--red-600);    border: 1px solid var(--red-100);   }
        .badge-info    { background: var(--blue-50);   color: var(--blue-700);   border: 1px solid var(--blue-100);  }
        .badge-teal    { background: var(--teal-50);   color: var(--teal-700);   border: 1px solid var(--teal-100);  }

        /* ── Quick Actions ── */
        .qa-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .qa-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 13px 8px;
          border-radius: var(--r-lg, 12px);
          font-size: 11.5px;
          font-weight: 600;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: center;
          font-family: var(--font-body);
        }
        .qa-btn:hover { transform: translateY(-2px); }
        .qa-btn .qa-icon {
          width: 32px; height: 32px;
          border-radius: var(--r-md, 8px);
          display: flex; align-items: center; justify-content: center;
        }
        .qa-blue   { background: var(--blue-50); border-color: var(--blue-100); color: var(--blue-700); }
        .qa-blue:hover { background: var(--blue-100); border-color: var(--blue-200); box-shadow: 0 4px 12px rgba(37,99,235,0.15); }
        .qa-green  { background: var(--green-50); border-color: var(--green-100); color: var(--green-700); }
        .qa-green:hover { background: var(--green-100); border-color: var(--green-200); box-shadow: 0 4px 12px rgba(22,163,74,0.15); }
        .qa-teal   { background: var(--teal-50); border-color: var(--teal-100); color: var(--teal-700); }
        .qa-teal:hover { background: var(--teal-100); border-color: var(--teal-200); box-shadow: 0 4px 12px rgba(14,148,136,0.15); }
        .qa-amber  { background: var(--amber-50); border-color: var(--amber-100); color: var(--amber-700); }
        .qa-amber:hover { background: var(--amber-100); box-shadow: 0 4px 12px rgba(245,158,11,0.15); }
        .qa-red    { background: var(--red-50); border-color: var(--red-100); color: var(--red-600); }
        .qa-red:hover { background: var(--red-100); box-shadow: 0 4px 12px rgba(220,38,38,0.12); }
        .qa-purple { background: var(--purple-50); border-color: var(--purple-100); color: var(--purple-600); }
        .qa-purple:hover { background: var(--purple-100); box-shadow: 0 4px 12px rgba(147,51,234,0.12); }

        /* ── Alerts ── */
        .alert-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--r-lg, 12px);
          margin-bottom: 7px;
          font-size: 12.5px;
          font-weight: 500;
          line-height: 1.45;
        }
        .alert-item:last-child { margin-bottom: 0; }
        .ai-danger   { background: var(--red-50,   #FEF2F2); color: var(--red-600,   #DC2626); border: 1px solid var(--red-100); }
        .ai-warning  { background: var(--amber-50, #FFFBEB); color: var(--amber-700, #B45309); border: 1px solid var(--amber-100); }
        .ai-info     { background: var(--blue-50,  #EFF6FF); color: var(--blue-700,  #1D4ED8); border: 1px solid var(--blue-100); }
        .alert-icon  { flex-shrink: 0; margin-top: 0px; }

        /* ── Compliance Deadlines ── */
        .compliance-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .compliance-item:last-child { border-bottom: none; }
        .compliance-icon {
          width: 32px; height: 32px;
          border-radius: var(--r-md, 8px);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 13px;
        }
        .compliance-info { flex: 1; min-width: 0; }
        .compliance-name { font-weight: 600; color: var(--slate-800); font-size: 13px; }
        .compliance-desc { font-size: 11px; color: var(--slate-400); margin-top: 1px; }
        .compliance-due  {
          font-size: 11px; font-weight: 700;
          padding: 3px 8px; border-radius: 999px;
          white-space: nowrap;
        }
        .due-red    { background: var(--red-50);   color: var(--red-600);   border: 1px solid var(--red-100); }
        .due-amber  { background: var(--amber-50); color: var(--amber-700); border: 1px solid var(--amber-100); }
        .due-green  { background: var(--green-50); color: var(--green-700); border: 1px solid var(--green-100); }

        /* ── Transaction Table ── */
        .txn-table-wrap {
          overflow-x: auto;
        }
        .txn-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .txn-table th {
          padding: 9px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: var(--slate-400, #94A3B8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--bg-subtle, #F8FAFC);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .txn-table td {
          padding: 11px 16px;
          border-bottom: 1px solid var(--border);
          color: var(--slate-700);
          vertical-align: middle;
        }
        .txn-table tr:last-child td { border-bottom: none; }
        .txn-table tbody tr {
          transition: background 0.12s ease;
          cursor: default;
        }
        .txn-table tbody tr:hover { background: var(--bg-hover, #F1F5F9); }
        .txn-emp-name { font-weight: 600; color: var(--slate-800); }
        .txn-emp-role { font-size: 11.5px; color: var(--slate-400); margin-top: 1px; }
        .txn-amount   { font-weight: 700; font-size: 13.5px; color: var(--slate-900); font-family: var(--font-display); }
        .txn-date     { color: var(--slate-400); font-size: 12px; }

        .chip {
          display: inline-flex; align-items: center;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid;
        }
        .chip-green  { background: var(--green-50); color: var(--green-700); border-color: var(--green-100); }
        .chip-blue   { background: var(--blue-50);  color: var(--blue-700);  border-color: var(--blue-100);  }
        .chip-purple { background: var(--purple-50);color: var(--purple-600);border-color: var(--purple-100);}
        .chip-amber  { background: var(--amber-50); color: var(--amber-700); border-color: var(--amber-100); }

        /* ── Payroll Progress ── */
        .progress-bar-wrap {
          height: 6px;
          background: var(--border);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 6px;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.6s var(--ease-out, ease);
        }

        /* ── Popup ── */
        .pw-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .pw-popup-box {
          background: var(--bg-surface, #FFF);
          border: 1px solid var(--border);
          padding: 28px 32px;
          border-radius: var(--r-2xl, 20px);
          text-align: center;
          min-width: 280px;
          box-shadow: var(--shadow-xl, 0 20px 44px rgba(15,23,42,0.12));
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .pw-popup-icon {
          width: 48px; height: 48px;
          border-radius: var(--r-xl, 16px);
          background: linear-gradient(135deg, var(--blue-50), var(--teal-50));
          color: var(--blue-600);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px;
          border: 1px solid var(--blue-100);
        }
        .pw-popup-msg {
          font-size: 14px;
          font-weight: 600;
          color: var(--slate-700);
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .pw-popup-btn {
          padding: 9px 24px;
          border: none;
          background: linear-gradient(135deg, var(--blue-600), var(--blue-700));
          color: #fff;
          border-radius: var(--r-lg, 12px);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-body);
          box-shadow: 0 4px 12px rgba(37,99,235,0.28);
          transition: all 0.2s ease;
        }
        .pw-popup-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37,99,235,0.35); }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .dash-header { flex-direction: column; align-items: flex-start; }
          .dash-header-right { width: 100%; }
          .qa-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="dash-root">

        {/* ── Header ── */}
        <div className="dash-header">
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
            <button className="dash-run-btn" onClick={() => handleComingSoon("Run Payroll")}>
              <Play size={13} /> Run Payroll
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="kpi-grid">
          <KpiCard
            accent="kpi-blue"
            label="Total Employees"
            value={employees.length || 0}
            sub="Across all departments"
            trend="+12 this month"
            trendType="up"
            icon={<Users size={16} />}
            iconClass="ic-blue"
          />
          <KpiCard
            accent="kpi-green"
            label="Net Pay — March"
            value="₹19.8L"
            sub="Credited 01-Mar-2025"
            trend="+3.2% vs Feb"
            trendType="up"
            icon={<IndianRupee size={16} />}
            iconClass="ic-green"
          />
          <KpiCard
            accent="kpi-red"
            label="Total Deductions"
            value="₹2.4L"
            sub="PF · ESI · TDS · PT"
            trend="↑ ₹14K vs last"
            trendType="down"
            icon={<TrendingDown size={16} />}
            iconClass="ic-red"
          />
          <KpiCard
            accent="kpi-amber"
            label="Compliance Due"
            value="7"
            sub="Returns & filings"
            trend="3 urgent"
            trendType="warn"
            icon={<ShieldCheck size={16} />}
            iconClass="ic-amber"
          />
        </div>

        {/* ── Middle Row ── */}
        <div className="mid-grid">

          {/* Payroll Status */}
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--green-50)", color: "var(--green-600)" }}>
                  <FileCheck size={14} />
                </div>
                Payroll Status
              </div>
              <span className="badge badge-info">March 2025</span>
            </div>
            <div className="pw-card-body">
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-500)" }}>Processing Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green-600)" }}>142 / 156</span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: "91%", background: "linear-gradient(90deg, var(--green-500), var(--teal-500))" }} />
                </div>
              </div>
              <StatusRow label="Salary Processed" val="142 / 156" type="success" dot="var(--green-500)" />
              <StatusRow label="Bank File"         val="Generated" type="success" dot="var(--green-500)" />
              <StatusRow label="Payslips Email"    val="Pending"   type="warning" dot="var(--amber-500)" />
              <StatusRow label="PF Return"         val="Due 14 Mar" type="danger" dot="var(--red-600)" />
              <StatusRow label="ESI Return"        val="Due 15 Mar" type="danger" dot="var(--red-600)" />
              <StatusRow label="TDS Payment"       val="Due 07 Mar" type="danger" dot="var(--red-600)" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}>
                  <Zap size={14} />
                </div>
                Quick Actions
              </div>
            </div>
            <div className="pw-card-body">
              <div className="qa-grid">
                <QaBtn
                  cls="qa-blue"
                  icon={<UserPlus size={15} />}
                  label="Add Employee"
                  onClick={() => navigate("/employeeCreate")}
                />
                <QaBtn
                  cls="qa-green"
                  icon={<FileText size={15} />}
                  label="Gen Payslip"
                  onClick={() => handleComingSoon("Payslip Generation")}
                />
                <QaBtn
                  cls="qa-teal"
                  icon={<ShieldCheck size={15} />}
                  label="Tax Decl."
                  onClick={() => handleComingSoon("Tax Declaration")}
                />
                <QaBtn
                  cls="qa-amber"
                  icon={<Download size={15} />}
                  label="Leave Import"
                  onClick={() => handleComingSoon("Leave Import")}
                />
                <QaBtn
                  cls="qa-purple"
                  icon={<TrendingUp size={15} />}
                  label="PF Report"
                  onClick={() => handleComingSoon("PF Report")}
                />
                <QaBtn
                  cls="qa-red"
                  icon={<ShieldCheck size={15} />}
                  label="ESI Report"
                  onClick={() => handleComingSoon("ESI Report")}
                />
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--red-50)", color: "var(--red-600)" }}>
                  <AlertTriangle size={14} />
                </div>
                Alerts & Issues
              </div>
              <span className="badge badge-danger">4 issues</span>
            </div>
            <div className="pw-card-body">
              <AlertItem icon={<XCircle size={13} />}   text="5 employees missing Bank Account" level="danger" />
              <AlertItem icon={<AlertCircle size={13} />} text="2 employees missing PAN number" level="warning" />
              <AlertItem icon={<XCircle size={13} />}   text="PF return filing is overdue" level="danger" />
              <AlertItem icon={<AlertCircle size={13} />} text="Professional Tax due — 20 Mar" level="warning" />
            </div>
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="bottom-grid">

          {/* Recent Transactions */}
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}>
                  <Clock size={14} />
                </div>
                Recent Transactions
              </div>
              <button className="pw-card-link">
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
                      <td><Chip text={row.action} /></td>
                      <td><span className="txn-amount">{row.amount}</span></td>
                      <td><span className="txn-date">{row.date}</span></td>
                      <td><span className={`badge ${row.status === "Completed" ? "badge-success" : row.status === "Pending" ? "badge-warning" : "badge-info"}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance Deadlines */}
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-title">
                <div className="pw-card-icon" style={{ background: "var(--amber-50)", color: "var(--amber-700)" }}>
                  <Calendar size={14} />
                </div>
                Compliance Deadlines
              </div>
            </div>
            <div className="pw-card-body">
              {COMPLIANCE_DATA.map((c, i) => (
                <div key={i} className="compliance-item">
                  <div className="compliance-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
                  <div className="compliance-info">
                    <div className="compliance-name">{c.name}</div>
                    <div className="compliance-desc">{c.desc}</div>
                  </div>
                  <span className={`compliance-due ${c.urgency}`}>{c.due}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

/* ══════════════════ SUB-COMPONENTS ══════════════════ */

function KpiCard({ accent, label, value, sub, trend, trendType, icon, iconClass }) {
  return (
    <div className={`kpi-card ${accent}`}>
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        <div className={`kpi-icon ${iconClass}`}>{icon}</div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-footer">
        <span className="kpi-sub">{sub}</span>
        <span className={`kpi-trend ${trendType === "up" ? "trend-up" : trendType === "down" ? "trend-down" : "trend-warn"}`}>
          {trendType === "up" ? <ArrowUpRight size={10} /> : trendType === "down" ? <ArrowDownRight size={10} /> : null}
          {trend}
        </span>
      </div>
    </div>
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

function AlertItem({ icon, text, level }) {
  const cls = { danger: "ai-danger", warning: "ai-warning", info: "ai-info" };
  return (
    <div className={`alert-item ${cls[level]}`}>
      <span className="alert-icon">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function QaBtn({ cls, icon, label, onClick }) {
  return (
    <button className={`qa-btn ${cls}`} onClick={onClick}>
      <div className="qa-icon">{icon}</div>
      <span>{label}</span>
    </button>
  );
}

function Chip({ text }) {
  const color = text.includes("Salary") ? "chip-green" : text.includes("Full") ? "chip-purple" : text.includes("Reim") ? "chip-amber" : "chip-blue";
  return <span className={`chip ${color}`}>{text}</span>;
}

/* ══════════════════ DATA ══════════════════ */
const TXN_DATA = [
  { emp: "Ramesh Patil",  dept: "Engineering",    action: "Salary Credited", amount: "₹48,500", date: "01 Mar 2025", status: "Completed" },
  { emp: "Priya Nair",    dept: "Finance",        action: "Reimbursement",   amount: "₹4,200",  date: "03 Mar 2025", status: "Completed" },
  { emp: "Amit Verma",    dept: "Operations",     action: "Full & Final",    amount: "₹72,900", date: "04 Mar 2025", status: "Completed" },
  { emp: "Sunita Iyer",   dept: "HR",             action: "Bonus Credit",    amount: "₹12,000", date: "05 Mar 2025", status: "Pending"   },
  { emp: "Rohan Desai",   dept: "Sales",          action: "Salary Credited", amount: "₹55,000", date: "01 Mar 2025", status: "Completed" },
];

const COMPLIANCE_DATA = [
  { icon: "📑", name: "TDS Payment",    desc: "Monthly TDS deposit",       due: "07 Mar", urgency: "due-red",   bg: "var(--red-50)",   color: "var(--red-600)"   },
  { icon: "🏦", name: "PF Return",      desc: "ECR filing for March",       due: "14 Mar", urgency: "due-red",   bg: "var(--red-50)",   color: "var(--red-600)"   },
  { icon: "🏥", name: "ESI Return",     desc: "Monthly contribution",       due: "15 Mar", urgency: "due-amber", bg: "var(--amber-50)", color: "var(--amber-700)" },
  { icon: "🗂️",  name: "Professional Tax",desc: "State PT payment",         due: "20 Mar", urgency: "due-amber", bg: "var(--amber-50)", color: "var(--amber-700)" },
  { icon: "📋", name: "Form 16",        desc: "Q4 TDS certificate issue",   due: "15 Jun", urgency: "due-green", bg: "var(--green-50)", color: "var(--green-700)" },
];
