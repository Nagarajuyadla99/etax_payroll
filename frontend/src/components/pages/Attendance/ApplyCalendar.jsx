import { useState } from "react";
import { applyAttendanceCalendarJob } from "../../../Moduels/attendance/attendanceApi";

export default function ApplyCalendar() {
  const [organisationId, setOrganisationId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [employeeIds, setEmployeeIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async () => {
    setError("");
    setResult(null);
    if (!organisationId || !fromDate || !toDate) {
      setError("organisation_id, from_date and to_date are required");
      return;
    }
    setLoading(true);
    try {
      const ids = employeeIds
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await applyAttendanceCalendarJob({
        organisation_id: organisationId,
        from_date: fromDate,
        to_date: toDate,
        employee_ids: ids.length ? ids : null,
      });
      setResult(res);
    } catch (e) {
      setError(e.message || "Failed to apply calendar marks");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Apply Holiday / Week-off Marks</h2>
        <p className="text-sm text-gray-500 mt-1">
          Calls the backend job to auto-mark <b>H</b> and <b>WO</b> based on org calendar and policy.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            className="border rounded-lg p-2"
            placeholder="Organisation ID (UUID)"
            value={organisationId}
            onChange={(e) => setOrganisationId(e.target.value)}
          />
          <input
            className="border rounded-lg p-2"
            placeholder="Employee IDs (optional, comma-separated UUIDs)"
            value={employeeIds}
            onChange={(e) => setEmployeeIds(e.target.value)}
          />
          <input
            type="date"
            className="border rounded-lg p-2"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input
            type="date"
            className="border rounded-lg p-2"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded-lg text-white ${
            loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Running..." : "Apply Calendar Marks"}
        </button>

        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        {result ? (
          <div className="mt-3 text-sm text-green-700">
            Processed rows: {result.processed_rows}, Chunks: {result.chunks}, Errors:{" "}
            {Array.isArray(result.errors) ? result.errors.length : 0}
          </div>
        ) : null}
      </div>
    </div>
  );
}

