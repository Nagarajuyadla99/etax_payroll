import { NavLink, useLocation } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import logo1 from "../assets/images/brixigo_logoo.png";
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
  Bell,
  X,
} from "lucide-react";

const ICONS = {
  home: Home,
  users: Users,
  wallet: Wallet,
  briefcase: Briefcase,
  "check-circle": CheckCircle,
  calendar: Calendar,
  "help-circle": HelpCircle,
  layers: Layers,
  shield: Shield,
  "file-text": FileText,
  upload: Upload,
  "user-check": UserCheck,
  zap: Zap,
  bell: Bell,
};

export const SIDEBAR_CONFIG = [
  {
    section: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "home", path: "/dashboard", color: "ic-blue" },
    ],
  },
  {
    section: "Payroll",
    roles: ["admin", "hr"],
    items: [
      {
        key: "salary_setup",
        label: "Salary Setup",
        icon: "layers",
        color: "ic-red",
        children: [
          { key: "salary_components", label: "Components", icon: "layers", path: "/salary/components", color: "ic-red" },
          { key: "salary_templates", label: "Templates", icon: "file-text", path: "/salary/templates", color: "ic-purple" },
        ],
      },
      { key: "pay_runs", label: "Pay Runs", icon: "wallet", path: "/payrollhome", color: "ic-blue" },
    ],
  },
  {
    section: "Workforce",
    items: [
      {
        key: "attendance",
        label: "Attendance",
        icon: "calendar",
        color: "ic-teal",
        children: [
          { key: "attendance_main", label: "Attendance", icon: "calendar", path: "/attendance", color: "ic-teal" },
          { key: "attendance_summary", label: "Summary", icon: "file-text", path: "/attendanceSummary", color: "ic-blue" },
          { key: "attendance_table", label: "Attendance Table", icon: "layers", path: "/attendanceTable", color: "ic-slate" },
          { key: "leave_approval", label: "Leave Approval", icon: "check-circle", path: "/leaveApproval", color: "ic-green" },
        ],
      },
      {
        key: "employee",
        label: "Employee",
        icon: "users",
        color: "ic-blue",
        roles: ["admin", "hr"],
        children: [
          { key: "initial_setup", label: "Initial Setup", icon: "zap", path: "/Setup", color: "ic-red", roles: ["admin"] },
          { key: "employee_list", label: "Employee List", icon: "users", path: "/employeeList", color: "ic-blue" },
          { key: "employee_input", label: "Employee Input", icon: "user-check", path: "/employeeInput", color: "ic-green" },
        ],
      },
    ],
  },
  {
    section: "Finance & Compliance",
    roles: ["admin", "hr"],
    items: [
      { key: "bank_requests", label: "Bank Requests", icon: "wallet", path: "/bank", color: "ic-blue" },
      { key: "approvals", label: "Approvals", icon: "check-circle", path: "/approvals", color: "ic-green" },
      { key: "loans", label: "Loans", icon: "briefcase", path: "/loans", color: "ic-amber" },
      { key: "audit_logs", label: "Audit Logs", icon: "shield", path: "/audit", color: "ic-red", roles: ["admin"] },
      { key: "statutory_tax", label: "Statutory & Tax", icon: "file-text", path: "/statutorytax", color: "ic-purple" },
    ],
  },
  {
    section: "Support",
    items: [
      { key: "notice_board", label: "Notice Board", icon: "bell", path: "/noticeboard", color: "ic-amber" },
      { key: "help", label: "Help & Support", icon: "help-circle", path: "/help", color: "ic-slate" },
    ],
  },
];

function validateSidebar(config) {
  const seenKeys = new Set();
  const duplicates = new Set();

  const walk = (items) => {
    for (const item of items) {
      if (!item?.key) continue;
      if (seenKeys.has(item.key)) {
        duplicates.add(item.key);
        console.warn("Duplicate sidebar key:", item.key);
        continue;
      }
      seenKeys.add(item.key);
      if (Array.isArray(item.children)) walk(item.children);
    }
  };

  for (const section of config) {
    if (Array.isArray(section?.items)) walk(section.items);
  }

  return { duplicates };
}

function filterUniqueSidebar(config) {
  const seenKeys = new Set();

  const filterItems = (items) =>
    items
      .filter((it) => {
        if (!it?.key) return false;
        if (seenKeys.has(it.key)) return false;
        seenKeys.add(it.key);
        return true;
      })
      .map((it) => {
        const children = Array.isArray(it.children) ? filterItems(it.children) : undefined;
        return children ? { ...it, children } : it;
      });

  return config
    .map((section) => ({
      ...section,
      items: Array.isArray(section.items) ? filterItems(section.items) : [],
    }))
    .filter((section) => section.items.length > 0);
}

// Validate once on module load, then ensure duplicates never render.
validateSidebar(SIDEBAR_CONFIG);

