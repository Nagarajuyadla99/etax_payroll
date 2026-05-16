import { useEffect, useMemo, useState } from "react";
import { v2CreateComponent, v2ListComponents } from "./SalaryApiV2";
import { useToast } from "../../Context/ToastContext";

const CATEGORY_OPTIONS = [
  { value: "earning", label: "Earning" },
  { value: "deduction", label: "Deduction" },
  { value: "employer_contribution", label: "Employer contribution" },
  { value: "statutory", label: "Statutory" },
];

const CALC_OPTIONS = [
  { value: "fixed", label: "Fixed" },
  { value: "formula", label: "Formula" },
  { value: "system", label: "System (statutory engine)" },
];

function emptyForm() {
  return {
    code: "",
    name: "",
    description: "",
    component_category: "earning",
    calculation_type: "fixed",
    formula_expression: "",
    system_code: "",
    rounding_rule: { scale: 2 },
    meta: {},
    attendance_proration_mode: "",
    is_active: true,
  };
}

function categoryBadgeClass(category) {
  if (category === "deduction") return "bw-badge-deduction";
  if (category === "employer_contribution" || category === "statutory") return "bw-badge-neutral";
  return "bw-badge-earning";
}

export default function SalaryV2Components() {
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
      const data = await v2ListComponents();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.detail || e?.message || "Failed to load v2 components");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const showFormula = form.calculation_type === "formula";
  const showSystem = form.calculation_type === "system";

  const canSubmit =
    form.code.trim() &&
    form.name.trim() &&
    (!showFormula || form.formula_expression.trim()) &&
    (!showSystem || form.system_code.trim());

  const filtered = useMemo(() => rows.slice().sort((a, b) => (a.code || "").localeCompare(b.code || "")), [rows]);

  async function onCreate() {
    if (!canSubmit) return;
    try {
      setSaving(true);
      setSubmitted(true);
      setError("");
      const { attendance_proration_mode, ...restForm } = form;
      await v2CreateComponent({
        ...restForm,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description?.trim() || null,
        formula_expression: showFormula ? form.formula_expression.trim() : null,
        system_code: showSystem ? form.system_code.trim().toUpperCase() : null,
        meta: (() => {
          const m = { ...(form.meta || {}) };
          if (form.component_category === "earning" && attendance_proration_mode) {
            m.attendance_proration_mode = attendance_proration_mode;
          } else {
            delete m.attendance_proration_mode;
          }
          return m;
        })(),
      });
      setForm(emptyForm());
      setSubmitted(false);
      toast.success("Component created.");
      await load();
    } catch (e) {
      setError(e?.detail || e?.message || "Failed to create component");
      toast.error(e?.detail || e?.message || "Failed to create component");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bw-stack">
      <div>
        <h2 className="bw-section-title">Add component</h2>
        <p className="bw-section-hint">Use stable codes such as BASIC, HRA, or EMP_PF for reusable salary lines.</p>
      </div>

      {error ? (
        <div className="bw-alert-error">
          <div className="min-w-0 flex-1 break-words">{String(error)}</div>
          <button type="button" onClick={load} className="bw-btn bw-btn-secondary">
            Retry
          </button>
        </div>
      ) : null}

      <div className="bw-form-grid">
        <div className="bw-field xl-4">
          <label className="bw-label" htmlFor="v2-code">
            Code
          </label>
          <input
            id="v2-code"
            className={`bw-input${submitted && !form.code.trim() ? " invalid" : ""}`}
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="BASIC"
          />
        </div>
        <div className="bw-field xl-4">
          <label className="bw-label" htmlFor="v2-name">
            Name
          </label>
          <input
            id="v2-name"
            className={`bw-input${submitted && !form.name.trim() ? " invalid" : ""}`}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Basic"
          />
        </div>
        <div className="bw-field xl-4">
          <label className="bw-label" htmlFor="v2-category">
            Category
          </label>
          <select
            id="v2-category"
            className="bw-select"
            value={form.component_category}
            onChange={(e) => setForm((p) => ({ ...p, component_category: e.target.value }))}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {form.component_category === "earning" ? (
          <div className="bw-field xl-4">
            <label className="bw-label" htmlFor="v2-apm">
              Attendance proration mode
            </label>
            <select
              id="v2-apm"
              className="bw-select"
              value={form.attendance_proration_mode}
              onChange={(e) => setForm((p) => ({ ...p, attendance_proration_mode: e.target.value }))}
            >
              <option value="">Default (auto when template prorate on)</option>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        ) : null}
        <div className="bw-field xl-4">
          <label className="bw-label" htmlFor="v2-calc">
            Calculation type
          </label>
          <select
            id="v2-calc"
            className="bw-select"
            value={form.calculation_type}
            onChange={(e) => setForm((p) => ({ ...p, calculation_type: e.target.value }))}
          >
            {CALC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {showFormula ? (
          <div className="bw-field xl-8">
            <label className="bw-label" htmlFor="v2-formula">
              Formula expression
            </label>
            <input
              id="v2-formula"
              className={`bw-input${submitted && !form.formula_expression.trim() ? " invalid" : ""}`}
              value={form.formula_expression}
              onChange={(e) => setForm((p) => ({ ...p, formula_expression: e.target.value }))}
              placeholder="BASIC * 0.4"
            />
          </div>
        ) : null}
        {showSystem ? (
          <div className="bw-field xl-4">
            <label className="bw-label" htmlFor="v2-system">
              System code
            </label>
            <input
              id="v2-system"
              className={`bw-input${submitted && !form.system_code.trim() ? " invalid" : ""}`}
              value={form.system_code}
              onChange={(e) => setForm((p) => ({ ...p, system_code: e.target.value }))}
              placeholder="PF"
            />
          </div>
        ) : null}
        <div className="bw-field xl-4">
          <label className="bw-label" htmlFor="v2-rounding">
            Rounding scale
          </label>
          <input
            id="v2-rounding"
            type="number"
            min="0"
            className="bw-input"
            value={form.rounding_rule?.scale ?? 2}
            onChange={(e) =>
              setForm((p) => ({ ...p, rounding_rule: { ...(p.rounding_rule || {}), scale: Number(e.target.value) } }))
            }
          />
        </div>
      </div>

      <div className="bw-actions">
        <button type="button" disabled={!canSubmit || saving} onClick={onCreate} className="bw-btn bw-btn-primary">
          {saving ? "Saving..." : "Create component"}
        </button>
      </div>

      <div>
        <div className="bw-actions" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h3 className="bw-section-title">Existing components</h3>
          <button type="button" onClick={load} disabled={loading} className="bw-btn bw-btn-secondary">
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        <div className="bw-table-wrap">
          <table className="bw-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Calculation</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.component_id}>
                  <td style={{ fontWeight: 600, color: "var(--slate-900)" }}>{r.code}</td>
                  <td>{r.name}</td>
                  <td>
                    <span className={`bw-badge ${categoryBadgeClass(r.component_category)}`}>{r.component_category}</span>
                  </td>
                  <td>
                    <span className="bw-badge bw-badge-neutral">{r.calculation_type}</span>
                  </td>
                  <td className="text-xs text-slate-600">
                    {r.component_category === "earning"
                      ? r.meta?.attendance_proration_mode || "—"
                      : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="bw-table-empty" colSpan={5}>
                    No components yet. Start with BASIC as an earning with a fixed amount.
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
