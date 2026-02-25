import React, { useState } from "react";

const StatutoryTax = () => {
  const [activeTab, setActiveTab] = useState("PF");

  /* -----------------------------
     Dummy Data
  ------------------------------*/

  const [pfSettings, setPfSettings] = useState({
    registration_no: "PF-REG-2026",
    employer_contribution: 12,
    employee_contribution: 12,
    effective_from: "2026-04-01",
  });

  const [esiSettings, setEsiSettings] = useState({
    registration_no: "ESI-REG-2026",
    employer_contribution: 3.25,
    employee_contribution: 0.75,
    effective_from: "2026-04-01",
  });

  const [declarations, setDeclarations] = useState([
    {
      id: 1,
      employee: "Rahul Sharma",
      financial_year: "2025-26",
      section: "80C",
      declared_amount: 150000,
      approved_amount: 150000,
      status: "Approved",
    },
    {
      id: 2,
      employee: "Priya Singh",
      financial_year: "2025-26",
      section: "80D",
      declared_amount: 50000,
      approved_amount: 0,
      status: "Submitted",
    },
  ]);

  /* -----------------------------
     Handlers
  ------------------------------*/

  const handleApprove = (id) => {
    const updated = declarations.map((d) =>
      d.id === id
        ? { ...d, status: "Approved", approved_amount: d.declared_amount }
        : d
    );
    setDeclarations(updated);
  };

  const handleReject = (id) => {
    const updated = declarations.map((d) =>
      d.id === id ? { ...d, status: "Rejected", approved_amount: 0 } : d
    );
    setDeclarations(updated);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      case "Submitted":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Statutory & Tax Management
        </h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["PF", "ESI", "Tax Declaration", "Approval"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-white shadow text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ============================= */}
        {/* PF SETTINGS */}
        {/* ============================= */}
        {activeTab === "PF" && (
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">PF Settings</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                value={pfSettings.registration_no}
                className="border rounded-lg px-3 py-2"
                placeholder="Registration Number"
                readOnly
              />
              <input
                type="number"
                value={pfSettings.employer_contribution}
                className="border rounded-lg px-3 py-2"
                placeholder="Employer Contribution %"
                readOnly
              />
              <input
                type="number"
                value={pfSettings.employee_contribution}
                className="border rounded-lg px-3 py-2"
                placeholder="Employee Contribution %"
                readOnly
              />
              <input
                type="date"
                value={pfSettings.effective_from}
                className="border rounded-lg px-3 py-2"
                readOnly
              />
            </div>
          </div>
        )}

        {/* ============================= */}
        {/* ESI SETTINGS */}
        {/* ============================= */}
        {activeTab === "ESI" && (
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">ESI Settings</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                value={esiSettings.registration_no}
                className="border rounded-lg px-3 py-2"
                readOnly
              />
              <input
                type="number"
                value={esiSettings.employer_contribution}
                className="border rounded-lg px-3 py-2"
                readOnly
              />
              <input
                type="number"
                value={esiSettings.employee_contribution}
                className="border rounded-lg px-3 py-2"
                readOnly
              />
              <input
                type="date"
                value={esiSettings.effective_from}
                className="border rounded-lg px-3 py-2"
                readOnly
              />
            </div>
          </div>
        )}

        {/* ============================= */}
        {/* TAX DECLARATION SUBMISSION */}
        {/* ============================= */}
        {activeTab === "Tax Declaration" && (
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">
              Tax Declaration Submission
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Financial Year</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Declared Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {declarations.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3">{d.employee}</td>
                      <td className="px-4 py-3">{d.financial_year}</td>
                      <td className="px-4 py-3">{d.section}</td>
                      <td className="px-4 py-3">
                        ₹ {d.declared_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                            d.status
                          )}`}
                        >
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================= */}
        {/* APPROVAL SCREEN */}
        {/* ============================= */}
        {activeTab === "Approval" && (
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">
              Tax Declaration Approval
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Declared</th>
                    <th className="px-4 py-3">Approved</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {declarations
                    .filter((d) => d.status === "Submitted")
                    .map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-3">{d.employee}</td>
                        <td className="px-4 py-3">{d.section}</td>
                        <td className="px-4 py-3">
                          ₹ {d.declared_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          ₹ {d.approved_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          <button
                            onClick={() => handleApprove(d.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(d.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatutoryTax;
