import { useState } from "react";
import { applyWfFreeze } from "../../../Moduels/attendance/wfApi";

const LEVELS = [
  { value: "attendance", label: "Attendance freeze" },
  { value: "payroll", label: "Payroll freeze" },
  { value: "financial", label: "Financial freeze" },
];

export default function WfFreeze() {
  const [form, setForm] = useState({
    freeze_level: "attendance",
    range_start: "",
    range_end: "",
    notes: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      const payload = {
        freeze_level: form.freeze_level,
        notes: form.notes || undefined,
      };
      if (form.range_start) payload.range_start = form.range_start;
      if (form.range_end) payload.range_end = form.range_end;
      await applyWfFreeze(payload);
      setMsg(`${form.freeze_level} freeze applied.`);
    } catch (ex) {
      setErr(ex.response?.data?.detail || ex.message);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Freeze Hierarchy</h1>
      <p className="text-sm text-gray-500 mb-4">
        Attendance · Payroll · Financial freezes (P9). Blocks edits per level.
      </p>
      {msg && <div className="mb-2 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-2 text-red-600 text-sm">{err}</div>}

      <form onSubmit={onSubmit} className="bg-white border rounded-xl p-4 grid gap-3">
        <select
          className="border rounded px-3 py-2"
          value={form.freeze_level}
          onChange={(e) => setForm({ ...form, freeze_level: e.target.value })}
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={form.range_start}
          onChange={(e) => setForm({ ...form, range_start: e.target.value })}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={form.range_end}
          onChange={(e) => setForm({ ...form, range_end: e.target.value })}
        />
        <textarea
          className="border rounded px-3 py-2"
          placeholder="Notes"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button type="submit" className="bg-gray-800 text-white py-2 rounded-lg">
          Apply freeze
        </button>
      </form>
    </div>
  );
}
