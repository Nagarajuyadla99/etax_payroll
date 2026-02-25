import React, { useState } from "react";

const AuditLogViewer = () => {
  /* -----------------------------
     Dummy Data (Matches Your Model)
  ------------------------------*/

  const [logs] = useState([
    {
      log_id: "LOG001",
      user: "Admin User",
      action: "Updated Salary Structure",
      entity: "Employee",
      entity_id: "EMP-101",
      ip_address: "192.168.1.10",
      occurred_at: "2026-02-10 10:45 AM",
      details: {
        old_salary: 50000,
        new_salary: 60000,
      },
    },
    {
      log_id: "LOG002",
      user: "HR Manager",
      action: "Approved Tax Declaration",
      entity: "TaxDeclaration",
      entity_id: "TD-202",
      ip_address: "192.168.1.15",
      occurred_at: "2026-02-11 02:15 PM",
      details: {
        section: "80C",
        approved_amount: 150000,
      },
    },
    {
      log_id: "LOG003",
      user: "Admin User",
      action: "Created Payment Batch",
      entity: "PaymentBatch",
      entity_id: "BATCH003",
      ip_address: "10.0.0.25",
      occurred_at: "2026-02-12 09:20 AM",
      details: {
        total_employees: 35,
        total_amount: 350000,
      },
    },
  ]);

  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  /* -----------------------------
     Filter Logic
  ------------------------------*/

  const filteredLogs = logs.filter(
    (log) =>
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Audit Log Viewer
          </h1>

          <input
            type="text"
            placeholder="Search by user, action, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-4 md:mt-0 border rounded-lg px-4 py-2 w-full md:w-96"
          />
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3 text-center">View</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{log.user}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">
                      {log.entity} ({log.entity_id})
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.ip_address}
                    </td>
                    <td className="px-4 py-3">{log.occurred_at}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      No logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">
                Audit Details
              </h2>

              <div className="space-y-2 text-sm">
                <p><strong>User:</strong> {selectedLog.user}</p>
                <p><strong>Action:</strong> {selectedLog.action}</p>
                <p><strong>Entity:</strong> {selectedLog.entity}</p>
                <p><strong>IP Address:</strong> {selectedLog.ip_address}</p>
                <p><strong>Date:</strong> {selectedLog.occurred_at}</p>

                <div>
                  <strong>Changes:</strong>
                  <pre className="bg-gray-100 p-3 mt-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
