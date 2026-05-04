import { useEffect, useMemo, useState } from "react";
import { fetchAttendance, normalizeAttendanceStatus, upsertAttendanceRecord } from "../../../Moduels/attendance/attendanceApi";

export default function DailyAttendance() {

  const [organisationId, setOrganisationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(""); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attendance, setAttendance] = useState({}); // day -> status code
  const [savingDay, setSavingDay] = useState(null);

  const STATUS_ORDER = ["P", "A", "HD", "L", "WO", "H"];
  const nextStatus = (current) => {
    const cur = normalizeAttendanceStatus(current || "") || "";
    const i = STATUS_ORDER.indexOf(cur);
    return STATUS_ORDER[(i + 1 + STATUS_ORDER.length) % STATUS_ORDER.length] || "P";
  };

  const statusStyle = (s) => {
    const st = normalizeAttendanceStatus(s || "");
    if (st === "P") return "bg-green-200";
    if (st === "A") return "bg-red-200";
    if (st === "HD") return "bg-amber-200";
    if (st === "L") return "bg-blue-200";
    if (st === "WO") return "bg-slate-200";
    if (st === "H") return "bg-purple-200";
    return "bg-white";
  };

  const defaultHours = (s) => {
    const st = normalizeAttendanceStatus(s || "");
    if (st === "P") return 8;
    if (st === "HD") return 4;
    return 0;
  };

  const range = useMemo(() => {
    if (!month) return null;
    const [y, m] = month.split("-").map((x) => Number(x));
    if (!y || !m) return null;
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 0));
    const pad = (n) => String(n).padStart(2, "0");
    const from_date = `${from.getUTCFullYear()}-${pad(from.getUTCMonth() + 1)}-${pad(from.getUTCDate())}`;
    const to_date = `${to.getUTCFullYear()}-${pad(to.getUTCMonth() + 1)}-${pad(to.getUTCDate())}`;
    return { from_date, to_date, daysInMonth: to.getUTCDate() };
  }, [month]);

  const load = async () => {
    setError("");
    setAttendance({});
    if (!range || !organisationId || !employeeId) {
      setError("organisation_id, employee_id and month are required");
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchAttendance({
        organisation_id: organisationId,
        employee_id: employeeId,
        from_date: range.from_date,
        to_date: range.to_date,
      });
      const map = {};
      for (const r of rows || []) {
        const d = String(r.work_date || "").split("-")[2];
        if (!d) continue;
        map[Number(d)] = normalizeAttendanceStatus(r.status);
      }
      setAttendance(map);
    } catch (e) {
      setError(e.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // auto reload when all 3 values present
    if (organisationId && employeeId && month) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId, employeeId, month]);

  const toggleDay = async (day) => {
    if (!range || !organisationId || !employeeId) return;
    const pad = (n) => String(n).padStart(2, "0");
    const work_date = `${month}-${pad(day)}`;
    const current = attendance[day] || "";
    const next = nextStatus(current);

    setAttendance((prev) => ({ ...prev, [day]: next }));
    setSavingDay(day);
    try {
      await upsertAttendanceRecord({
        organisation_id: organisationId,
        employee_id: employeeId,
        work_date,
        status: next,
        work_hours: defaultHours(next),
        remarks: "calendar-ui",
      });
    } catch (e) {
      setAttendance((prev) => ({ ...prev, [day]: current || undefined }));
      setError(e.message || "Failed to save day");
    } finally {
      setSavingDay(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Calendar Attendance (Live)
        </h2>
        <div className="grid md:grid-cols-4 gap-3 mt-4">
          <input
            className="border rounded-lg p-2"
            placeholder="Organisation ID (UUID)"
            value={organisationId}
            onChange={(e) => setOrganisationId(e.target.value)}
          />
          <input
            className="border rounded-lg p-2"
            placeholder="Employee ID (UUID)"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
          <input
            type="month"
            className="border rounded-lg p-2"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button
            onClick={load}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Loading..." : "Reload"}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Click a day to cycle: <b>P</b> → <b>A</b> → <b>HD</b> → <b>L</b> → <b>WO</b> → <b>H</b>.
        </div>
        {error ? <div className="text-sm text-red-600 mt-2">{error}</div> : null}
      </div>

      <div className="grid grid-cols-7 gap-4">
        {[...Array(range?.daysInMonth || 30)].map((_, index) => {
          const day = index + 1;
          const status = attendance[day];

          return (
            <div
              key={day}
              onClick={() => toggleDay(day)}
              className={`cursor-pointer p-4 text-center rounded-lg shadow-md ${statusStyle(status)} ${
                savingDay === day ? "opacity-60" : ""
              }`}
            >
              <div className="font-semibold">{day}</div>
              <div className="text-xs mt-1">
                {status || "Mark"} {savingDay === day ? "…" : ""}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
