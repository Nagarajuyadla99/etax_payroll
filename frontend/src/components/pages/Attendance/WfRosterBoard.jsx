import { useEffect, useState } from "react";
import {
  addWfRosterAssignments,
  approveWfRoster,
  archiveWfRoster,
  createWfRoster,
  fetchWfRosters,
  freezeWfRoster,
  publishWfRoster,
  submitWfRoster,
} from "../../../Moduels/attendance/wfApi";

const STATUS_ACTIONS = {
  draft: [{ key: "submit", label: "Submit for approval", fn: "submit" }],
  pending_approval: [{ key: "approve", label: "Approve", fn: "approve", adminOnly: true }],
  approved: [{ key: "publish", label: "Publish", fn: "publish" }],
  published: [{ key: "freeze", label: "Freeze", fn: "freeze", adminOnly: true }],
  frozen: [{ key: "archive", label: "Archive", fn: "archive", adminOnly: true }],
};

export default function WfRosterBoard() {
  const [rosters, setRosters] = useState([]);
  const [selected, setSelected] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [assign, setAssign] = useState({ employee_id: "", work_date: "", shift_id: "" });

  const selectedRoster = rosters.find((r) => r.roster_plan_id === selected);

  const load = async () => {
    try {
      setRosters(await fetchWfRosters());
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createPlan = async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    try {
      const r = await createWfRoster({
        name: `Roster ${now.toLocaleString("default", { month: "short", year: "numeric" })}`,
        period_start: start.toISOString().slice(0, 10),
        period_end: end.toISOString().slice(0, 10),
      });
      setSelected(r.roster_plan_id);
      setMsg("Roster plan created (draft).");
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  const addAssignment = async () => {
    if (!selected || !assign.employee_id || !assign.work_date) return;
    try {
      await addWfRosterAssignments(selected, [
        {
          employee_id: assign.employee_id,
          work_date: assign.work_date,
          shift_id: assign.shift_id || null,
        },
      ]);
      setMsg("Assignment added.");
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  const runAction = async (fn) => {
    if (!selected) return;
    setMsg("");
    setErr("");
    try {
      if (fn === "submit") await submitWfRoster(selected);
      else if (fn === "approve") await approveWfRoster(selected);
      else if (fn === "publish") await publishWfRoster(selected);
      else if (fn === "freeze") await freezeWfRoster(selected);
      else if (fn === "archive") await archiveWfRoster(selected);
      setMsg(`Roster ${fn} completed.`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };

  const actions = selectedRoster ? STATUS_ACTIONS[selectedRoster.status] || [] : [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Roster Board</h1>
      <p className="text-sm text-gray-500 mb-4">
        Lifecycle: draft → pending approval → approved → published → frozen → archived (P2).
      </p>
      {msg && <div className="mb-2 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-2 text-red-600 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" onClick={createPlan} className="px-3 py-2 border rounded-lg">
          New monthly roster
        </button>
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => runAction(a.fn)}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg"
          >
            {a.label}
          </button>
        ))}
      </div>

      <select
        className="border rounded w-full mb-4 px-3 py-2"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select roster plan</option>
        {rosters.map((r) => (
          <option key={r.roster_plan_id} value={r.roster_plan_id}>
            {r.name} — {r.status} (v{r.version})
          </option>
        ))}
      </select>

      <div className="bg-white border rounded-xl p-4 grid gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Employee UUID"
          value={assign.employee_id}
          onChange={(e) => setAssign({ ...assign, employee_id: e.target.value })}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={assign.work_date}
          onChange={(e) => setAssign({ ...assign, work_date: e.target.value })}
        />
        <button type="button" onClick={addAssignment} className="bg-gray-800 text-white py-2 rounded-lg">
          Add assignment
        </button>
      </div>
    </div>
  );
}
