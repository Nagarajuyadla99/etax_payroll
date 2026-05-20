import { useState } from "react";
import { useWfLabels } from "../../../hooks/useWfLabels";
import { patchWfLabels } from "../../../Moduels/attendance/wfApi";

const EDITABLE_KEYS = [
  "attendance.entity",
  "employee.entity",
  "shift.entity",
  "present.label",
  "absent.label",
  "ot.label",
  "weekoff.label",
];

export default function WfLabels() {
  const { labels, version, reload, t } = useWfLabels();
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    try {
      const items = Object.entries(draft).map(([label_key, value]) => ({ label_key, value }));
      if (!items.length) return;
      await patchWfLabels({ labels: items });
      setDraft({});
      setMsg("Labels updated.");
      await reload();
    } catch (e) {
      setErr(e.message || "Save failed");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Terminology / Labels</h1>
      <p className="text-sm text-gray-500 mb-4">Version {version}</p>
      {msg && <div className="mb-3 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}
      <ul className="space-y-3 bg-white border rounded-xl p-4">
        {EDITABLE_KEYS.map((key) => (
          <li key={key}>
            <label className="text-xs text-gray-500 block">{key}</label>
            <input
              className="border rounded w-full px-3 py-2 mt-1"
              defaultValue={labels[key] || t(key)}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={save}
        className="mt-4 w-full bg-teal-600 text-white py-2 rounded-lg"
      >
        Save labels
      </button>
    </div>
  );
}
