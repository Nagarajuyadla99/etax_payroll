import { Link } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../../Moduels/Context/AuthContext";
import {
  ATTENDANCE_SECTIONS,
  filterSectionsByRole,
} from "../../../Moduels/attendance/attendanceNavConfig";
import { fetchWfSetupStatus } from "../../../Moduels/attendance/wfApi";

export default function AttendanceHub() {
  const { role } = useContext(AuthContext);
  const [setupRequired, setSetupRequired] = useState(false);
  const sections = useMemo(() => filterSectionsByRole(ATTENDANCE_SECTIONS, role), [role]);

  useEffect(() => {
    const r = String(role || "").toLowerCase();
    if (r !== "admin" && r !== "superadmin" && r !== "super_admin") return;
    fetchWfSetupStatus()
      .then((s) => setSetupRequired(!!s.setup_required))
      .catch(() => setSetupRequired(false));
  }, [role]);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Attendance</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Mark daily attendance, manage leave, and configure workforce rules. Attendance feeds{" "}
          <strong>payable days</strong> into payroll — it does not change salary directly.
        </p>
      </header>

      {setupRequired && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <p className="font-semibold text-amber-900">Organisation attendance setup required</p>
          <p className="text-sm text-amber-800 mt-1">
            Choose attendance sources, industry template, cycle, and payroll behaviors before using workforce modules.
          </p>
          <Link
            to="/attendance/setup"
            className="inline-block mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
          >
            Start setup wizard →
          </Link>
        </div>
      )}

      <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-xl text-sm text-teal-900">
        <strong>Quick start:</strong> Use <Link to="/attendance/mark" className="underline font-medium">Mark attendance</Link> for
        one employee, or <Link to="/attendance/records" className="underline font-medium">Attendance records</Link> to review the
        month. Run payroll from Pay Runs when the period is complete.
        {String(role || "").toLowerCase() === "admin" && (
          <>
            {" "}
            · <Link to="/attendance/setup" className="underline font-medium">Engine setup</Link>
          </>
        )}
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
