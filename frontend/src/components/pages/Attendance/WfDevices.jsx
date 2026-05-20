import { useEffect, useState } from "react";
import { fetchWfDevices, registerWfDevice } from "../../../Moduels/attendance/wfApi";

export default function WfDevices() {
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState({ terminal_code: "", device_type: "biometric", location: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      setDevices(await fetchWfDevices());
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRegister = async (e) => {
    e.preventDefault();
    if (!form.terminal_code.trim()) return;
    try {
      await registerWfDevice(form);
      setMsg("Terminal registered.");
      setForm({ terminal_code: "", device_type: "biometric", location: "" });
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.detail || ex.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Terminal Registry</h1>
      <p className="text-sm text-gray-500 mb-4">Attendance devices for biometric / factory terminals (P5).</p>
      {msg && <div className="mb-2 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-2 text-red-600 text-sm">{err}</div>}

      <form onSubmit={onRegister} className="bg-white border rounded-xl p-4 grid gap-3 mb-6">
        <input
          className="border rounded px-3 py-2"
          placeholder="Terminal code"
          value={form.terminal_code}
          onChange={(e) => setForm({ ...form, terminal_code: e.target.value })}
        />
        <select
          className="border rounded px-3 py-2"
          value={form.device_type}
          onChange={(e) => setForm({ ...form, device_type: e.target.value })}
        >
          <option value="biometric">Biometric</option>
          <option value="rfid">RFID</option>
          <option value="mobile">Mobile</option>
        </select>
        <input
          className="border rounded px-3 py-2"
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <button type="submit" className="bg-teal-600 text-white py-2 rounded-lg">
          Register device
        </button>
      </form>

      <table className="w-full text-sm border rounded-xl overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Terminal</th>
            <th className="text-left p-3">Type</th>
            <th className="text-left p-3">Health</th>
            <th className="text-left p-3">Last sync</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.device_id} className="border-t">
              <td className="p-3">{d.terminal_code}</td>
              <td className="p-3">{d.device_type}</td>
              <td className="p-3">{d.health_status || "unknown"}</td>
              <td className="p-3">{d.last_sync_at ? new Date(d.last_sync_at).toLocaleString() : "—"}</td>
            </tr>
          ))}
          {!devices.length && (
            <tr>
              <td colSpan={4} className="p-4 text-gray-500 text-center">
                No devices registered.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
