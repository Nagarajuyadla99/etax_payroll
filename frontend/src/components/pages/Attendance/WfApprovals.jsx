import { useEffect, useState } from "react";
import { decideWfApproval, fetchWfApprovals } from "../../../Moduels/attendance/wfApi";

export default function WfApprovals() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setRows(await fetchWfApprovals("pending"));
    } catch (e) {
      setError(e.message || "Failed to load");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id, action) => {
    try {
      await decideWfApproval(id, { action, comment: "" });
      await load();
    } catch (e) {
      setError(e.message || "Action failed");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Attendance Approvals</h1>
      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
      <ul className="space-y-3">
        {rows.length === 0 ? (
          <li className="text-gray-500">No pending approvals.</li>
        ) : (
          rows.map((r) => (
            <li key={r.request_id} className="bg-white border rounded-lg p-4 flex justify-between">
              <div>
                <p className="font-medium">{r.entity_type}</p>
                <p className="text-xs text-gray-500">Level {r.current_level}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => decide(r.request_id, "approve")}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide(r.request_id, "reject")}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                >
                  Reject
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
