import { useEffect, useMemo, useState } from "react";
import { v2CreateStatutoryConfig, v2ListStatutoryConfigs } from "./SalaryApiV2";
import { useToast } from "../../Context/ToastContext";

function toErr(e, fallback) {
  return e?.detail || e?.message || fallback;
}

function emptyForm() {
  return {
    statutory_code: "PF",
    effective_from: "",
    is_enabled: true,
    settings: {
      wage_limit: 15000,
      is_capped: true,
      eps_enabled: true,
      vpf_allowed: true,
      employee_rate: 12,
      employer_rate: 12,
      eps_rate: 8.33,
      epf_rate: 3.67,
      pf_wage_context_key: "PF_WAGE",
    },
  };
}

export default function SalaryV2Statutory() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState(() => emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await v2ListStatutoryConfigs();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(toErr(e, "Failed to load statutory configs"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canSave = form.statutory_code && form.effective_from;

  const sorted = useMemo(() => {
    return rows
      .slice()
      .sort((a, b) => String(b.effective_from || "").localeCompare(String(a.effective_from || "")));
  }, [rows]);

  async function onCreate() {
    if (!canSave) return;
    try {
      setSaving(true);
      setSubmitted(true);
      setError("");
      await v2CreateStatutoryConfig({
        statutory_code: form.statutory_code,
        is_enabled: !!form.is_enabled,
        effective_from: form.effective_from,
        settings: form.settings,
      });
      setForm(emptyForm());
      setSubmitted(false);
      toast.success("Statutory config created.");
      await load();
    } catch (e) {
      setError(toErr(e, "Failed to create statutory config"));
      toast.error(toErr(e, "Failed to create statutory config"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <div className="min-w-0 flex-1 break-words">{String(error)}</div>
          <button
            type="button"
            onClick={load}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div>
        <h2 className="text-sm font-semibold text-slate-900">PF statutory configuration</h2>
        <p className="mt-1 text-xs text-slate-500">
          This feeds the v2 salary engine “system” calculations (PF engine).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Statutory type</label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.statutory_code}
            onChange={(e) => setForm((p) => ({ ...p, statutory_code: e.target.value }))}
          >
            <option value="PF">PF</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Effective from</label>
          <input
            type="date"
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm",
              submitted && !form.effective_from ? "border-red-300" : "border-slate-200",
            ].join(" ")}
            value={form.effective_from}
            onChange={(e) => setForm((p) => ({ ...p, effective_from: e.target.value }))}
          />
        </div>
        <div className="flex items-end justify-end">
          <button
            type="button"
            onClick={onCreate}
            disabled={!canSave || saving}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 md:w-auto"
          >
            {saving ? "Saving..." : "Create config"}
          </button>
        </div>

        <div className="md:col-span-3 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Wage limit</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.settings.wage_limit}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    settings: { ...p.settings, wage_limit: Number(e.target.value) },
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Employee rate</label>
              <input
                type="number"
                step="0.0001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.settings.employee_rate}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    settings: { ...p.settings, employee_rate: Number(e.target.value) },
                  }))
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">Percent (e.g. 12 for 12%).</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Capped?</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={String(!!form.settings.is_capped)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    settings: { ...p.settings, is_capped: e.target.value === "true" },
                  }))
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">EPS enabled?</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={String(!!form.settings.eps_enabled)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    settings: { ...p.settings, eps_enabled: e.target.value === "true" },
                  }))
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">VPF allowed?</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={String(!!form.settings.vpf_allowed)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    settings: { ...p.settings, vpf_allowed: e.target.value === "true" },
                  }))
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Enabled?</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={String(!!form.is_enabled)}
                onChange={(e) => setForm((p) => ({ ...p, is_enabled: e.target.value === "true" }))}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Existing configs</h3>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[860px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Effective</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Wage limit</th>
                <th className="px-3 py-2">Config ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r) => (
                <tr key={r.config_id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{r.statutory_code}</td>
                  <td className="px-3 py-2 text-slate-700">{String(r.effective_from || "")}</td>
                  <td className="px-3 py-2 text-slate-700">{String(r.is_enabled ?? "—")}</td>
                  <td className="px-3 py-2 text-slate-700">{String(r.settings?.wage_limit ?? "—")}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.config_id}</td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    <div className="space-y-1">
                      <div>No statutory configs yet.</div>
                      <div className="text-xs text-slate-400">
                        To enable PF in preview, create a PF config with{" "}
                        <span className="font-semibold">pf_wage_context_key = PF_WAGE</span>.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

