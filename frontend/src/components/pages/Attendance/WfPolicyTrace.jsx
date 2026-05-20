import { useEffect, useState } from "react";
import {
  fetchWfPolicyExecutionLogs,
  fetchWfPolicyLogDetail,
} from "../../../Moduels/attendance/wfApi";

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export default function WfPolicyTrace() {
  const range = monthRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [logs, setLogs] = useState([]);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      setLogs(await fetchWfPolicyExecutionLogs({ from_date: from, to_date: to, limit: 100 }));
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const openDetail = async (logId) => {
    try {
      setDetail(await fetchWfPolicyLogDetail(logId));
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Policy Execution Trace</h1>
      <p className="text-sm text-gray-500 mb-4">Orchestrator pipeline explainability (P3).</p>
      <div className="flex gap-3 mb-4">
        <input type="date" className="border rounded px-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="border rounded px-2" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" onClick={load} className="px-4 py-2 bg-teal-600 text-white rounded-lg">
          Load
        </button>
      </div>
      {err && <div className="text-red-600 text-sm mb-4">{err}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <table className="w-full text-sm border rounded-xl overflow-hidden bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">ms</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.log_id} className="border-t">
                <td className="p-2">{l.work_date}</td>
                <td className="p-2">{l.final_status}</td>
                <td className="p-2">{l.duration_ms}</td>
                <td className="p-2">
                  <button
                    type="button"
                    className="text-teal-700 underline"
                    onClick={() => openDetail(l.log_id)}
                  >
                    Trace
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bg-white border rounded-xl p-4 min-h-[200px]">
          <p className="text-sm font-medium mb-2">Execution graph</p>
          {detail ? (
            <pre className="text-xs overflow-auto max-h-[480px] bg-gray-50 p-3 rounded">
              {JSON.stringify(
                { execution_graph: detail.execution_graph, stages: detail.stages },
                null,
                2
              )}
            </pre>
          ) : (
            <p className="text-gray-400 text-sm">Select a log to view pipeline trace.</p>
          )}
        </div>
      </div>
    </div>
  );
}
