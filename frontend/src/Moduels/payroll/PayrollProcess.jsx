import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  formatPayrollProcessError,
  getPayroll,
  newIdempotencyKey,
  processPayroll,
  replayVerifyPayroll,
  resetPayrollForReprocess,
} from "./payrollApi";
import { fetchPayPeriodAttendanceSummary } from "../attendance/attendanceApi";
import PayrollWorkflowBanner from "./PayrollWorkflowBanner";
import { usePayrollWorkflow, usePrefilledPayrollRunId } from "./payrollWorkflow";

function isTerminal(executionStatus, runStatus) {
  if (["completed", "failed", "partial_success"].includes(executionStatus || "")) {
    return true;
  }
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
    draft: "bg-gray-100 text-gray-800 border-gray-300",
  };
  const cls = map[es] || map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      {executionStatus || "—"}
    </span>
  );
}

export default function ProcessPayroll() {
  const navigate = useNavigate();
  const {
    workflow,
    organisationId,
    organisationName,
    payPeriodId,
    payPeriodLabel,
    payrollRunId,
    payrollRunLabel,
  } = usePayrollWorkflow();
  const [payrollId, setPayrollId] = useState("");
  const [shadowLegacy, setShadowLegacy] = useState(false);
  const [parallelism, setParallelism] = useState("");

  const [runSnapshot, setRunSnapshot] = useState(null);
  const [queueMeta, setQueueMeta] = useState({
    celery_task_id: null,
    idempotencyKey: null,
  });
  const [polling, setPolling] = useState(false);
  const [processError, setProcessError] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [regenerateLoading, setRegenerateLoading] = useState(false);

  const pollRef = useRef(null);
  const idempotencyAttemptRef = useRef(null);

  usePrefilledPayrollRunId(setPayrollId);

  useEffect(() => {
    const ppId = runSnapshot?.pay_period_id;
    if (!ppId) {
      setAttendanceSummary(null);
      setAttendanceError(null);
      return undefined;
    }
    let cancelled = false;
    setAttendanceLoading(true);
    setAttendanceError(null);
    fetchPayPeriodAttendanceSummary(ppId)
      .then((data) => {
        if (!cancelled) setAttendanceSummary(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setAttendanceSummary(null);
          setAttendanceError(e?.message || "Could not load attendance summary");
        }
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runSnapshot?.pay_period_id]);

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

  const refreshRun = async (id) => {
    const { data } = await getPayroll(id);
    setRunSnapshot(data);
    return data;
  };

  const startPolling = (id) => {
    stopPolling();
    setPolling(true);
    const tick = async () => {
      try {
        const data = await refreshRun(id);
        const es = data.execution_status;
        const st = data.status;
        if (isTerminal(es, st)) {
          stopPolling();
        }
      } catch (e) {
        setProcessError(e?.response?.data?.detail || e.message || "Poll failed");
        stopPolling();
      }
    };
    tick();
    pollRef.current = setInterval(tick, 3000);
  };

  const runPayroll = async () => {
    if (!payrollId.trim()) {
      alert("Please enter Payroll Run ID");
      return;
    }

    const id = payrollId.trim();
    setProcessError(null);
    setVerifyResult(null);

    const key = idempotencyAttemptRef.current || newIdempotencyKey();
    idempotencyAttemptRef.current = key;

    try {
      const p =
        parallelism === "" ? undefined : Number(parallelism);
      const res = await processPayroll(id, {
        idempotencyKey: key,
        shadowLegacy: shadowLegacy,
        parallelism: Number.isFinite(p) ? p : undefined,
      });

      setQueueMeta({
        celery_task_id: res.data?.celery_task_id || null,
        idempotencyKey: res.idempotencyKey,
      });

      if (res.status === 202) {
        await refreshRun(id);
        startPolling(id);
        idempotencyAttemptRef.current = null;
        return;
      }

      if (res.status === 200) {
        await refreshRun(id);
        stopPolling();
        idempotencyAttemptRef.current = null;
      }
    } catch (e) {
      setProcessError(formatPayrollProcessError(e));
    }
  };

  const regenerateForAttendanceMode = async () => {
    if (!payrollId.trim()) {
      alert("Please enter Payroll Run ID");
      return;
    }
    const id = payrollId.trim();
    setRegenerateLoading(true);
    setProcessError(null);
    try {
      await resetPayrollForReprocess(id);
      idempotencyAttemptRef.current = null;
      await refreshRun(id);
      setProcessError(null);
    } catch (e) {
      setProcessError(formatPayrollProcessError(e));
    } finally {
      setRegenerateLoading(false);
    }
  };

  const verifyPayroll = async () => {
    if (!payrollId.trim()) {
      alert("Please enter Payroll Run ID");
      return;
    }
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await replayVerifyPayroll(payrollId.trim());
      setVerifyResult(res.data);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setVerifyResult({
        error: typeof detail === "string" ? detail : JSON.stringify(detail || e.message),
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const shadowSummary =
    runSnapshot?.execution_meta?.shadow_legacy ??
    runSnapshot?.execution_meta?.shadow_report;

  const mismatches = verifyResult?.replay_mismatches || [];
  const engineErrors = verifyResult?.replay_engine_errors || [];
  const drift = verifyResult?.template_config_drift || {};
  const verifyOk =
    verifyResult &&
    !verifyResult.error &&
    mismatches.length === 0 &&
    engineErrors.length === 0 &&
    Object.keys(drift).length === 0;

  const startedAt = runSnapshot?.created_at;
  const completedAt = runSnapshot?.processed_at;

  const processed = (runSnapshot?.status || "").toLowerCase() === "processed";
  const fmtMoney = (v) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v);
  };

  const snapDbg = runSnapshot?.execution_meta?.input_snapshot?.attendance_debug_by_employee || {};

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Process Payroll</h1>
          <p className="text-gray-500 text-sm">
            Run payroll calculation for the selected payroll run (async polling when Celery is enabled).
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

      <PayrollWorkflowBanner
        organisationName={organisationName}
        organisationId={organisationId}
        payPeriodId={payPeriodId}
        payPeriodLabel={payPeriodLabel}
        payrollRunId={payrollRunId || payrollId}
        payrollRunLabel={payrollRunLabel}
        workflow={workflow}
      />

      <div className="bg-white shadow rounded-lg p-6 max-w-xxl space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Payroll Run ID</label>
            <input
              value={payrollId}
              onChange={(e) => setPayrollId(e.target.value)}
              placeholder="Enter payroll run ID"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
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
            <label className="block text-sm text-gray-600 mb-1">
              Parallelism (optional, sync path only)
            </label>
            <input
              type="number"
              min={1}
              max={64}
              value={parallelism}
              onChange={(e) => setParallelism(e.target.value)}
              placeholder="e.g. 8"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500 max-w-xs"
            />
          </div>
        </div>

        {processError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 space-y-2">
            <p>{processError}</p>
            <button
              type="button"
              onClick={regenerateForAttendanceMode}
              disabled={regenerateLoading || !payrollId.trim()}
              className="text-sm bg-white border border-red-300 hover:bg-red-100 text-red-800 px-3 py-1.5 rounded disabled:opacity-50"
            >
              {regenerateLoading
                ? "Regenerating…"
                : "Regenerate payroll using attendance mode"}
            </button>
          </div>
        )}

        {/* Execution Status Panel */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Execution status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">payroll_run_id</div>
              <div className="font-mono text-xs break-all">
                {runSnapshot?.payroll_run_id || payrollId || "—"}
              </div>
            </div>
            <div>
              <div className="text-gray-500">execution_status</div>
              <div className="mt-1">
                <StatusBadge executionStatus={runSnapshot?.execution_status} />
              </div>
            </div>
            <div>
              <div className="text-gray-500">celery_task_id</div>
              <div className="font-mono text-xs break-all">
                {queueMeta.celery_task_id || "—"}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Idempotency-Key (last attempt)</div>
              <div className="font-mono text-xs break-all">{queueMeta.idempotencyKey || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">started_at (run created)</div>
              <div className="text-xs">{startedAt ? String(startedAt) : "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">completed_at</div>
              <div className="text-xs">{completedAt ? String(completedAt) : "—"}</div>
            </div>
          </div>
          {polling && (
            <p className="text-xs text-blue-700">Polling run state every 3s…</p>
          )}
        </div>

        {(processed || runSnapshot?.gross_pay_total != null) && (
          <div className="border rounded-lg p-4 bg-emerald-50/60 border-emerald-200 space-y-2">
            <h2 className="text-sm font-semibold text-emerald-900">Run totals</h2>
            <p className="text-xs text-emerald-800">
              Net and gross reflect the salary engine after attendance and LOP rules in{" "}
              <code className="bg-white/80 px-1 rounded">hr_settings.payroll</code>{" "}
              (same inputs as stored in <code className="bg-white/80 px-1 rounded">execution_meta.input_snapshot</code>
              ).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600">Gross pay (sum of earnings)</div>
                <div className="text-lg font-semibold text-gray-900">{fmtMoney(runSnapshot?.gross_pay_total)}</div>
              </div>
              <div>
                <div className="text-gray-600">Net pay (after deductions)</div>
                <div className="text-lg font-semibold text-gray-900">{fmtMoney(runSnapshot?.net_pay_total)}</div>
              </div>
              <div className="sm:col-span-2 text-xs text-gray-600">
                Employees processed: {runSnapshot?.execution_meta?.employees_processed ?? "—"}
                {runSnapshot?.execution_meta?.employees_skipped_no_structure != null
                  ? ` · skipped (no salary structure): ${runSnapshot.execution_meta.employees_skipped_no_structure}`
                  : ""}
              </div>
              {(() => {
                const empPayloads = runSnapshot?.execution_meta?.input_snapshot?.employees || [];
                const firstFactor = empPayloads[0]?.wage_proration_factor;
                const empId = empPayloads[0]?.employee_id;
                const prorationAudit =
                  runSnapshot?.execution_meta?.proration_audit_by_employee?.[empId]
                  || Object.values(runSnapshot?.execution_meta?.proration_audit_by_employee || {})[0];
                if (firstFactor && Number(firstFactor) < 1) {
                  const suppressed = prorationAudit?.attendance_proration_suppressed_reason;
                  const applied = prorationAudit?.attendance_proration_applied;
                  return (
                    <div className="sm:col-span-2 text-xs rounded p-2 border bg-white/80 border-emerald-100">
                      Wage proration factor: <strong>{firstFactor}</strong>
                      {applied
                        ? " — applied to eligible earning components"
                        : suppressed
                          ? ` — ${suppressed}`
                          : " — reprocess payroll if gross still shows full salary"}
                    </div>
                  );
                }
                return null;
              })()}
              {(() => {
                const em = runSnapshot?.execution_meta;
                const mode =
                  em?.input_snapshot?.payroll_settings?.payable_days_mode
                  || em?.payroll_settings_at_creation?.payable_days_mode;
                if (!mode) return null;
                const stale = mode !== "attendance_units";
                return (
                  <div
                    className={`sm:col-span-2 text-xs rounded p-2 border ${
                      stale ? "bg-amber-50 border-amber-200" : "bg-white/80 border-emerald-100"
                    }`}
                  >
                    Payroll mode: <strong>{mode}</strong>
                    {stale && (
                      <span className="text-amber-900">
                        {" "}
                        — run was prepared in calendar mode. Regenerate using attendance mode before processing.
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {runSnapshot?.pay_period_id && (
          <div className="border rounded-lg p-4 bg-white border-slate-200 space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">Attendance for this pay period</h2>
            <p className="text-xs text-slate-600">
              Payroll reads the <strong>attendances</strong> table (and approved LOP leave) for the pay period dates,
              then passes <code className="bg-slate-100 px-1 rounded text-[11px]">WORKED_DAYS</code>,{" "}
              <code className="bg-slate-100 px-1 rounded text-[11px]">WAGE_PRORATION_FACTOR</code>,{" "}
              <code className="bg-slate-100 px-1 rounded text-[11px]">LOP_UNITS</code>, etc. into template formulas.
              With <strong>prorate_with_attendance</strong> on template meta, earning lines can auto-multiply by{" "}
              <code className="bg-slate-100 px-1 rounded text-[11px]">WAGE_PRORATION_FACTOR</code> unless the formula
              already references attendance variables (see backend docs).
            </p>
            {attendanceLoading && <p className="text-xs text-slate-500">Loading attendance summary…</p>}
            {attendanceError && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded p-2">{attendanceError}</p>
            )}
            {!attendanceLoading && attendanceSummary?.employees?.length > 0 && (
              <div className="overflow-x-auto max-h-56 border rounded">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="p-2">Employee</th>
                      <th className="p-2">Present</th>
                      <th className="p-2">Absent</th>
                      <th className="p-2">Half day</th>
                      <th className="p-2">LOP leave</th>
                      <th className="p-2">Rows</th>
                      {processed ? (
                        <>
                          <th className="p-2">Payable</th>
                          <th className="p-2">Worked</th>
                          <th className="p-2">LOP units</th>
                          <th className="p-2">Wage factor</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSummary.employees.map((row) => (
                      <tr key={row.employee_id} className="border-t">
                        <td className="p-2 font-mono max-w-[10rem] truncate" title={row.employee_id}>
                          {row.employee_id}
                        </td>
                        <td className="p-2">{row.present_units}</td>
                        <td className="p-2">{row.absent_units}</td>
                        <td className="p-2">{row.half_day_units}</td>
                        <td className="p-2">{row.lop_leave_units}</td>
                        <td className="p-2">{row.recorded_attendance_rows}</td>
                        {processed ? (
                          <>
                            <td className="p-2 font-mono text-[11px]">
                              {snapDbg[row.employee_id]?.PAYABLE_DAYS ?? "—"}
                            </td>
                            <td className="p-2 font-mono text-[11px]">
                              {snapDbg[row.employee_id]?.WORKED_DAYS ?? "—"}
                            </td>
                            <td className="p-2 font-mono text-[11px]">
                              {snapDbg[row.employee_id]?.LOP_UNITS ?? "—"}
                            </td>
                            <td className="p-2 font-mono text-[11px]">
                              {snapDbg[row.employee_id]?.WAGE_PRORATION_FACTOR ?? "—"}
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!attendanceLoading && attendanceSummary?.employees?.length === 0 && !attendanceError && (
              <p className="text-xs text-slate-500">No attendance rows in range yet — payroll will treat LOP from absences as zero unless you record attendance.</p>
            )}
          </div>
        )}

        {shadowSummary && (
          <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">Shadow comparison summary</h3>
            <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(shadowSummary, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end items-center">
          {payrollId.trim() && (
            <span className="mr-auto flex flex-wrap gap-3 text-sm">
              <Link
                to={`/payroll/${encodeURIComponent(payrollId.trim())}/trace`}
                className="text-indigo-600 hover:underline"
              >
                Execution trace →
              </Link>
              <Link to="/payroll-finalize" className="text-indigo-600 hover:underline">
                Finalize (verify / approve / lock) →
              </Link>
            </span>
          )}
          <button
            type="button"
            onClick={verifyPayroll}
            disabled={verifyLoading}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-md text-sm"
          >
            {verifyLoading ? "Verifying…" : "Verify Payroll"}
          </button>
          <button
            type="button"
            onClick={regenerateForAttendanceMode}
            disabled={regenerateLoading || !payrollId.trim()}
            className="bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            {regenerateLoading ? "Regenerating…" : "Regenerate (attendance mode)"}
          </button>
          <button
            type="button"
            onClick={runPayroll}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Process Payroll
          </button>
        </div>

        {verifyResult && (
          <div
            className={`border rounded-lg p-4 space-y-2 ${
              verifyResult.error
                ? "bg-red-50 border-red-200"
                : verifyOk
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
            }`}
          >
            <h3 className="text-sm font-semibold">
              {verifyResult.error
                ? "Verification failed"
                : verifyOk
                  ? "Replay verification: match"
                  : "Replay verification: mismatch"}
            </h3>
            {verifyResult.error && (
              <p className="text-sm text-red-800">{verifyResult.error}</p>
            )}
            {!verifyResult.error && verifyOk && (
              <p className="text-sm text-green-800">
                No mismatches, engine errors, or template drift detected.
              </p>
            )}
            {!verifyResult.error && !verifyOk && (
              <div className="space-y-2 text-sm">
                {Object.keys(drift).length > 0 && (
                  <div>
                    <p className="font-medium text-orange-900">Template config drift</p>
                    <pre className="text-xs overflow-auto max-h-32 bg-white border rounded p-2">
                      {JSON.stringify(drift, null, 2)}
                    </pre>
                  </div>
                )}
                {engineErrors.length > 0 && (
                  <div>
                    <p className="font-medium text-red-900">Engine errors</p>
                    <ul className="list-disc pl-5">
                      {engineErrors.map((er, i) => (
                        <li key={i}>{typeof er === "string" ? er : JSON.stringify(er)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {mismatches.length > 0 && (
                  <div>
                    <p className="font-medium text-red-900">Line mismatches</p>
                    <div className="overflow-x-auto max-h-48 border rounded bg-white">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-left">
                            <th className="p-2">employee_id</th>
                            <th className="p-2">component_code</th>
                            <th className="p-2">details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mismatches.map((m, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2 font-mono">{m.employee_id}</td>
                              <td className="p-2 font-mono">{m.component_code}</td>
                              <td className="p-2 font-mono whitespace-pre-wrap">
                                {JSON.stringify(m)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
