import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

import {
  Home,
  Users,
  Wallet,
  Briefcase,
  CheckCircle,
  Calendar,
  PlayCircle,
  HelpCircle,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  Layers,
  Shield,
  FileText,
  MessageCircle,
  Upload,
  UserCheck,
  Grid
} from "lucide-react";

export default function Sidebar({ open }) {

  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  const [salaryOpen, setSalaryOpen] = useState(
    location.pathname.startsWith("/salary")
  );

  const [attendanceOpen, setAttendanceOpen] = useState(
    location.pathname.startsWith("/attendance")
  );

  useEffect(() => {
    if (location.pathname.startsWith("/attendance")) {
      setAttendanceOpen(true);
    }
    if (location.pathname.startsWith("/salary")) {
      setSalaryOpen(true);
    }
  }, [location.pathname]);

  const baseLink =
    "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-300 group";

  const activeLink = "bg-indigo-600 text-white shadow-md";
  const inactiveLink =
    "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700";

  return (
    <aside
      
        className={`
    relative top-0 left-0 z-40
    min-h-screen
    ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    ${collapsed ? "w-20" : "w-72"}
    bg-white border-r shadow-sm
    transition-all duration-300 ease-in-out
  `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed && (
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              Payroll Pro
            </h2>
            <p className="text-xs text-slate-500">Management System</p>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex flex-col gap-2 p-3 h-[calc(100vh-120px)] overflow-y-auto">

        {/* Dashboard */}
        <SideItem
          to="/dashboard"
          label="Home"
          icon={<Home size={18} />}
          color="blue"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />

        {/* Employees */}
        <SideItem
          to="/employee"
          label="Employees"
          icon={<Users size={18} />}
          color="emerald"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />

        {/* ================= SALARY MODULE ================= */}
        <div>
          <button
            onClick={() => setSalaryOpen(!salaryOpen)}
            className={`${baseLink} ${
              location.pathname.startsWith("/salary")
                ? activeLink
                : inactiveLink
                
            } w-full`}
          >
            <div
              className={`p-2 rounded-lg transition-all duration-300
              ${
                location.pathname.startsWith("/salary")
                  ? "bg-white/20 text-white"
                  : "bg-indigo-200 text-indigo-600 group-hover:bg-indigo-200"
              }
              group-hover:scale-110`}
            >
              <Layers size={18}
               />
             
        
            </div>

            {!collapsed && <span>Salary Setup</span>}
          </button>

          {salaryOpen && !collapsed && (
            <div className="mt-1 flex flex-col gap-1">
              <SubItem to="/salarycomponents" icon={<Layers size={16} />} label="Components" />
              <SubItem to="/salarytemplates" icon={<FileText size={16} />} label="Templates" />
              <SubItem to="/paystructure" icon={<Grid size={16} />} label="Pay Structure" />
              <SubItem to="/salaryengine" icon={<PlayCircle size={16} />} label="Payroll Engine" />
            </div>
          )}
        </div>

        {/* ================= ATTENDANCE MODULE ================= */}
        <div>
          <button
            onClick={() => setAttendanceOpen(!attendanceOpen)}
            className={`${baseLink} ${
              location.pathname.startsWith("/attendance")
                ? activeLink
                : inactiveLink
            } w-full`}
          >
            <div
              className={`p-2 rounded-lg transition-all duration-300
              ${
                location.pathname.startsWith("/attendance")
                  ? "bg-white/20 text-white"
                  : "bg-cyan-100 text-cyan-600 group-hover:bg-cyan-200"
              }
              group-hover:scale-110`}
            >
              <Calendar size={18} />
            </div>

            {!collapsed && <span>Attendance</span>}
          </button>

          {attendanceOpen && !collapsed && (
            <div className="mt-1 flex flex-col gap-1">
              <SubItem to="/Attendance" icon={<Calendar size={16} />} label="Attendance" />
              <SubItem to="/AttendanceSummary" icon={<FileText size={16} />} label="Attendance Summary" />
              <SubItem to="/AttendanceBulkUpload" icon={<Upload size={16} />} label="Bulk Upload" />
              <SubItem to="/attendance/leave-request" icon={<UserCheck size={16} />} label="Leave Requests" />
              <SubItem to="/LeaveApproval" icon={<CheckCircle size={16} />} label="Leave Approval" />
            </div>
          )}
        </div>

        {/* Pay Runs */}
        <SideItem
          to="/payruns"
          label="Pay Runs"
          icon={<Wallet size={18} />}
          color="amber"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />
        {/* Employees */}
        <SideItem
          to="/employeeList"
          label="Employees"
          icon={<User size={18} />}
          color="blue"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />
         <SideItem
          to="/employeeCreate"
          label="Add Employee"
          icon={<User size={18} />}
          color="cyan"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />
        <SideItem
        to="/employeeForm"
        label="Employee Form"
        icon={<User size={18} />}
        color="emerald"
        collapsed={collapsed}
        baseLink={baseLink}
        activeLink={activeLink}
        inactiveLink={inactiveLink}
      />


        {/* Bank Requests */}
        <SideItem
          to="/bank"
          label="Bank Requests"
          icon={<Wallet size={18} />}
          color="sky"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />

        {/* Approvals */}
        <SideItem
          to="/approvals"
          label="Approvals"
          icon={<CheckCircle size={18} />}
          color="purple"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />

        {/* Loans */}
        <SideItem
          to="/loans"
          label="Loans"
          icon={<Briefcase size={18} />}
          color="rose"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />

        {/* Payroll */}
        <SideItem
          to="/payroll"
          label="Process Payroll"
          icon={<PlayCircle size={18} />}
          color="orange"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />
        {/* Audit */}
        <SideItem
          to="/audit"
          label="Audit Logs"
          icon={<Shield size={18} />}
          color="red"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />

           <SideItem
            to="/statutorytax"
            label="Statutory & Tax"
            icon={<FileText size={18} />}
            color="violet"
            collapsed={collapsed}
            baseLink={baseLink}
              activeLink={activeLink}
             inactiveLink={inactiveLink}
              />

       


        {/* Help */}
        <SideItem
          to="/help"
          label="Help"
          icon={<HelpCircle size={18} />}
          color="yellow"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />
        {/* Noticeboard */}
        <SideItem
          to="/noticeboard"
          label="Noticeboard"
          icon={<MessageCircle size={18} />}
          color="yellow"
          collapsed={collapsed}
          baseLink={baseLink}
          activeLink={activeLink}
          inactiveLink={inactiveLink}
        />

      </nav>
    </aside>
  );
}

/* ================= SUB MENU ================= */
function SubItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-10 py-3 rounded-xl text-[15px] font-medium transition-all duration-300 w-full
        ${
          isActive
            ? "bg-indigo-600 text-white shadow-md"
            : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {icon && (
            <div
              className={`p-1 rounded-md transition-all duration-300
              ${isActive ? "text-white" : "text-indigo-500"}
              group-hover:scale-110`}
            >
              {icon}
            </div>
          )}
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

/* ================= MAIN ITEM ================= */
function SideItem({
  to,
  label,
  icon,
  color,
  collapsed,
  baseLink,
  activeLink,
  inactiveLink
}) {

  const colorMap = {
    blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-200",
    emerald: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200",
    amber: "bg-amber-100 text-amber-600 group-hover:bg-amber-200",
    purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-200",
    rose: "bg-rose-100 text-rose-600 group-hover:bg-rose-200",
    cyan: "bg-cyan-100 text-cyan-600 group-hover:bg-cyan-200",
    orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-200",
    pink: "bg-pink-100 text-pink-600 group-hover:bg-pink-200",
    gray: "bg-gray-100 text-gray-600 group-hover:bg-gray-200",
    violet: "bg-violet-100 text-violet-600 group-hover:bg-violet-200",
    sky: "bg-sky-100 text-sky-600 group-hover:bg-sky-200",
    red: "bg-red-100 text-red-600 group-hover:bg-red-200",
    yellow: "bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200",

  };

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${baseLink} ${isActive ? activeLink : inactiveLink}`
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={`p-2 rounded-lg transition-all duration-300
              ${isActive ? "bg-white/20 text-white" : colorMap[color]}
              group-hover:scale-110`}
          >
            {icon}
          </div>

          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
}