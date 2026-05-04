import { useMemo, useState } from "react";
import { bulkUploadAttendance, normalizeAttendanceStatus } from "../../../Moduels/attendance/attendanceApi";

export default function AttendanceBulkUpload() {

  const [data, setData] = useState([]);
  const [organisationId, setOrganisationId] = useState("");
  const [upsert, setUpsert] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split(/\r?\n/).filter(Boolean);
      if (rows.length === 0) return;

      const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
      const idx = (name) => header.indexOf(name);

      // Expected columns:
      // employee_id, work_date, status, work_hours, remarks
      // status can be P/A/HD/L/WO/H or legacy present/absent/half_day/leave/holiday
      const parsed = rows.slice(1).map((row) => {
        const cols = row.split(",").map((c) => c.trim());
        const employee_id = cols[idx("employee_id")] || cols[idx("employeeid")] || "";
        const work_date = cols[idx("work_date")] || cols[idx("date")] || "";
        const statusRaw = cols[idx("status")] || "P";
        const work_hours = cols[idx("work_hours")] || cols[idx("hours")] || "0";
        const remarks = cols[idx("remarks")] || "";
        return {
          employee_id,
          work_date,
          status: normalizeAttendanceStatus(statusRaw),
          work_hours: Number(work_hours || 0),
          remarks: remarks || null,
        };
      });

      setResult(null);
      setError("");
      setData(parsed.filter((r) => r.employee_id && r.work_date));
    };

    reader.readAsText(file);
  };

  const canSubmit = useMemo(() => {
    return Boolean(organisationId) && Array.isArray(data) && data.length > 0;
  }, [organisationId, data]);

  const submit = async () => {
    setError("");
    setResult(null);
    try {
      const res = await bulkUploadAttendance({
        organisation_id: organisationId,
        records: data,
        upsert,
      });
      setResult(res);
    } catch (e) {
      setError(e.message || "Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-2xl font-bold">
          Attendance Bulk Upload
        </h2>
        <p className="text-sm text-gray-500">
          Upload CSV file for bulk attendance
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <input
            className="border rounded-lg p-2"
            placeholder="Organisation ID (UUID)"
            value={organisationId}
            onChange={(e) => setOrganisationId(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={upsert}
              onChange={(e) => setUpsert(e.target.checked)}
            />
            Upsert duplicates (employee_id + work_date)
          </label>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`px-4 py-2 rounded-lg text-white ${
              canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Upload to Server
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-3">
          CSV header example: <code>employee_id,work_date,status,work_hours,remarks</code>
        </div>

        {error ? (
          <div className="mt-3 text-sm text-red-600">{error}</div>
        ) : null}
        {result ? (
          <div className="mt-3 text-sm text-green-700">
            Uploaded. Created: {result.created}, Updated: {result.updated}, Errors:{" "}
            {Array.isArray(result.errors) ? result.errors.length : 0}
          </div>
        ) : null}
      </div>

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="mb-6"
      />

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="font-semibold mb-4">Parsed Records</h3>

        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Employee ID</th>
              <th className="border p-2">Work Date</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Hours</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, index) => (
              <tr key={index}>
                <td className="border p-2">{d.employee_id}</td>
                <td className="border p-2">{d.work_date}</td>
                <td className="border p-2">{normalizeAttendanceStatus(d.status)}</td>
                <td className="border p-2">{d.work_hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
