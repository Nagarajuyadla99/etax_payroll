import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { batchProcessPayrolls, getPayroll, newIdempotencyKey } from "./payrollApi";
import { readPayrollWorkflow } from "./payrollWorkflow";

function parseIds(raw) {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isTerminal(executionStatus, runStatus) {
  if (["completed", "failed", "partial_success"].includes(executionStatus || "")) return true;
  if (runStatus === "processed") return true;
  return false;
}

function StatusBadge({ executionStatus }) {
  const es = (executionStatus || "draft").toLowerCase();
  const map = {
    queued: "bg-yellow-100 text-yellow-900 border-yellow-300",
    running: "bg-blue-100 text-blue-900 border-blue-300",
    completed: "bg-green-100 text-green-900 border-green-300",
    failed: "bg-red-100 text-red-900 border-red-300",
    partial_success: "bg-orange-100 text-orange-900 border-orange-300",
    error: "bg-red-100 text-red-900 border-red-300",
    draft: "bg-gray-100 text-gray-800 border-gray-300",
  };
  const cls = map[es] || map.draft;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      {executionStatus || "—"}
    </span>
  );
}

export default function PayrollBatchProcess() {
  const navigate = useNavigate();
  const [rawIds, setRawIds] = useState("");
  const [shadowLegacy, setShadowLegacy] = useState(false);
  const [parallelism, setParallelism] = useState("");

  const [submitError, setSubmitError] = useState(null);
  const [batchMeta, setBatchMeta] = useState({ idempotencyKey: null, celery_task_ids: [] });
  const [rows, setRows] = useState([]);
  const [polling, setPolling] = useState(false);

  const pollRef = useRef(null);
  const taskIdsRef = useRef([]);

  useEffect(() => {
    const wf = readPayrollWorkflow();
    if (wf.payrollRunId) {
      setRawIds((current) => current || wf.payrollRunId);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const refreshAll = async (ids, celeryTaskIds = []) => {
    const next = await Promise.all(
      ids.map(async (rid, i) => {
        try {
          const { data } = await getPayroll(rid);
          return {
            payroll_run_id: rid,
            execution_status: data.execution_status,
            status: data.status,
            processed_at: data.processed_at,
            celery_task_id: celeryTaskIds[i] ?? null,
          };
        } catch (e) {
          return {
            payroll_run_id: rid,
            execution_status: "error",
            status: null,
            processed_at: null,
            celery_task_id: celeryTaskIds[i] ?? null,
            error:
              (typeof e?.response?.data?.detail === "string"
                ? e.response.data.detail
                : null) || e.message,
          };
        }
      })
    );
    setRows(next);
    return next;
  };

  const startPolling = (ids) => {
    stopPolling();
    setPolling(true);
    const taskIds = taskIdsRef.current;
    const tick = async () => {
      const snapshot = await refreshAll(ids, taskIds);
      const allDone = snapshot.every((r) =>
        isTerminal(r.execution_status, r.status)
      );
      if (allDone) stopPolling();
    };
    tick();
    pollRef.current = setInterval(tick, 3000);
  };

  const runBatch = async () => {
    const ids = parseIds(rawIds);
    if (ids.length === 0) {
      alert("Enter at least one payroll run ID");
      return;
    }

    setSubmitError(null);
    const idempo = newIdempotencyKey();

    try {
      const p =
        parallelism === "" ? undefined : Number(parallelism);
      const res = await batchProcessPayrolls(ids, {
        idempotencyKey: idempo,
        shadowLegacy,
        parallelism: Number.isFinite(p) ? p : undefined,
      });

      const taskIds = res.data?.celery_task_ids || [];
      taskIdsRef.current = taskIds;
      setBatchMeta({
        idempotencyKey: res.idempotencyKey,
        celery_task_ids: taskIds,
      });

      if (res.status === 202) {
        await refreshAll(ids, taskIds);
        startPolling(ids);
        return;
      }

      if (res.status === 200) {
        await refreshAll(ids, []);
      }
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setSubmitError(typeof detail === "string" ? detail : JSON.stringify(detail || e.message));
    }
  };

  const doneCount = rows.filter((r) => isTerminal(r.execution_status, r.status)).length;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Batch process payroll</h1>
          <p className="text-gray-500 text-sm">
            POST /payrolls/batch/process — multiple runs with async status when Celery is enabled.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/payrollhome")}
          className="bg-gray-200 hover:bg-red-300 text-gray-800 px-4 py-2 rounded-md"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-4xl space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Payroll run IDs</label>
          <textarea
            value={rawIds}
            onChange={(e) => setRawIds(e.target.value)}
            placeholder="One UUID per line, or comma-separated"
            rows={5}
            className="w-full border rounded-md p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={shadowLegacy}
            onChange={(e) => setShadowLegacy(e.target.checked)}
            className="rounded border-gray-300"
          />
          Compare with legacy payroll (shadow mode)
        </label>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Parallelism (optional)</label>
          <input
            type="number"
            min={1}
            max={64}
            value={parallelism}
            onChange={(e) => setParallelism(e.target.value)}
            className="border rounded-md p-2 w-32"
          />
        </div>

        {submitError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {submitError}
          </div>
        )}

        <div className="border rounded-lg p-3 bg-gray-50 text-sm space-y-1">
          <p>
            <span className="text-gray-500">Last Idempotency-Key:</span>{" "}
            <span className="font-mono text-xs break-all">{batchMeta.idempotencyKey || "—"}</span>
          </p>
          {polling && <p className="text-blue-700 text-xs">Polling each run every 3s…</p>}
          {rows.length > 0 && (
            <p className="text-gray-700">
              Progress: {doneCount} / {rows.length} terminal
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={runBatch}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Start batch
          </button>
        </div>

        {rows.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">payroll_run_id</th>
                  <th className="p-2">execution_status</th>
                  <th className="p-2">run status</th>
                  <th className="p-2">celery_task_id</th>
                  <th className="p-2">processed_at</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.payroll_run_id} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.payroll_run_id}</td>
                    <td className="p-2">
                      {r.error ? (
                        <span className="text-red-700 text-xs">{r.error}</span>
                      ) : (
                        <StatusBadge executionStatus={r.execution_status} />
                      )}
                    </td>
                    <td className="p-2 text-xs">{r.status ?? "—"}</td>
                    <td className="p-2 font-mono text-xs break-all max-w-[140px]">
                      {r.celery_task_id || "—"}
                    </td>
                    <td className="p-2 text-xs">{r.processed_at ? String(r.processed_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
