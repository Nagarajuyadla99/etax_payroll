import { useEffect, useState } from "react";
import {
  fetchWfAnalytics,
  refreshWfProjections,
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

export default function WfDashboard() {
  const range = monthRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setErr("");
    try {
      setData(await fetchWfAnalytics(from, to));
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  const refreshProjections = async () => {
    setMsg("");
    try {
      const r = await refreshWfProjections(from, to);
      setMsg(`Projections refreshed: ${r.refreshed_rows} rows.`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  useEffect(() => {
    load();
  }, [from, to]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Attendance Analytics</h1>
      <p className="text-sm text-gray-500 mb-4">
        Uses materialized projections when available (P10); otherwise operational tables.
      </p>
      <div className="flex flex-wrap gap-3 mb-6">
        <input type="date" className="border rounded px-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="border rounded px-2" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" onClick={load} className="px-4 py-2 bg-teal-600 text-white rounded-lg">
          Refresh
        </button>
        <button type="button" onClick={refreshProjections} className="px-4 py-2 border rounded-lg">
          Rebuild projections
        </button>
      </div>
      {msg && <div className="text-green-700 text-sm mb-4">{msg}</div>}
      {err && <div className="text-red-600 text-sm mb-4">{err}</div>}
      {data && (
        <>
          {data.data_source && (
            <p className="text-xs text-gray-500 mb-2">Data source: {data.data_source}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500">Open exceptions</p>
              <p className="text-2xl font-bold">{data.open_exceptions}</p>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500">Raw events</p>
              <p className="text-2xl font-bold">{data.raw_events}</p>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500">Recompute jobs</p>
              <p className="text-2xl font-bold">{data.recompute_jobs_total}</p>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Status mix</p>
              <ul className="text-sm">
                {Object.entries(data.status_counts || {}).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
