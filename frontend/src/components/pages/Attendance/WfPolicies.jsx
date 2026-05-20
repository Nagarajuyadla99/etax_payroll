import { useEffect, useState } from "react";
import {
  addWfPolicyRule,
  createWfPolicy,
  fetchWfPolicies,
  publishWfPolicy,
} from "../../../Moduels/attendance/wfApi";

const DEFAULT_RULES = [
  { rule_type: "grace_time", priority: 10, condition_json: { grace_minutes: 15 }, action_json: {} },
  { rule_type: "late_entry", priority: 20, condition_json: { late_threshold_minutes: 30 }, action_json: {} },
  { rule_type: "missing_punch", priority: 30, condition_json: {}, action_json: { mark: "half_day" } },
  { rule_type: "overtime", priority: 40, condition_json: { hours_after: 8 }, action_json: {} },
];

export default function WfPolicies() {
  const [policies, setPolicies] = useState([]);
  const [name, setName] = useState("Default attendance policy");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setPolicies(await fetchWfPolicies());
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createAndPublish = async () => {
    setErr("");
    try {
      const pol = await createWfPolicy({ name, scope_level: "organisation" });
      for (const rule of DEFAULT_RULES) {
        await addWfPolicyRule(pol.policy_id, rule);
      }
      await publishWfPolicy(pol.policy_id);
      setMsg("Policy created and published.");
      await load();
    } catch (e) {
      setErr(e.message || "Failed");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Attendance Policies</h1>
      {msg && <div className="mb-3 p-2 bg-green-50 text-green-800 text-sm rounded">{msg}</div>}
      {err && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{err}</div>}

      <div className="bg-white border rounded-xl p-4 mb-6">
        <input
          className="border rounded w-full px-3 py-2 mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Policy name"
        />
        <button
          type="button"
          onClick={createAndPublish}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg"
        >
          Create default policy + publish
        </button>
      </div>

      <ul className="space-y-2">
        {policies.map((p) => (
          <li key={p.policy_id} className="bg-white border rounded-lg px-4 py-3 flex justify-between text-sm">
            <span>
              {p.name} · v{p.version} · <strong>{p.status}</strong>
            </span>
            {p.status === "draft" && (
              <button
                type="button"
                onClick={async () => {
                  await publishWfPolicy(p.policy_id);
                  await load();
                }}
                className="text-teal-700 underline"
              >
                Publish
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