export default function Sidebar({ mobileOpen, onCollapsedChange, onRequestClose }) {
  const location = useLocation();
  const { role } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  const config = useMemo(() => {
    const roleFiltered = SIDEBAR_CONFIG
      .map((section) => {
        if (Array.isArray(section.roles) && !section.roles.includes(role)) return null;
        const items = (section.items || []).filter(Boolean);
        return { ...section, items };
      })
      .filter(Boolean);

    const applyRoles = (items) =>
      items
        .filter((it) => !Array.isArray(it.roles) || it.roles.includes(role))
        .map((it) => {
          const children = Array.isArray(it.children) ? applyRoles(it.children) : undefined;
          return children ? { ...it, children } : it;
        })
        .filter((it) => !it.children || it.children.length > 0);

    const withRoles = roleFiltered.map((section) => ({
      ...section,
      items: applyRoles(section.items || []),
    }));

    return filterUniqueSidebar(withRoles);
  }, [role]);

  useEffect(() => {
    // Open accordion if current route is inside it
    const next = {};
    const pathname = location.pathname;

    const markOpen = (items) => {
      for (const item of items) {
        if (Array.isArray(item.children) && item.children.length) {
          const anyChildActive = item.children.some(
            (c) => pathname === c.path || (c.path && pathname.startsWith(c.path + "/"))
          );
          if (anyChildActive) next[item.key] = true;
          markOpen(item.children);
        }
      }
    };

    for (const section of config) markOpen(section.items || []);
    setOpenMenus((prev) => ({ ...prev, ...next }));
  }, [location.pathname, config]);

  const handleCollapse = (val) => {
    setCollapsed(val);
    onCollapsedChange?.(val);
    if (val) {
      setOpenMenus({});
    }
  };

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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

        .sb-close-btn {
          width: 32px; height: 32px;
          border-radius: var(--r-md, 8px);
          border: 1px solid var(--border, #E2E8F0);
          display: none;
          align-items: center;
          justify-content: center;
          background: var(--bg-surface, #FFF);
          cursor: pointer;
          color: var(--slate-500, #64748B);
          transition: all var(--dur-fast, 120ms) ease;
          flex-shrink: 0;
          outline: none;
        }
        .sb-close-btn:hover { background: var(--bg-hover, #F1F5F9); color: var(--slate-800, #1E293B); }

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
          transform: translateX(4px);
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
        .sb-item:hover .sb-icon,
        .sb-acc-trigger:hover .sb-icon {
          transform: scale(1.04);
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
          transform-origin: top;
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
        .sb-sub:hover { transform: translateX(4px); }
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

        @media (max-width: 768px) {
          .sb-collapse-btn { display: none; }
          .sb-close-btn { display: inline-flex; }
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
          <button
            className="sb-close-btn"
            onClick={() => onRequestClose?.()}
            title="Close"
            aria-label="Close menu"
            type="button"
          >
            <X size={14} />
          </button>
          <button className="sb-collapse-btn" onClick={() => handleCollapse(!collapsed)} title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sb-nav" onClick={(e) => {
          const a = e.target?.closest?.("a");
          if (a && mobileOpen) onRequestClose?.();
        }}>
          {config.map((section) => (
            <div key={section.section}>
              <div className="sb-section">{section.section}</div>

              {(section.items || []).map((item) => (
                <SidebarNode
                  key={item.key}
                  item={item}
                  collapsed={collapsed}
                  openMenus={openMenus}
                  onToggle={toggleMenu}
                />
              ))}
            </div>
          ))}
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
function SidebarNode({ item, collapsed, openMenus, onToggle }) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  if (hasChildren) {
    return (
      <SbAccordion
        item={item}
        open={!!openMenus[item.key] && !collapsed}
        onToggle={() => !collapsed && onToggle(item.key)}
        collapsed={collapsed}
      />
    );
  }

  return (
    <SbItem
      to={item.path}
      label={item.label}
      iconName={item.icon}
      color={item.color}
      collapsed={collapsed}
    />
  );
}

function SbItem({ to, label, iconName, color, collapsed }) {
  const Icon = ICONS[iconName] || FileText;
  return (
    <div className="sb-tooltip-wrap">
      <NavLink to={to} className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
        <div className={`sb-icon ${color}`}>
          <Icon size={14} />
        </div>
        <span>{label}</span>
      </NavLink>
      {collapsed && <div className="sb-tooltip">{label}</div>}
    </div>
  );
}

function SbAccordion({ item, open, onToggle, collapsed }) {
  const Icon = ICONS[item.icon] || Layers;
  return (
    <div className="sb-tooltip-wrap">
      <button className={`sb-acc-trigger ${open ? "open" : ""}`} onClick={onToggle}>
        <div className={`sb-icon ${item.color}`}>
          <Icon size={14} />
        </div>
        <span>{item.label}</span>
        <ChevronDown size={12} className={`sb-chevron ${open ? "open" : ""}`} />
      </button>
      {open && !collapsed && (
        <div className="sb-acc-inner">
          {(item.children || []).map((child) => (
            <SbSub
              key={child.key}
              to={child.path}
              label={child.label}
              iconName={child.icon}
              color={child.color}
            />
          ))}
        </div>
      )}
      {collapsed && <div className="sb-tooltip">{item.label}</div>}
    </div>
  );
}

function SbSub({ to, label, iconName, color }) {
  const Icon = ICONS[iconName] || FileText;
  return (
    <NavLink to={to} className={({ isActive }) => `sb-sub ${isActive ? "active" : ""}`}>
      <div className={`sb-icon ${color}`} style={{ width: 22, height: 22, borderRadius: "6px" }}>
        <Icon size={12} />
      </div>
      <span>{label}</span>
    </NavLink>
  );
}
