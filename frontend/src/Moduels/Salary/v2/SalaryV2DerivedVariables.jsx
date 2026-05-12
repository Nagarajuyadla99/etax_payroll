import { useEffect, useMemo, useState } from "react";
import { v2CreateDerivedVariable, v2ListDerivedVariables, v2ValidateFormula } from "./SalaryApiV2";
import { useToast } from "../../Context/ToastContext";

function toErr(e, fallback) {
  return e?.detail || e?.message || fallback;
}

function emptyForm() {
  return { code: "", name: "", expression: "" };
}

export default function SalaryV2DerivedVariables() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState(() => emptyForm());
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await v2ListDerivedVariables();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(toErr(e, "Failed to load derived variables"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canValidate = form.expression.trim().length > 0;
  const canSave = form.code.trim() && form.name.trim() && form.expression.trim();

  const sorted = useMemo(() => rows.slice().sort((a, b) => (a.code || "").localeCompare(b.code || "")), [rows]);

  async function onValidate() {
    if (!canValidate) return;
    try {
      setValidating(true);
      setError("");
      const res = await v2ValidateFormula({ expression: form.expression.trim() });
      setValidation(res);
      if (res && res.is_valid === false) {
        setError(res.error || "Invalid formula");
        toast.error(res.error || "Invalid formula");
      }
    } catch (e) {
      setValidation(null);
      setError(toErr(e, "Formula validation failed"));
      toast.error(toErr(e, "Formula validation failed"));
    } finally {
      setValidating(false);
    }
  }

  async function onCreate() {
    if (!canSave) return;
    try {
      setSaving(true);
      setSubmitted(true);
      setError("");
      await v2CreateDerivedVariable({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        expression: form.expression.trim(),
        is_active: true,
      });
      setForm(emptyForm());
      setValidation(null);
      setSubmitted(false);
      toast.success("Derived variable created.");
      await load();
    } catch (e) {
      setError(toErr(e, "Failed to create derived variable"));
      toast.error(toErr(e, "Failed to create derived variable"));
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
        <h2 className="text-sm font-semibold text-slate-900">Create derived variable</h2>
        <p className="mt-1 text-xs text-slate-500">
          Example: <span className="font-semibold">PF_WAGE</span> = BASIC + DA
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Code</label>
          <input
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm",
              submitted && !form.code.trim() ? "border-red-300" : "border-slate-200",
            ].join(" ")}
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="PF_WAGE"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
          <input
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm",
              submitted && !form.name.trim() ? "border-red-300" : "border-slate-200",
            ].join(" ")}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="PF Wage"
          />
        </div>
        <div className="md:col-span-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">Expression</label>
          <input
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm",
              submitted && !form.expression.trim() ? "border-red-300" : "border-slate-200",
            ].join(" ")}
            value={form.expression}
            onChange={(e) => setForm((p) => ({ ...p, expression: e.target.value }))}
            placeholder="BASIC + DA"
          />
        </div>
      </div>

      {validation?.is_valid ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <div className="font-semibold">Valid formula</div>
          <div className="mt-1 text-emerald-900/80">
            Dependencies:{" "}
            <span className="font-mono">
              {Array.isArray(validation.dependencies) ? validation.dependencies.join(", ") : "—"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onValidate}
          disabled={!canValidate || validating}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          {validating ? "Validating..." : "Validate formula"}
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={!canSave || saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create"}
        </button>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Existing derived variables</h3>
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
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Expression</th>
                <th className="px-3 py-2">Var ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r) => (
                <tr key={r.variable_id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{r.code}</td>
                  <td className="px-3 py-2 text-slate-700">{r.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{r.expression}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.variable_id}</td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                    <div className="space-y-1">
                      <div>No derived variables yet.</div>
                      <div className="text-xs text-slate-400">
                        Suggested starter: <span className="font-semibold">PF_WAGE = BASIC</span>
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

