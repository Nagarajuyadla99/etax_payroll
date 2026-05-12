import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getExecutionTrace } from "./payrollApi";

export default function PayrollTraceViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trace, setTrace] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await getExecutionTrace(id);
        if (!cancelled) setTrace(data);
      } catch (e) {
        const detail = e?.response?.data?.detail;
        if (!cancelled) {
          setError(typeof detail === "string" ? detail : JSON.stringify(detail || e.message));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const dagPlans = trace?.dag_plans_by_template || {};
  const entriesByEmp = trace?.entries_by_employee || {};

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Execution trace</h1>
          <p className="text-gray-500 text-sm font-mono break-all">payroll_run_id: {id}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/process-payroll"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm"
          >
            Process payroll
          </Link>
          <button
            type="button"
            onClick={() => navigate("/payrollhome")}
            className="bg-gray-200 hover:bg-red-300 text-gray-800 px-4 py-2 rounded-md text-sm"
          >
            ← Back
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-600 text-sm">Loading trace…</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded p-4 text-sm">{error}</div>
      )}

      {trace && !loading && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-4 text-sm">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <dt className="text-gray-500">execution_trace_id</dt>
                <dd className="font-mono text-xs">{trace.execution_trace_id || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Templates (gather)</dt>
                <dd className="text-xs">
                  {(trace.gather_snapshot?.templates || []).join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">DAG execution order (by template)</h2>
            <div className="space-y-4">
              {Object.keys(dagPlans).length === 0 && (
                <p className="text-sm text-gray-500">No DAG plans returned.</p>
              )}
              {Object.entries(dagPlans).map(([tplId, plan]) => (
                <div key={tplId} className="border rounded-md p-3 bg-gray-50">
                  <p className="text-xs font-mono text-gray-700 mb-2">template_id: {tplId}</p>
                  {plan?.errors?.length > 0 && (
                    <ul className="text-xs text-red-700 mb-2 list-disc pl-5">
                      {plan.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-gray-600 mb-1">Topological order</p>
                  <ol className="list-decimal pl-5 text-xs font-mono space-y-0.5 max-h-40 overflow-y-auto">
                    {(plan.topological_order || []).map((node, i) => (
                      <li key={i}>{node}</li>
                    ))}
                  </ol>
                  {plan?.sys_nodes && Object.keys(plan.sys_nodes).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Statutory / system nodes</p>
                      <pre className="text-xs bg-white border rounded p-2 mt-1 overflow-auto max-h-32">
                        {JSON.stringify(plan.sys_nodes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Component / statutory lines (persisted)
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Read-only view of payroll entries grouped by employee. Statutory lines typically have{" "}
              <code className="bg-gray-100 px-1 rounded">category: statutory</code> in metadata.
            </p>
            {Object.keys(entriesByEmp).length === 0 && (
              <p className="text-sm text-gray-500">No entries on this run yet.</p>
            )}
            <div className="space-y-4">
              {Object.entries(entriesByEmp).map(([empId, rows]) => {
                const statutory = rows.filter(
                  (r) => (r.category || "").toLowerCase() === "statutory"
                );
                const other = rows.filter(
                  (r) => (r.category || "").toLowerCase() !== "statutory"
                );
                return (
                  <div key={empId} className="border rounded-md overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 text-sm font-mono">employee_id: {empId}</div>
                    {statutory.length > 0 && (
                      <div className="p-3 border-b bg-amber-50/50">
                        <p className="text-xs font-semibold text-amber-900 mb-2">Statutory (PF, etc.)</p>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-600">
                                <th className="p-2">component_code</th>
                                <th className="p-2">amount</th>
                                <th className="p-2">breakdown</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statutory.map((r, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-2 font-mono">{r.component_code}</td>
                                  <td className="p-2 font-mono">{r.amount}</td>
                                  <td className="p-2 font-mono whitespace-pre-wrap max-w-md">
                                    {r.breakdown != null
                                      ? JSON.stringify(r.breakdown)
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Other components (non-statutory)
                      </p>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-600">
                              <th className="p-2">component_code</th>
                              <th className="p-2">category</th>
                              <th className="p-2">amount</th>
                              <th className="p-2">source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {other.map((r, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2 font-mono">{r.component_code}</td>
                                <td className="p-2">{r.category}</td>
                                <td className="p-2 font-mono">{r.amount}</td>
                                <td className="p-2 font-mono">{r.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {trace.stored_execution_meta && Object.keys(trace.stored_execution_meta).length > 0 && (
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Stored execution_meta (reference)</h2>
              <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(trace.stored_execution_meta, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
