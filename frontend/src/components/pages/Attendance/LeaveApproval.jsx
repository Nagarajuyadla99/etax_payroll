import { useEffect, useState } from "react";
import { approveLeave, fetchLeaves } from "../../../Moduels/attendance/attendanceApi";

export default function LeaveApproval() {
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchLeaves({ employee_id: employeeId || undefined });
      setRequests(res || []);
    } catch (e) {
      setError(e.message || "Failed to load leaves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (leaveId, newStatus) => {
    setError("");
    try {
      await approveLeave({
        leave_id: leaveId,
        decision: newStatus === "approved" ? "approved" : "rejected",
      });
      await load();
    } catch (e) {
      setError(e.message || "Failed to update leave");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Leave Approval Workflow
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve employee leave requests
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md mb-6 grid md:grid-cols-3 gap-4">
        <input
          className="border rounded-lg p-2"
          placeholder="Filter by Employee ID (UUID) optional"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        />
        <button
          onClick={load}
          className={`px-4 py-2 rounded-lg text-white ${
            loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          disabled={loading}
        >
          {loading ? "Loading..." : "Reload"}
        </button>
        <div className="text-sm text-gray-500 flex items-center">
          {error ? <span className="text-red-600">{error}</span> : <span />}
        </div>
      </div>

      <div className="grid gap-6">
        {requests.map(req => (
          <div
            key={req.leave_id}
            className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">
                  {req.employee_id}
                </h3>
                <p className="text-sm text-gray-500">
                  {req.leave_type}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {req.start_date} → {req.end_date}
                </p>
              </div>

              <div className="text-sm font-semibold">
                {req.status === "pending" && (
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                    Pending
                  </span>
                )}
                {req.status === "approved" && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    Approved
                  </span>
                )}
                {req.status === "rejected" && (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">
                    Rejected
                  </span>
                )}
              </div>
            </div>

            {req.status === "pending" && (
              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => updateStatus(req.leave_id, "approved")}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Approve
                </button>

                <button
                  onClick={() => updateStatus(req.leave_id, "rejected")}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
