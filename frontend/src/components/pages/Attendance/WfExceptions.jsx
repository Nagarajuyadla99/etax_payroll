import { useEffect, useState } from "react";
import { fetchWfExceptions } from "../../../Moduels/attendance/wfApi";
import API from "../../../services/api";

export default function WfExceptions() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const data = await fetchWfExceptions(filter || undefined);
      setRows(data);
    } catch (e) {
      setError(e.message || "Failed to load");
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const resolve = async (id) => {
    try {
      await API.post(`/wf/exceptions/${id}/resolve`, {
        resolution_type: "hr_approved",
        notes: "Resolved from exceptions inbox",
      });
      await load();
    } catch (e) {
      setError(e.message || "Resolve failed");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Attendance Exceptions</h1>
      <div className="flex gap-2 mb-4">
        {["open", "resolved", ""].map((f) => (
          <button
            key={f || "all"}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm border ${
              filter === f ? "bg-teal-600 text-white" : "bg-white"
            }`}
          >
            {f || "all"}
          </button>
        ))}
      </div>
      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
      <table className="w-full bg-white border rounded-xl text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Employee</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-left">Severity</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500">
                No exceptions.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.exception_id} className="border-t">
                <td className="p-3">{r.work_date}</td>
                <td className="p-3 font-mono text-xs">{String(r.employee_id).slice(0, 8)}…</td>
                <td className="p-3">{r.exception_type}</td>
                <td className="p-3">{r.severity}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-right">
                  {r.status === "open" && (
                    <button
                      type="button"
                      onClick={() => resolve(r.exception_id)}
                      className="text-teal-700 underline"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
