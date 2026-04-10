import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import logo1 from "../assets/images/brixigo_logoo.png"
import { AuthContext } from "../../Moduels/Context/AuthContext";
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
  const { role } = useContext(AuthContext);
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
    if (val) {
      setSalaryOpen(false);
      setAttendanceOpen(false);
      setEmployeeOpen(false);
    }
  };

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════
           SIDEBAR DESIGN SYSTEM
        ═══════════════════════════════════════ */
        .sb {
          height: 100vh;
          width: 252px;
          background: var(--bg-surface, #FFFFFF);
          border-right: 1px solid var(--border, #E2E8F0);
          display: flex;
          flex-direction: column;
          transition: width var(--dur-slow, 300ms) var(--ease-out, ease);
          overflow: hidden;
        }
        .sb.collapsed { width: 68px; }

        /* ── Brand Header ── */
        .sb-header {
          height: var(--nav-height, 58px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          border-bottom: 1px solid var(--border, #E2E8F0);
          flex-shrink: 0;
          background: var(--bg-surface, #FFF);
        }

        .sb-brand { display: flex; align-items: center; gap: 10px; overflow: hidden; }

        .sb-logo {
          width: 32px; height: 32px;
          border-radius: var(--r-lg, 12px);
          background: linear-gradient(135deg, var(--blue-600, #2563EB), var(--blue-700, #1D4ED8));
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(37,99,235,0.30);
        }

        .sb-brand-text { overflow: hidden; white-space: nowrap; }
        .sb-brand-name {
          font-weight: 700;
          font-size: 14px;
          color: var(--slate-900, #0F172A);
          letter-spacing: -0.3px;
          line-height: 1.1;
        }
        .sb-brand-sub {
          font-size: 10px;
          color: var(--slate-400, #94A3B8);
          font-weight: 500;
          margin-top: 1px;
        }

        .sb-collapse-btn {
          width: 24px; height: 24px;
          border-radius: var(--r-sm, 6px);
          border: 1px solid var(--border, #E2E8F0);
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-surface, #FFF);
          cursor: pointer;
          color: var(--slate-400, #94A3B8);
          transition: all var(--dur-fast, 120ms) ease;
          flex-shrink: 0;
          outline: none;
        }
        .sb-collapse-btn:hover {
          background: var(--blue-50, #EFF6FF);
          border-color: var(--blue-200, #BFDBFE);
          color: var(--blue-600, #2563EB);
        }

        /* ── Navigation ── */
        .sb-nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 10px 8px 8px;
          scrollbar-width: none;
        }
        .sb-nav::-webkit-scrollbar { display: none; }

        /* Section label */
        .sb-section {
          font-size: 9px;
          font-weight: 700;
          color: var(--slate-400, #94A3B8);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 0 8px;
          margin: 16px 0 4px;
        }
        .sb.collapsed .sb-section { opacity: 0; height: 0; margin: 8px 0 4px; overflow: hidden; }

        /* Nav Item */
        .sb-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: var(--r-lg, 12px);
          font-size: 13px;
          color: var(--slate-500, #64748B);
          font-weight: 500;
          text-decoration: none;
          transition: all var(--dur-base, 200ms) ease;
          position: relative;
          white-space: nowrap;
          margin-bottom: 1px;
          border-left: 2px solid transparent;
        }
        .sb-item:hover {
          background: var(--bg-hover, #F1F5F9);
          color: var(--slate-800, #1E293B);
          border-left-color: var(--slate-200, #E2E8F0);
        }
        .sb-item.active {
          background: var(--blue-50, #EFF6FF);
          color: var(--blue-700, #1D4ED8);
          font-weight: 600;
          border-left-color: var(--blue-600, #2563EB);
        }

        /* Icon */
        .sb-icon {
          width: 28px; height: 28px;
          border-radius: var(--r-md, 8px);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all var(--dur-base, 200ms) ease;
        }

        /* Accordion */
        .sb-acc-trigger {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: var(--r-lg, 12px);
          cursor: pointer;
          border: none;
          border-left: 2px solid transparent;
          background: transparent;
          width: 100%;
          font-size: 13px;
          color: var(--slate-500, #64748B);
          font-weight: 500;
          font-family: var(--font-body, inherit);
          transition: all var(--dur-base, 200ms) ease;
          margin-bottom: 1px;
          outline: none;
          white-space: nowrap;
        }
        .sb-acc-trigger:hover {
          background: var(--bg-hover, #F1F5F9);
          color: var(--slate-800, #1E293B);
          border-left-color: var(--slate-200, #E2E8F0);
        }
        .sb-acc-trigger.open {
          color: var(--slate-800, #1E293B);
          background: var(--bg-hover, #F1F5F9);
        }

        .sb-chevron {
          margin-left: auto;
          transition: transform var(--dur-base, 200ms) ease;
          color: var(--slate-400, #94A3B8);
          flex-shrink: 0;
        }
        .sb-chevron.open { transform: rotate(180deg); }
        .sb.collapsed .sb-chevron { display: none; }

        .sb-acc-inner {
          padding-left: 12px;
          overflow: hidden;
          animation: slideAccordion 200ms ease both;
        }
        @keyframes slideAccordion {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Sub-item */
        .sb-sub {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          font-size: 12.5px;
          text-decoration: none;
          color: var(--slate-500, #64748B);
          border-radius: var(--r-md, 8px);
          font-weight: 500;
          transition: all var(--dur-fast, 120ms) ease;
          margin-bottom: 1px;
          white-space: nowrap;
        }
        .sb-sub:hover { background: var(--bg-hover, #F1F5F9); color: var(--slate-800, #1E293B); }
        .sb-sub.active {
          background: var(--blue-50, #EFF6FF);
          color: var(--blue-700, #1D4ED8);
          font-weight: 600;
        }

        /* Collapsed tooltip */
        .sb-tooltip-wrap { position: relative; }
        .sb.collapsed .sb-tooltip-wrap:hover .sb-tooltip {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }
        .sb-tooltip {
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translate(-4px, -50%);
          background: var(--slate-900, #0F172A);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: var(--r-md, 8px);
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: all var(--dur-fast, 120ms) ease;
          z-index: 300;
          box-shadow: var(--shadow-lg);
        }
        .sb-tooltip::before {
          content: "";
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: var(--slate-900, #0F172A);
        }

        /* Collapsed state — hide labels */
        .sb.collapsed .sb-brand-text,
        .sb.collapsed .sb-item span,
        .sb.collapsed .sb-acc-trigger span,
        .sb.collapsed .sb-acc-inner,
        .sb.collapsed .sb-sub { display: none; }
        .sb.collapsed .sb-item,
        .sb.collapsed .sb-acc-trigger {
          justify-content: center;
          padding: 8px;
          border-left-color: transparent !important;
        }
        .sb.collapsed .sb-item.active .sb-icon { background: var(--blue-100, #DBEAFE); }

        /* ── Footer ── */
        .sb-footer {
          padding: 10px 8px 12px;
          border-top: 1px solid var(--border, #E2E8F0);
          flex-shrink: 0;
        }
        .sb-footer-inner {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px;
          background: linear-gradient(135deg, var(--blue-50, #EFF6FF), var(--teal-50, #F0FDFA));
          border: 1px solid var(--blue-100, #DBEAFE);
          border-radius: var(--r-lg, 12px);
          overflow: hidden;
        }
        .sb-footer-icon {
          width: 28px; height: 28px;
          border-radius: var(--r-md, 8px);
          background: linear-gradient(135deg, var(--blue-600, #2563EB), var(--teal-600, #0D9488));
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
        }
        .sb-footer-title { font-size: 12px; font-weight: 700; color: var(--slate-800, #1E293B); }
        .sb-footer-sub   { font-size: 10px; color: var(--slate-500, #64748B); font-weight: 500; margin-top: 1px; }
        .sb.collapsed .sb-footer-inner { justify-content: center; padding: 8px; }
        .sb.collapsed .sb-footer-text { display: none; }

        /* Icon color tokens */
        .ic-blue   { background: var(--blue-50,   #EFF6FF); color: var(--blue-600,  #2563EB); }
        .ic-green  { background: var(--green-50,  #F0FDF4); color: var(--green-600, #16A34A); }
        .ic-teal   { background: var(--teal-50,   #F0FDFA); color: var(--teal-600,  #0D9488); }
        .ic-amber  { background: var(--amber-50,  #FFFBEB); color: var(--amber-700, #B45309); }
        .ic-red    { background: var(--red-50,    #FEF2F2); color: var(--red-600,   #DC2626); }
        .ic-purple { background: var(--purple-50, #FAF5FF); color: var(--purple-600,#9333EA); }
        .ic-slate  { background: var(--slate-100, #F1F5F9); color: var(--slate-600, #475569); }

        .sb-item.active .ic-blue   { background: var(--blue-100,   #DBEAFE); }
        .sb-item.active .ic-green  { background: var(--green-100,  #DCFCE7); }
        .sb-item.active .ic-teal   { background: var(--teal-100,   #CCFBF1); }
        .sb-item.active .ic-amber  { background: var(--amber-100,  #FEF3C7); }
        .sb-item.active .ic-purple { background: var(--purple-100, #F3E8FF); }

        @media (max-width: 1024px) {
          .sb { width: 252px !important; }
        }
      `}</style>

      <aside className={`sb ${mobileOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        {/* Header */}
        <div className="sb-header">
          <div className="sb-brand">
           
            <div className="sb-brand-text">
               <img
                src={logo1}
                alt="Brixigo"
                style={{
                  height: 50,
                  width: "auto",
                  objectFit: "contain"
                }}
              />
            </div>
          </div>
          <button className="sb-collapse-btn" onClick={() => handleCollapse(!collapsed)} title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sb-nav">
          <div className="sb-section">Overview</div>

          <SbItem to="/dashboard" label="Dashboard" icon={<Home size={14} />} color="ic-blue" collapsed={collapsed} />

          {role !== "employee" && <div className="sb-section">Payroll</div>}

          {role !== "employee" && (
            <SbAccordion label="Salary Setup" icon={<Layers size={14} />} color="ic-red" open={salaryOpen && !collapsed} onToggle={() => !collapsed && setSalaryOpen(!salaryOpen)} collapsed={collapsed}>
              <SbSub to="/salary/components" label="Components" icon={<Layers size={12} />} color="ic-red" />
              <SbSub to="/salary/templates"  label="Templates"  icon={<FileText size={12} />} color="ic-purple" />
            </SbAccordion>
          )}

          {role !== "employee" && (
            <SbItem to="/payrollhome" label="Pay Runs" icon={<Wallet size={14} />} color="ic-blue" collapsed={collapsed} />
          )}

          <div className="sb-section">Workforce</div>

          <SbAccordion label="Attendance" icon={<Calendar size={14} />} color="ic-teal" open={attendanceOpen && !collapsed} onToggle={() => !collapsed && setAttendanceOpen(!attendanceOpen)} collapsed={collapsed}>
            <SbSub to="/attendance"              label="Attendance"      icon={<Calendar size={12} />}    color="ic-teal" />
            <SbSub to="/attendance-summary"      label="Summary"         icon={<FileText size={12} />}    color="ic-blue" />
            <SbSub to="/attendance-table"        label="Attendance Table"icon={<Layers size={12} />}      color="ic-slate" />
            <SbSub to="/attendance/leave-request"label="Leave Requests"  icon={<Users size={12} />}       color="ic-amber" />
            <SbSub to="/leave-approval"          label="Leave Approval"  icon={<CheckCircle size={12} />} color="ic-green" />
          </SbAccordion>

          
          {role !== "employee" && (
            <SbAccordion label="Employee" icon={<Users size={14} />} color="ic-blue" open={employeeOpen && !collapsed} onToggle={() => !collapsed && setEmployeeOpen(!employeeOpen)} collapsed={collapsed}>
              {role === "admin" && <SbSub to="/Setup" label="Initial Setup" icon={<Zap size={12} />} color="ic-red" />}
              <SbSub to="/employeeList"        label="Employee List" icon={<Users size={12} />}     color="ic-blue" />
              <SbSub to="/employeeCreate"      label="Add Employee"  icon={<UserCheck size={12} />} color="ic-green" />
              <SbSub to="/employeebulkupload"  label="Bulk Upload"   icon={<Upload size={12} />}    color="ic-amber" />
            </SbAccordion>
          )}

          {role !== "employee" && <div className="sb-section">Finance & Compliance</div>}

          {role !== "employee" && (
            <>
              <SbItem to="/bank"         label="Bank Requests"  icon={<Wallet size={14} />}      color="ic-blue"   collapsed={collapsed} />
              <SbItem to="/approvals"    label="Approvals"      icon={<CheckCircle size={14} />} color="ic-green"  collapsed={collapsed} />
              <SbItem to="/loans"        label="Loans"          icon={<Briefcase size={14} />}   color="ic-amber"  collapsed={collapsed} />
              {role === "admin" && <SbItem to="/audit"        label="Audit Logs"     icon={<Shield size={14} />}      color="ic-red"    collapsed={collapsed} />}
              <SbItem to="/statutorytax" label="Statutory & Tax"icon={<FileText size={14} />}    color="ic-purple" collapsed={collapsed} />
            </>
          )}

          <div className="sb-section">Support</div>

          <SbItem to="/noticeboard" label="Notice Board"  icon={<Bell size={14} />}       color="ic-amber" collapsed={collapsed} />
          <SbItem to="/help"        label="Help & Support" icon={<HelpCircle size={14} />} color="ic-slate" collapsed={collapsed} />
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <div className="sb-footer-inner">
            
            {!collapsed && (         
               <img
                src={logo1}
                alt="Brixigo"
                style={{
                  height: 40,
                  width: "auto",
                  objectFit: "contain"
                }}
              />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── Sub-components ── */
function SbItem({ to, label, icon, color, collapsed }) {
  return (
    <div className="sb-tooltip-wrap">
      <NavLink to={to} className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
        <div className={`sb-icon ${color}`}>{icon}</div>
        <span>{label}</span>
      </NavLink>
      {collapsed && <div className="sb-tooltip">{label}</div>}
    </div>
  );
}

function SbAccordion({ label, icon, color, open, onToggle, children, collapsed }) {
  return (
    <div className="sb-tooltip-wrap">
      <button className={`sb-acc-trigger ${open ? "open" : ""}`} onClick={onToggle}>
        <div className={`sb-icon ${color}`}>{icon}</div>
        <span>{label}</span>
        <ChevronDown size={12} className={`sb-chevron ${open ? "open" : ""}`} />
      </button>
      {open && !collapsed && <div className="sb-acc-inner">{children}</div>}
      {collapsed && <div className="sb-tooltip">{label}</div>}
    </div>
  );
}

function SbSub({ to, label, icon, color }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sb-sub ${isActive ? "active" : ""}`}>
      <div className={`sb-icon ${color}`} style={{ width: 22, height: 22, borderRadius: "6px" }}>{icon}</div>
      <span>{label}</span>
    </NavLink>
  );
}
