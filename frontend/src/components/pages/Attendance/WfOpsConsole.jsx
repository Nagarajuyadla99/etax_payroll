import { useEffect, useState } from "react";
import {
  fetchWfOpsMetrics,
  fetchWfQueueMetrics,
  fetchWfWorkerHealth,
} from "../../../Moduels/attendance/wfApi";

export default function WfOpsConsole() {
  const [metrics, setMetrics] = useState(null);
  const [queue, setQueue] = useState(null);
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [m, q, h] = await Promise.all([
        fetchWfOpsMetrics(),
        fetchWfQueueMetrics(),
        fetchWfWorkerHealth(),
      ]);
      setMetrics(m);
      setQueue(q);
      setHealth(h);
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counters = metrics?.counters || metrics || {};
  const gauges = metrics?.gauges || {};

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold">WF Operations</h1>
          <p className="text-sm text-gray-500">Queue, recompute, ingest latency, worker health (P4).</p>
        </div>
        <button type="button" onClick={load} className="px-4 py-2 bg-teal-600 text-white rounded-lg">
          Refresh
        </button>
      </div>
      {err && <div className="text-red-600 text-sm mb-4">{err}</div>}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Worker health</p>
          <p className="text-lg font-semibold">{health?.status || "—"}</p>
          <p className="text-xs text-gray-500 mt-1">
            Workers: {(health?.workers || []).length} · Active tasks: {health?.active_tasks ?? "—"}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Punch ingest latency (ms)</p>
          <p className="text-lg font-semibold">
            {gauges["wf_punch_ingest_latency_ms"] ?? gauges["wf_punch_ingest_latency_ms:"] ?? "—"}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Queue metrics</p>
          <ul className="text-sm">
            {Object.entries(queue || {}).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
            {!Object.keys(queue || {}).length && <li className="text-gray-400">No queue events yet</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <p className="text-sm font-medium mb-2">Counters</p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm max-h-64 overflow-auto">
          {Object.entries(counters).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b py-1">
              <span className="text-gray-600 truncate pr-2">{k}</span>
              <span className="font-mono">{v}</span>
            </div>
          ))}
          {!Object.keys(counters).length && <p className="text-gray-400">No metrics recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
