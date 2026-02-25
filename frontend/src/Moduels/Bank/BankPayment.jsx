import React, { useState } from "react";

const BankPayments = () => {
  const [batches, setBatches] = useState([
    {
      batch_id: "BATCH001",
      payroll_run_id: "RUN-JAN-2026",
      total_employees: 25,
      total_amount: 250000,
      status: "Generated",
    },
    {
      batch_id: "BATCH002",
      payroll_run_id: "RUN-FEB-2026",
      total_employees: 30,
      total_amount: 300000,
      status: "Paid",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    payroll_run_id: "",
    total_employees: "",
    total_amount: "",
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const handleCreateBatch = () => {
    if (
      !formData.payroll_run_id ||
      !formData.total_employees ||
      !formData.total_amount
    ) {
      alert("Please fill all fields");
      return;
    }

    const newBatch = {
      batch_id: `BATCH${String(batches.length + 1).padStart(3, "0")}`,
      payroll_run_id: formData.payroll_run_id,
      total_employees: parseInt(formData.total_employees),
      total_amount: parseFloat(formData.total_amount),
      status: "Generated",
    };

    setBatches([...batches, newBatch]);
    setFormData({
      payroll_run_id: "",
      total_employees: "",
      total_amount: "",
    });
    setShowModal(false);
  };

  const handleMarkPaid = (batchId) => {
    const updated = batches.map((batch) =>
      batch.batch_id === batchId
        ? { ...batch, status: "Paid" }
        : batch
    );
    setBatches(updated);
  };

  const handleDownload = (batchId) => {
    alert(
      `Download triggered for ${batchId}\n\nConnect to backend /download API later`
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
          Bank Payment Batches
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          + Create Payment Batch
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Batch ID</th>
                <th className="px-6 py-3">Payroll Run</th>
                <th className="px-6 py-3">Employees</th>
                <th className="px-6 py-3">Total Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {batches.map((batch) => (
                <tr key={batch.batch_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {batch.batch_id}
                  </td>
                  <td className="px-6 py-4">{batch.payroll_run_id}</td>
                  <td className="px-6 py-4">{batch.total_employees}</td>
                  <td className="px-6 py-4">
                    ₹ {batch.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                        batch.status
                      )}`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-3">
                    <button
                      onClick={() => handleDownload(batch.batch_id)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Download
                    </button>

                    {batch.status !== "Paid" && (
                      <button
                        onClick={() => handleMarkPaid(batch.batch_id)}
                        className="text-green-600 hover:underline text-sm"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Create Payment Batch
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Payroll Run ID"
                value={formData.payroll_run_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payroll_run_id: e.target.value,
                  })
                }
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
              />

              <input
                type="number"
                placeholder="Total Employees"
                value={formData.total_employees}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_employees: e.target.value,
                  })
                }
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
              />

              <input
                type="number"
                placeholder="Total Amount"
                value={formData.total_amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_amount: e.target.value,
                  })
                }
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
              />
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateBatch}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankPayments;
