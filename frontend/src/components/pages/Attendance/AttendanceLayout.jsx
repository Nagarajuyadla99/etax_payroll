import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ATTENDANCE_QUICK_TABS } from "../../../Moduels/attendance/attendanceNavConfig";

export default function AttendanceLayout() {
  const { pathname } = useLocation();
  const isHub = pathname === "/attendance" || pathname === "/attendance/";

  const tabClass = ({ isActive }) =>
    `px-3 py-2 text-sm rounded-lg whitespace-nowrap ${
      isActive ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      {!isHub && (
        <div className="bg-white border-b sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 mb-2">
              <NavLink to="/attendance" className="text-sm text-teal-700 hover:underline">
                ← Attendance home
              </NavLink>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {ATTENDANCE_QUICK_TABS.map((t) => (
                <NavLink key={t.path} to={t.path} end={t.end} className={tabClass}>
                  {t.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
      <Outlet />
    </div>
  );
}
