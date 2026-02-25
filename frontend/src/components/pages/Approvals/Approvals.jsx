import React, { useState } from "react";
import { Reorder, AnimatePresence, motion } from "framer-motion";

export default function ApprovalsKanban() {
  const [requests, setRequests] = useState([
    { id: 1, employee: "Ramesh", type: "Leave", date: "12-03-2025", status: "Pending" },
    { id: 2, employee: "Sita", type: "Expense", date: "11-03-2025", status: "Pending" },
    { id: 3, employee: "Arun", type: "Travel", date: "10-03-2025", status: "Approved" },
    { id: 4, employee: "Geeta", type: "Leave", date: "09-03-2025", status: "Rejected" }
  ]);

  const statuses = ["Pending", "Approved", "Rejected"];

  const badgeClasses = (status) =>
    status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : status === "Approved"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";

  // Move request to another column
  const moveRequest = (id, newStatus) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Approvals </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statuses.map((status) => (
          <div key={status} className="bg-gray-100 p-4 rounded-2xl shadow-md flex flex-col">
            <h3 className="text-lg font-semibold mb-4">{status}</h3>

            <Reorder.Group
              axis="y"
              values={requests.filter((r) => r.status === status)}
              onReorder={() => {}}
              className="space-y-3"
            >
              <AnimatePresence>
                {requests
                  .filter((r) => r.status === status)
                  .map((r) => (
                    <Reorder.Item
                      key={r.id}
                      value={r}
                      layout
                      whileHover={{ scale: 1.02 }}
                      className="bg-white p-4 rounded-xl shadow cursor-pointer"
                    >
                      <div className="flex flex-col gap-2">
                        <h4 className="font-medium text-gray-800">{r.employee}</h4>
                        <p className="text-sm text-gray-600">{r.type} • {r.date}</p>
                        <span className={`px-2 py-1 text-sm rounded-full w-max ${badgeClasses(r.status)}`}>
                          {r.status}
                        </span>

                        {/* Move buttons for Pending and Approved */}
                        {r.status === "Pending" && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => moveRequest(r.id, "Approved")}
                              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => moveRequest(r.id, "Rejected")}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {r.status === "Approved" && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => moveRequest(r.id, "Rejected")}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </Reorder.Item>
                  ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        ))}
      </div>
    </div>
  );
}
