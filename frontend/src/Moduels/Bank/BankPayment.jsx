import React, { useContext, useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import { AuthContext } from "../Context/AuthContext";

const statusPill = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "bg-green-100 text-green-700";
  if (s === "failed") return "bg-red-100 text-red-700";
  if (s.includes("pending") || s === "hr_pending" || s === "finance_pending")
    return "bg-yellow-100 text-yellow-800";
  if (s === "approved") return "bg-blue-100 text-blue-800";
  if (s === "payout_in_progress") return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-700";
};

const formatMoney = (value) => {
  const n = Number(value ?? 0);
  return `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

export default function BankPayments() {
  const { role } = useContext(AuthContext);
  const canHrApprove = useMemo(() => ["admin", "hr"].includes(role), [role]);
  const canFinanceApprove = useMemo(
    () => ["admin", "finance"].includes(role),
    [role]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [createData, setCreateData] = useState({
    payroll_run_id: "",
    pay_period_id: "",
    batch_ref: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/disbursement/salary-batches");
      setBatches(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load salary batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createBatch = async () => {
    if (!createData.payroll_run_id || !createData.pay_period_id || !createData.batch_ref) {
      alert("Payroll run id, pay period id and batch ref are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.post("/disbursement/salary-batches", createData);
      setShowModal(false);
      setCreateData({ payroll_run_id: "", pay_period_id: "", batch_ref: "" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  const hrApprove = async (batchId) => {
    setLoading(true);
    setError("");
    try {
      await API.post(`/disbursement/salary-batches/${batchId}/approve/hr`, {
        comment: "Approved by HR",
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "HR approval failed");
    } finally {
      setLoading(false);
    }
  };

  const financeApprove = async (batchId) => {
    setLoading(true);
    setError("");
    try {
      await API.post(`/disbursement/salary-batches/${batchId}/approve/finance`, {
        comment: "Approved by Finance",
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "Finance approval failed");
    } finally {
      setLoading(false);
    }
  };

  const payout = async (batchId) => {
    setLoading(true);
    setError("");
    try {
      await API.post(`/disbursement/salary-batches/${batchId}/payout`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "Payout request failed");
    } finally {
      setLoading(false);
    }
  };

  const generateBankFile = async (batchId) => {
    setLoading(true);
    setError("");
    try {
      await API.post(`/disbursement/salary-batches/${batchId}/artifacts/bank-file`);
      alert("Bank file generated. Open artifacts list to see storage path.");
    } catch (e) {
      setError(e?.response?.data?.detail || "Bank file generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payroll Disbursement</h1>
          <div className="text-sm text-gray-600">
            HR → Finance approvals, payouts, and bank file generation
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50"
            disabled={loading}
          >
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
            disabled={loading}
          >
            + Create Salary Batch
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100">
          {error}
        </div>
      ) : null}

      <div className="bg-white shadow rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Batch Ref</th>
                <th className="px-6 py-3">Payroll Run</th>
                <th className="px-6 py-3">Employees</th>
                <th className="px-6 py-3">Total Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-gray-500" colSpan={6}>
                    Loading...
                  </td>
                </tr>
              ) : batches.length ? (
                batches.map((b) => (
                  <tr key={b.batch_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {b.batch_ref}
                      <div className="text-xs text-gray-500">{String(b.batch_id).slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{String(b.payroll_run_id).slice(0, 8)}</div>
                      <div className="text-xs text-gray-500">Pay period: {String(b.pay_period_id).slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">{b.total_employees ?? 0}</td>
                    <td className="px-6 py-4">{formatMoney(b.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusPill(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => generateBankFile(b.batch_id)}
                        className="text-blue-700 hover:underline text-sm"
                        disabled={loading}
                      >
                        Generate File
                      </button>

                      {canHrApprove && (b.status === "hr_pending" || b.status === "finance_pending") ? (
                        <button
                          onClick={() => hrApprove(b.batch_id)}
                          className="text-yellow-700 hover:underline text-sm"
                          disabled={loading || b.status !== "hr_pending"}
                          title={b.status !== "hr_pending" ? "HR approval already done" : ""}
                        >
                          HR Approve
                        </button>
                      ) : null}

                      {canFinanceApprove ? (
                        <button
                          onClick={() => financeApprove(b.batch_id)}
                          className="text-indigo-700 hover:underline text-sm"
                          disabled={loading || b.status !== "finance_pending"}
                        >
                          Finance Approve
                        </button>
                      ) : null}

                      {canFinanceApprove ? (
                        <button
                          onClick={() => payout(b.batch_id)}
                          className="text-green-700 hover:underline text-sm"
                          disabled={loading || b.status !== "approved"}
                        >
                          Payout
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-8 text-gray-500" colSpan={6}>
                    No salary batches yet. Create one from a payroll run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Create Salary Batch</h2>
                <div className="text-sm text-gray-600">
                  Provide existing payroll run + pay period IDs
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-2 py-1 rounded-lg hover:bg-gray-100"
                disabled={loading}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <input
                type="text"
                placeholder="Batch Ref (e.g. APR-2026-SALARY)"
                value={createData.batch_ref}
                onChange={(e) => setCreateData({ ...createData, batch_ref: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
              />
              <input
                type="text"
                placeholder="Payroll Run ID"
                value={createData.payroll_run_id}
                onChange={(e) =>
                  setCreateData({ ...createData, payroll_run_id: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
              />
              <input
                type="text"
                placeholder="Pay Period ID"
                value={createData.pay_period_id}
                onChange={(e) =>
                  setCreateData({ ...createData, pay_period_id: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
              />
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>

              <button
                onClick={createBatch}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                disabled={loading}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
