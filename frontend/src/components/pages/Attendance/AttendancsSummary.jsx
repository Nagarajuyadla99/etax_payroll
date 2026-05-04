import { useState } from "react";
import { fetchPayPeriodAttendanceSummary } from "../../../Moduels/attendance/attendanceApi";

export default function AttendanceSummary() {
  const [payPeriodId, setPayPeriodId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const load = async () => {
    setError("");
    setSummary(null);
    if (!payPeriodId) {
      setError("Pay period id is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchPayPeriodAttendanceSummary(payPeriodId);
      setSummary(res);
    } catch (e) {
      setError(e.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6">
          Attendance Summary (Pay Period)
        </h2>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <input
            className="border rounded-lg p-2"
            placeholder="Pay Period ID (UUID)"
            value={payPeriodId}
            onChange={(e) => setPayPeriodId(e.target.value)}
          />
          <button
            onClick={load}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Loading..." : "Load Summary"}
          </button>
          <div className="text-sm text-gray-600 flex items-center">
            {summary ? (
              <span>
                Period: {summary.start_date} → {summary.end_date}{" "}
                {summary.attendance_leave_locked ? "(locked)" : ""}
              </span>
            ) : (
              <span className="text-gray-400">Enter pay period to fetch live data</span>
            )}
          </div>
        </div>

        {error ? <div className="text-red-600 text-sm mb-4">{error}</div> : null}

        {summary?.employees?.length ? (
          <div className="overflow-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Employee</th>
                  <th className="border p-2">P</th>
                  <th className="border p-2">A</th>
                  <th className="border p-2">HD</th>
                  <th className="border p-2">L</th>
                  <th className="border p-2">WO</th>
                  <th className="border p-2">H</th>
                  <th className="border p-2">LOP Leave</th>
                </tr>
              </thead>
              <tbody>
                {summary.employees.map((e) => (
                  <tr key={e.employee_id}>
                    <td className="border p-2">{e.employee_id}</td>
                    <td className="border p-2">{e.present_units}</td>
                    <td className="border p-2">{e.absent_units}</td>
                    <td className="border p-2">{e.half_day_units}</td>
                    <td className="border p-2">{e.leave_on_attendance_units}</td>
                    <td className="border p-2">{e.week_off_units}</td>
                    <td className="border p-2">{e.holiday_units}</td>
                    <td className="border p-2">{e.lop_leave_units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            {summary ? "No employees found in this summary." : "No data loaded yet."}
          </div>
        )}
      </div>

    </div>
  );
}
