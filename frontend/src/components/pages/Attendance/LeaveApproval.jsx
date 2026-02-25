import { useState } from "react";

export default function LeaveApproval() {
  const [requests, setRequests] = useState([
    {
      id: 1,
      empId: "E101",
      name: "Ravi Kumar",
      from: "2026-02-10",
      to: "2026-02-12",
      type: "Sick Leave",
      status: "Pending"
    },
    {
      id: 2,
      empId: "E102",
      name: "Anita Sharma",
      from: "2026-02-15",
      to: "2026-02-18",
      type: "Casual Leave",
      status: "Pending"
    }
  ]);

  const updateStatus = (id, newStatus) => {
    const updated = requests.map(req =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequests(updated);
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

      <div className="grid gap-6">
        {requests.map(req => (
          <div
            key={req.id}
            className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">
                  {req.name} ({req.empId})
                </h3>
                <p className="text-sm text-gray-500">
                  {req.type}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {req.from} → {req.to}
                </p>
              </div>

              <div className="text-sm font-semibold">
                {req.status === "Pending" && (
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                    Pending
                  </span>
                )}
                {req.status === "Approved" && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    Approved
                  </span>
                )}
                {req.status === "Rejected" && (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">
                    Rejected
                  </span>
                )}
              </div>
            </div>

            {req.status === "Pending" && (
              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => updateStatus(req.id, "Approved")}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Approve
                </button>

                <button
                  onClick={() => updateStatus(req.id, "Rejected")}
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
