import { Link } from "react-router-dom";
import { useContext, useMemo } from "react";
import { AuthContext } from "../../../Moduels/Context/AuthContext";
import {
  ATTENDANCE_SECTIONS,
  filterSectionsByRole,
} from "../../../Moduels/attendance/attendanceNavConfig";

export default function AttendanceHub() {
  const { role } = useContext(AuthContext);
  const sections = useMemo(() => filterSectionsByRole(ATTENDANCE_SECTIONS, role), [role]);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Attendance</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Mark daily attendance, manage leave, and configure workforce rules. Attendance feeds{" "}
          <strong>payable days</strong> into payroll — it does not change salary directly.
        </p>
      </header>

      <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-xl text-sm text-teal-900">
        <strong>Quick start:</strong> Use <Link to="/attendance/mark" className="underline font-medium">Mark attendance</Link> for
        one employee, or <Link to="/attendance/records" className="underline font-medium">Attendance records</Link> to review the
        month. Run payroll from Pay Runs when the period is complete.
      </div>

      <div className="space-y-8">
        {sections.map((sec) => (
          <section key={sec.id}>
            <h2 className="text-lg font-semibold text-slate-800">{sec.title}</h2>
            <p className="text-sm text-slate-500 mb-3">{sec.description}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {sec.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-400 hover:shadow-sm transition"
                >
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
