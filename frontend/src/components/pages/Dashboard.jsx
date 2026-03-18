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
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getEmployees } from "../../Moduels/Employees/EmployeeApi";

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployees();
        setEmployees(data);
      } catch (error) {
        console.error("Error loading employees", error);
      }
    };
    fetchEmployees();
  }, []);

  return (
    <>
      <style>{`
        .dash-root { width: 100%; }

        /* ── Page Header ── */
        .dash-header {
          margin-bottom: 28px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .dash-title {
          font-size: 26px;
          font-weight: 800;
          color: #1C1507;
          letter-spacing: -0.5px;
        }
        .dash-sub {
          font-size: 13px;
          color: #a34a4a;
          margin-top: 2px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dash-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: linear-gradient(135deg, #ffffff, #f33737);
          color: #920e0e;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #fc4d4d;
        }

        /* ── Stat Cards ── */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px)  { .stat-grid { grid-template-columns: 1fr; } }

        .stat-card {
          border-radius: 16px;
          padding: 20px;
          color: #fff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(0,0,0,0.10);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.14);
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 110px; height: 110px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
        }
        .stat-card::after {
          content: '';
          position: absolute;
          bottom: -20px; right: 20px;
          width: 70px; height: 70px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }
        .stat-icon-wrap {
          width: 44px; height: 44px;
          background: rgba(255,255,255,0.22);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .stat-label { font-size: 12px; opacity: 0.88; font-weight: 600; margin-bottom: 4px; }
        .stat-value { font-size: 28px; font-weight: 800; line-height: 1; letter-spacing: -0.5px; margin-bottom: 6px; }
        .stat-sub   { font-size: 11px; opacity: 0.78; font-weight: 500; }

        .sc-amber  { background: linear-gradient(135deg, #d8d059 0%, #f9ea16 100%); }
        .sc-green  { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }
        .sc-rose   { background: linear-gradient(135deg, #F43F5E 0%, #DC2626 100%); }
        .sc-blue   { background: linear-gradient(135deg, #3B82F6 0%, #0EA5E9 100%); }

        /* ── Section Grid ── */
        .section-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 1100px) { .section-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px)  { .section-grid { grid-template-columns: 1fr; } }

        .card {
          background: #fff;
          border-radius: 16px;
          border: 1.5px solid #F0E4C0;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(180,83,9,0.05);
          transition: box-shadow 0.2s ease;
        }
        .card:hover { box-shadow: 0 6px 20px rgba(180,83,9,0.09); }

        .card-head {
          padding: 14px 16px;
          border-bottom: 1.5px solid #ffffff;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 13.5px;
          color: #1C1507;
        }
        .card-head-icon {
          width: 30px; height: 30px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
        }
        .card-body { padding: 14px 16px; }

        /* Status rows */
        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #feecf4;
          font-size: 13px;
          color: #5c1e33;
          font-weight: 500;
        }
        .status-row:last-child { border-bottom: none; }

        .badge {
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .badge-success { background: #D1FAE5; color: #065F46; }
        .badge-warning { background: #FEF3C7; color: #92400E; }
        .badge-danger  { background: #FEE2E2; color: #991B1B; }
        .badge-info    { background: #DBEAFE; color: #1E40AF; }

        /* Quick Actions */
        .action-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .action-btn {
          border-radius: 10px;
          padding: 10px 6px;
          font-size: 11.5px;
          font-weight: 600;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .ab-amber  { background: #ffebf9; border-color: #fd8ac0; color: #920e36; }
        .ab-amber:hover { background: #fec7f9; border-color: #f50b8c; }
        .ab-red { background: #FFF7ED; border-color: #FDBA74; color: #C2410C; }
        .ab-red:hover { background: #FFEDD5; border-color: #F97316; }
        .ab-green  { background: #F0FDF4; border-color: #BBF7D0; color: #166534; }

        .ab-green:hover { background: #DCFCE7; border-color: #4ADE80; }
        .ab-blue   { background: #EFF6FF; border-color: #BFDBFE; color: #1D4ED8; }
        .ab-blue:hover { background: #DBEAFE; border-color: #60A5FA; }
        .ab-purple { background: #FAF5FF; border-color: #E9D5FF; color: #7E22CE; }
        .ab-purple:hover { background: #F3E8FF; border-color: #C084FC; }
        .ab-rose   { background: #FFF1F2; border-color: #FECDD3; color: #BE123C; }
        .ab-rose:hover { background: #FFE4E6; border-color: #FDA4AF; }

        /* Alerts */
        .alert-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          border: 1.5px solid transparent;
          margin-bottom: 7px;
        }
        .alert-item:last-child { margin-bottom: 0; }
        .alert-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
        .ai-danger  { background: #FFF1F2; border-color: #FECDD3; color: #BE123C; }
        .ai-danger .alert-dot { background: #F43F5E; }
        .ai-warning { background: #FFFBEB; border-color: #FDE68A; color: #92400E; }
        .ai-warning .alert-dot { background: #F59E0B; }
        .ai-info    { background: #EFF6FF; border-color: #BFDBFE; color: #1D4ED8; }
        .ai-info .alert-dot { background: #3B82F6; }

        /* ── Transactions Table ── */
        .txn-card {
          background: #fff;
          border-radius: 16px;
          border: 1.5px solid #F0E4C0;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(180,83,9,0.05);
        }
        .txn-head {
          padding: 14px 20px;
          background: linear-gradient(135deg, #f09696, #f09696);
          display: flex;
          align-items: center;
          gap: 8px;
          color: #000000;
          font-weight: 700;
          font-size: 14px;
        }
        .txn-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .txn-table thead tr {
          background: #FFFBEB;
        }
        .txn-table thead th {
          padding: 11px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #a34a4a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1.5px solid #FEF3C7;
        }
        .txn-table tbody tr {
          border-bottom: 1px solid #FEF9EC;
          transition: background 0.12s ease;
        }
        .txn-table tbody tr:last-child { border-bottom: none; }
        .txn-table tbody tr:hover { background: #ffffff; }
        .txn-table td { padding: 12px 16px; color: #3D2C0E; font-weight: 500; }
        .txn-emp { font-weight: 700; color: #1C1507; }

        .chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .chip-green  { background: #D1FAE5; color: #065F46; }
        .chip-purple { background: #EDE9FE; color: #5B21B6; }
        .chip-blue   { background: #DBEAFE; color: #1E40AF; }

        .amount-chip { background: #FEF3C7; color: #92400E; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 13px; border: 1px solid #FDE68A; }

        .txn-date { color: #A38A4A; font-size: 12px; }
      `}</style>

      <div className="dash-root">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">BrixiGo Dashboard</h1>
            <p className="dash-sub">India Compliance — PF · ESI · TDS · Professional Tax</p>
          </div>
          <div className="dash-badge">
            <Sparkles size={11} />
            March 2025 Active
          </div>
        </div>

        {/* Stat Cards */}
        <div className="stat-grid">
          <div className="stat-card sc-amber">
            <div className="stat-icon-wrap"><Users size={22} /></div>
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{employees.length || 0}</div>
            <div className="stat-sub">↑ 12 new this month</div>
          </div>
          <div className="stat-card sc-green">
            <div className="stat-icon-wrap"><IndianRupee size={22} /></div>
            <div className="stat-label">Net Pay – Feb</div>
            <div className="stat-value">₹19.8L</div>
            <div className="stat-sub">Credited 01-Feb-2025</div>
          </div>
          <div className="stat-card sc-rose">
            <div className="stat-icon-wrap"><TrendingDown size={22} /></div>
            <div className="stat-label">Total Deductions</div>
            <div className="stat-value">₹2.4L</div>
            <div className="stat-sub">PF · ESI · TDS · PT</div>
          </div>
          <div className="stat-card sc-blue">
            <div className="stat-icon-wrap"><ShieldCheck size={22} /></div>
            <div className="stat-label">Compliance Due</div>
            <div className="stat-value">7</div>
            <div className="stat-sub">Returns & Filings</div>
          </div>
        </div>

        {/* Middle sections */}
        <div className="section-grid">
          {/* Payroll Status */}
          <div className="card">
            <div className="card-head">
              <div className="card-head-icon" style={{ background: "#ffffff", color: "#d90606" }}>
                <FileCheck size={15} />
              </div>
              Payroll Status
            </div>
            <div className="card-body">
              <StatusRow label="Salary Processed" val="142 / 156" type="success" />
              <StatusRow label="Bank File" val="Generated" type="success" />
              <StatusRow label="Payslips Email" val="Pending" type="warning" />
              <StatusRow label="PF Return" val="Due 14 Feb" type="danger" />
              <StatusRow label="ESI Return" val="Due 15 Feb" type="danger" />
              <StatusRow label="TDS Payment" val="Due 07 Feb" type="danger" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-head">
              <div className="card-head-icon" style={{ background: "#ffffff", color: "#ea0c0c" }}>
                <Zap size={15} />
              </div>
              Quick Actions
            </div>
            <div className="card-body">
              <div className="action-grid">
                <button className="action-btn ab-amber">Add Employee</button>
                <button className="action-btn ab-green">Gen Payslip</button>
                <button className="action-btn ab-blue">Tax Decl.</button>
                <button className="action-btn ab-red">Leave Import</button>
                <button className="action-btn ab-purple">PF Report</button>
                <button className="action-btn ab-rose">ESI Report</button>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="card">
            <div className="card-head">
              <div className="card-head-icon" style={{ background: "#ffffff", color: "#E11D48" }}>
                <AlertTriangle size={15} />
              </div>
              Alerts
            </div>
            <div className="card-body">
              <AlertBox text="5 employees missing Bank Account" level="danger" />
              <AlertBox text="2 employees missing PAN" level="warning" />
              <AlertBox text="PF return pending" level="danger" />
              <AlertBox text="PT due 20 Feb" level="info" />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="txn-card">
          <div className="txn-head">
            <Clock size={16} />
            Recent Transactions
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="txn-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Action</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a, i) => (
                  <tr key={i}>
                    <td className="txn-emp">{a.emp}</td>
                    <td><Chip text={a.action} /></td>
                    <td><span className="amount-chip">{a.amount}</span></td>
                    <td className="txn-date">{a.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Reusable helpers ── */
function StatusRow({ label, val, type }) {
  const cls = {
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    info: "badge-info",
  };
  return (
    <div className="status-row">
      <span>{label}</span>
      <span className={`badge ${cls[type]}`}>{val}</span>
    </div>
  );
}

function AlertBox({ text, level }) {
  const cls = { danger: "ai-danger", warning: "ai-warning", info: "ai-info" };
  return (
    <div className={`alert-item ${cls[level]}`}>
      <div className="alert-dot" />
      {text}
    </div>
  );
}

function Chip({ text }) {
  const color = text.includes("Salary")
    ? "chip-green"
    : text.includes("Full")
    ? "chip-purple"
    : "chip-blue";
  return <span className={`chip ${color}`}>{text}</span>;
}

const data = [
  { emp: "Ramesh Patil",  action: "Salary Credited", amount: "₹48,500", date: "02 Feb 2025" },
  { emp: "Priya Nair",    action: "Reimbursement",   amount: "₹4,200",  date: "03 Feb 2025" },
  { emp: "Amit Verma",    action: "Full & Final",     amount: "₹72,900", date: "04 Feb 2025" },
];
