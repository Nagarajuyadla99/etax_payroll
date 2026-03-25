import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Home,
  Users,
  Wallet,
  Briefcase,
  CheckCircle,
  Calendar,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Shield,
  FileText,
  Upload,
  UserCheck,
  ChevronDown,
  Zap,
  Bell
} from "lucide-react";

export default function Sidebar({ mobileOpen, onCollapsedChange }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(location.pathname.startsWith("/salary"));
  const [attendanceOpen, setAttendanceOpen] = useState(location.pathname.startsWith("/attendance"));
  const [employeeOpen, setEmployeeOpen] = useState(location.pathname.startsWith("/employee"));

  useEffect(() => {
    if (location.pathname.startsWith("/salary")) setSalaryOpen(true);
    if (location.pathname.startsWith("/attendance")) setAttendanceOpen(true);
    if (location.pathname.startsWith("/employee")) setEmployeeOpen(true);
  }, [location.pathname]);

  const handleCollapse = (val) => {
    setCollapsed(val);
    onCollapsedChange?.(val);
  };

  return (
    <>
      <style>{`
      :root {
        --bg-sidebar: #FFFFFF;
        --bg-hover: #F1F5F9;
        --bg-active: #EFF6FF;

        --text-primary: #0F172A;
        --text-secondary: #64748B;

        --blue-600: #2563EB;
        --blue-500: #3B82F6;
       --blue-50: #EFF6FF;

      --teal-500: #14B8A6;
      --green-500: #22C55E;
      --amber-500: #F59E0B;
      --red-500: #EF4444;

      --border: #E2E8F0;
}
        .sb {
  height: 100vh;
  width: 260px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
}

        /* ── Header ── */
        .sb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 14px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(135deg, #ffffff 0%, #FFFFFF 100%);
        }

        .sb-brand { display: flex; align-items: center; gap: 10px; }

        .sb-logo {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--blue-600), var(--blue-500));
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          
          box-shadow: 0 4px 10px rgba(245, 11, 11, 0.35);
          flex-shrink: 0;
        }

        .sb-brand-name {
          font-weight: 800;
          font-size: 14.5px;
          color: var(--text-primary);
          letter-spacing: -0.3px;
        }

        .sb-brand-sub {
          font-size: 10.5px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .sb-collapse-btn {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          border: 1.5px solid #f0c0c0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5acac;
          cursor: pointer;
          color: #a34a4a;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .sb-collapse-btn:hover {
          background: #fec7c7;
          border-color: #f50b0b;
          color: #f50b0b;
        }

        /* ── Nav ── */
        .sb-nav {
          flex: 1;
          overflow-y: auto;
          padding: 10px 8px;
          scrollbar-width: none;
        }
        .sb-nav::-webkit-scrollbar { display: none; }

        .sb-section {
          font-size: 9.5px;
          font-weight: 700;
          color: #000000;
          margin-top: 14px;
          margin-bottom: 4px;
          padding-left: 10px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .sb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  transition: all 0.2s ease;
}
        .sb-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sb-item.active {
  background: var(--bg-active);
  color: var(--blue-600);
  font-weight: 600;

  box-shadow: 0 2px 8px rgba(245, 11, 62, 0.15);
        }

        .sb-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Accordion trigger */
        .sb-acc-trigger {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 10px;
          border-radius: 10px;
          cursor: pointer;
          border: none;
          background: transparent;
          width: 100%;
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.15s ease;
          margin-bottom: 1px;
        }
        background: var(--bg-hover);
        color: var(--text-primary);

        .sb-chevron { margin-left: auto; transition: transform .2s; color: #c47d7d; }
        .sb-chevron.open { transform: rotate(180deg); }

        .sb-acc-inner { padding-left: 28px; margin-bottom: 2px; }

        .sb-sub {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          font-size: 12px;
          text-decoration: none;
          color: var(--text-secondary);
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.15s ease;
          margin-bottom: 1px;
        }
        .sb-sub:hover {  background: var(--bg-hover); }
        .sb-sub.active {
          background: var(--bg-active);
          color: var(--blue-600);
          font-weight: 700;
        }

        /* Footer */
        .sb-footer {
          padding: 10px 10px 14px;
          border-top: 1px solid var(--border);
        }

        .sb-footer-badge {
          display: flex;
          gap: 9px;
          background: var(--bg-hover);
          border: 1px solid var(--border);
          padding: 10px 12px;
        
          align-items: center;
          border: 1px solid #fd8a8a;
        }

        .sb-footer-badge-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, #f50b0b, #f91616);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 3px 8px rgba(245, 11, 11, 0.3);
        }

        .sb-footer-title { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
        .sb-footer-sub { font-size: 10.5px;color: var(--text-secondary); font-weight: 500; }

        /* ── Icon Color Tokens ── */
        .ic-blue   { background: #EFF6FF; color: #2563EB; }
        .ic-green  { background: #F0FDF4; color: #16A34A; }
        .ic-teal   { background: #F0FDFA; color: #0D9488; }
        .ic-amber  { background: #FFFBEB; color: #D97706; }
        .ic-red    { background: #FEF2F2; color: #DC2626; }
        .ic-purple { background: #FAF5FF; color: #9333EA; }
        .ic-slate  { background: #F8FAFC; color: #475569; }
        .sb.collapsed {
        width: 72px;
         }

          .sb.collapsed .sb-brand-name,
          .sb.collapsed .sb-brand-sub,
          .sb.collapsed span,
          .sb.collapsed .sb-section,
          .sb.collapsed .sb-chevron {
          display: none;
}
/* Mobile */
@media (max-width: 768px) {
  .sb {
    position: fixed;
    left: -100%;
    top: 0;
    z-index: 1000;
    height: 100%;
  }

  .sb.open {
    left: 0;
  }

  .sb-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 999;
  }
}
      `}</style>

      {mobileOpen && <div className="sb-overlay" onClick={() => onCollapsedChange?.(false)} />}

       <aside className={`sb ${mobileOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="sb-header">
          <div className="sb-brand">
            <div className="sb-logo">
              <Zap size={17} />
            </div>
            {!collapsed && (
              <div>
                <div className="sb-brand-name">BrixiGo</div>
                <div className="sb-brand-sub">Management System</div>
              </div>
            )}
          </div>
          <button className="sb-collapse-btn" onClick={() => handleCollapse(!collapsed)}>
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        <nav className="sb-nav">
          <div className="sb-section">Main</div>

          <SbItem to="/dashboard" label="Home" icon={<Home size={15} />} color="ic-amber" />

          <div className="sb-section">Payroll</div>

          <SbAccordion label="Salary Setup" icon={<Layers size={15} />} color="ic-red" open={salaryOpen} onToggle={() => setSalaryOpen(!salaryOpen)}>
            <SbSub to="/salary/components" label="Components" icon={<Layers size={13} />} color="ic-red" />
            <SbSub to="/salary/templates" label="Templates" icon={<FileText size={13} />} color="ic-purple" />
          </SbAccordion>

          <SbItem to="/payrollhome" label="Pay Runs" icon={<Wallet size={15} />} color="ic-yellow" />

          <div className="sb-section">Workforce</div>

          <SbAccordion label="Attendance" icon={<Calendar size={15} />} color="ic-teal" open={attendanceOpen} onToggle={() => setAttendanceOpen(!attendanceOpen)}>
            <SbSub to="/attendance" label="Attendance" icon={<Calendar size={13} />} color="ic-teal" />
            <SbSub to="/attendance-summary" label="Summary" icon={<FileText size={13} />} color="ic-blue" />
            <SbSub to="/attendance-table" label="Attendance Table" icon={<Layers size={13} />} color="ic-sky" />
            <SbSub to="/attendance/leave-request" label="Leave Requests" icon={<Users size={13} />} color="ic-rose" />
            <SbSub to="/leave-approval" label="Leave Approval" icon={<CheckCircle size={13} />} color="ic-green" />
          </SbAccordion>

          <SbAccordion label="Employee" icon={<Users size={15} />} color="ic-blue" open={employeeOpen} onToggle={() => setEmployeeOpen(!employeeOpen)}>
            <SbSub to="/employeeList" label="Employee List" icon={<Users size={13} />} color="ic-blue" />
            <SbSub to="/employeeCreate" label="Add Employee" icon={<UserCheck size={13} />} color="ic-green" />
            <SbSub to="/employeebulkupload" label="Bulk Upload" icon={<Upload size={13} />} color="ic-rose" />
          </SbAccordion>

          <div className="sb-section">Finance & Compliance</div>

          <SbItem to="/bank" label="Bank Requests" icon={<Wallet size={15} />} color="ic-blue" />
          <SbItem to="/approvals" label="Approvals" icon={<CheckCircle size={15} />} color="ic-green" />
          <SbItem to="/loans" label="Loans" icon={<Briefcase size={15} />} color="ic-red" />
          <SbItem to="/audit" label="Audit Logs" icon={<Shield size={15} />} color="ic-red" />
          <SbItem to="/statutorytax" label="Statutory & Tax" icon={<FileText size={15} />} color="ic-purple" />

          <div className="sb-section">Support</div>

          <SbItem to="/noticeboard" label="Notice Board" icon={<Bell size={15} />} color="ic-amber" />
          <SbItem to="/help" label="Help & Support" icon={<HelpCircle size={15} />} color="ic-slate" />
        </nav>

        <div className="sb-footer">
          <div className="sb-footer-badge">
            <div className="sb-footer-badge-icon">
              <Zap size={14} />
            </div>
            {!collapsed && (
              <div>
                <div className="sb-footer-title">BrixiGo</div>
                <div className="sb-footer-sub">Payroll Management System</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function SbItem({ to, label, icon, color }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
      <div className={`sb-icon ${color}`}>{icon}</div>
      <span>{label}</span>
    </NavLink>
  );
}

function SbAccordion({ label, icon, color, open, onToggle, children }) {
  return (
    <div>
      <button className="sb-acc-trigger" onClick={onToggle}>
        <div className={`sb-icon ${color}`}>{icon}</div>
        {label}
        <ChevronDown size={13} className={`sb-chevron ${open ? "open" : ""}`} />
      </button>
      {open && <div className="sb-acc-inner">{children}</div>}
    </div>
  );
}

function SbSub({ to, label, icon, color }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sb-sub ${isActive ? "active" : ""}`}>
      <div className={`sb-icon ${color}`} style={{ width: 22, height: 22, borderRadius: 6 }}>{icon}</div>
      <span>{label}</span>
    </NavLink>
  );
}
