import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import {
  approvePayrollLifecycle,
  getPayroll,
  getPayrollLifecycleAudit,
  lockPayrollLifecycle,
  verifyPayrollLifecycle,
} from "./payrollApi";
import { usePrefilledPayrollRunId } from "./payrollWorkflow";

const STATE_LABEL = {
  draft: "Draft (awaiting verify)",
  verified: "Verified (awaiting approve)",
  approved: "Approved (awaiting lock)",
  locked: "Locked",
};

export default function PayrollLifecycle() {
  const navigate = useNavigate();
  const { role } = useContext(AuthContext);
  const [runId, setRunId] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [auditItems, setAuditItems] = useState(null);

  usePrefilledPayrollRunId(setRunId);

  const load = async () => {
    if (!runId.trim()) {
      alert("Enter payroll run ID");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { data } = await getPayroll(runId.trim());
      setSnapshot(data);
      setAuditItems(null);
    } catch (e) {
      setSnapshot(null);
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const ls = (snapshot?.lifecycle_status || "").toLowerCase();

  const doVerify = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await verifyPayrollLifecycle(runId.trim());
      setSnapshot(data);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const doApprove = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await approvePayrollLifecycle(runId.trim());
      setSnapshot(data);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const loadAudit = async () => {
    if (!runId.trim()) return;
    setBusy(true);
    try {
      const { data } = await getPayrollLifecycleAudit(runId.trim());
      setAuditItems(data.items || []);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const doLock = async () => {
    if (!window.confirm("Lock this payroll permanently? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await lockPayrollLifecycle(runId.trim());
      setSnapshot(data);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Finalize payroll (Phase 4)</h1>
          <p className="text-gray-500 text-sm">
            Verify → Approve → Lock. Payslips are available only after lock.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/payrollhome")}
          className="bg-gray-200 hover:bg-red-300 text-gray-800 px-4 py-2 rounded-md text-sm"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Payroll run ID</label>
          <div className="flex gap-2">
            <input
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              placeholder="UUID"
              className="flex-1 border rounded-md p-2 font-mono text-sm"
            />
            <button
              type="button"
              onClick={load}
              disabled={busy}
              className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm"
            >
              Load
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {typeof error === "string" ? error : JSON.stringify(error)}
          </div>
        )}

        {snapshot && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3 text-sm">
            <div className="flex flex-wrap gap-2 justify-between">
              <span className="font-medium text-gray-700">Lifecycle</span>
              <span className="text-gray-900">
                {STATE_LABEL[ls] || snapshot.lifecycle_status || "—"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
              <div>Run status: {snapshot.status}</div>
              <div>Execution: {snapshot.execution_status}</div>
              <div>Processed: {snapshot.processed_at ? String(snapshot.processed_at) : "—"}</div>
              <div>Locked at: {snapshot.payroll_locked_at ? String(snapshot.payroll_locked_at) : "—"}</div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {ls === "draft" && (
                <button
                  type="button"
                  disabled={busy || snapshot.status !== "processed"}
                  onClick={doVerify}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
                >
                  Verify payroll
                </button>
              )}
              {ls === "verified" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={doApprove}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Approve payroll
                </button>
              )}
              {ls === "approved" && role === "admin" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={doLock}
                  className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md text-sm"
                >
                  Lock payroll (admin)
                </button>
              )}
              {ls === "approved" && role !== "admin" && (
                <p className="text-xs text-gray-500">Only an admin can lock this payroll.</p>
              )}
            </div>

            {ls === "locked" && runId.trim() && (
              <p className="text-xs pt-2">
                <Link className="text-indigo-600 hover:underline" to="/payslip">
                  Open payslip download / viewer →
                </Link>
              </p>
            )}

            <button
              type="button"
              onClick={loadAudit}
              disabled={busy || !runId.trim()}
              className="mt-2 text-xs text-gray-600 underline"
            >
              Load audit log
            </button>
            {auditItems && auditItems.length > 0 && (
              <ul className="text-xs border rounded p-2 max-h-40 overflow-y-auto bg-white">
                {auditItems.map((a) => (
                  <li key={a.audit_id} className="border-b border-gray-100 py-1">
                    {a.created_at} — {a.action}
                    {a.user_id ? ` (user ${a.user_id})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
