import { useEffect, useState } from "react";
import API from "../../../services/api";
import { ingestWfRawEvent } from "../../../Moduels/attendance/wfApi";

export default function WfLivePunches() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    employee_id: "",
    event_type: "IN",
    source: "manual_hr",
  });
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const res = await API.get("/wf/events", { params: { limit: 50 } });
      setEvents(res.data);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) return;
    setErr("");
    try {
      await ingestWfRawEvent({
        employee_id: form.employee_id,
        source: form.source,
        event_type: form.event_type,
        punch_time: new Date().toISOString(),
      });
      await load();
    } catch (ex) {
      setErr(ex.message || "Ingest failed — enable wf_raw_events flag");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Live Punch Monitor</h1>
      {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}

      <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-6 grid md:grid-cols-4 gap-3">
        <input
          className="border rounded px-3 py-2 md:col-span-2"
          placeholder="Employee UUID"
          value={form.employee_id}
          onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
        />
        <select
          className="border rounded px-3 py-2"
          value={form.event_type}
          onChange={(e) => setForm({ ...form, event_type: e.target.value })}
        >
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
        <button type="submit" className="bg-teal-600 text-white rounded-lg">
          Record punch
        </button>
      </form>

      <table className="w-full bg-white border rounded-xl text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Time</th>
            <th className="p-2 text-left">Employee</th>
            <th className="p-2 text-left">Type</th>
            <th className="p-2 text-left">Source</th>
            <th className="p-2 text-left">Flags</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.event_id} className="border-t">
              <td className="p-2">{new Date(ev.punch_time).toLocaleString()}</td>
              <td className="p-2 font-mono text-xs">{String(ev.employee_id).slice(0, 8)}…</td>
              <td className="p-2">{ev.event_type}</td>
              <td className="p-2">{ev.source}</td>
              <td className="p-2 text-xs">
                {ev.duplicate_flag && "dup "}
                {ev.anomaly_flag && "anomaly"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
