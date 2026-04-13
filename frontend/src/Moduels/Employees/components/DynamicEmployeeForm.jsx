import { useMemo } from "react";
import { EMPLOYEE_FIELDS, EMPLOYEE_GROUPS } from "../employeeFieldSchema";
import { validateEmployeeRecord } from "../employeeValidation";

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder-slate-300";

const errorInputCls =
  "w-full border border-red-300 rounded-lg px-3 py-2.5 text-sm bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition placeholder-slate-300";

const selectCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition text-slate-700 appearance-none cursor-pointer";

function Field({ label, required, error, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function getOptions(list, idKey = "id", nameKey = "name") {
  return (list || []).map((x) => ({
    value: String(x?.[idKey] ?? ""),
    label: String(x?.[nameKey] ?? ""),
  }));
}

export default function DynamicEmployeeForm({
  value,
  onChange,
  mode = "single",
  lookups,
  disabled,
}) {
  const rulesCtx = useMemo(() => ({ mode, lookups }), [mode, lookups]);
  const errors = useMemo(() => validateEmployeeRecord(value || {}, rulesCtx), [value, rulesCtx]);

  const byGroup = useMemo(() => {
    const m = new Map();
    for (const g of EMPLOYEE_GROUPS) m.set(g.key, []);
    for (const f of EMPLOYEE_FIELDS) {
      if (!m.has(f.group)) m.set(f.group, []);
      m.get(f.group).push(f);
    }
    return m;
  }, []);

  const requiredFlags = useMemo(() => {
    const has = (k) => (lookups?.[k] || []).length > 0;
    return {
      department_id: has("departments"),
      designation_id: has("designations"),
      location_id: has("locations"),
    };
  }, [lookups]);

  const set = (k, v) => {
    onChange?.({ ...value, [k]: v });
  };

  return (
    <div className="space-y-6">
      {EMPLOYEE_GROUPS.map((g) => (
        <div key={g.key} className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">{g.title}</h3>
              <p className="text-sm text-slate-500 mt-1">
                Fields are validated from a single shared schema (same rules for manual and bulk).
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(byGroup.get(g.key) || []).map((f) => {
              const v = value?.[f.key] ?? "";
              const isRequired =
                (mode === "bulk" ? !!f.bulk?.required : !!f.required) || !!requiredFlags[f.key];
              const err = errors[f.key];

              if (f.type === "fk") {
                const list = lookups?.[f.fk?.kind] || [];
                const opts = getOptions(list, f.fk?.idKey, f.fk?.nameKey);

                // If lookups exist, show dropdown; otherwise show UUID input
                if (opts.length > 0) {
                  return (
                    <Field key={f.key} label={f.label} required={isRequired} error={err} hint={f.hint}>
                      <div className="relative">
                        <select
                          className={err ? `${selectCls} border-red-300 bg-red-50` : selectCls}
                          value={v}
                          onChange={(e) => set(f.key, e.target.value)}
                          disabled={disabled}
                        >
                          <option value="">{`Select ${f.label}${isRequired ? "" : " (Optional)"}`}</option>
                          {opts.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                          ▾
                        </div>
                      </div>
                    </Field>
                  );
                }

                return (
                  <Field key={f.key} label={f.label} required={isRequired} error={err} hint="Paste UUID (departments/designations/locations not set up yet).">
                    <input
                      className={err ? errorInputCls : inputCls}
                      value={v}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.example}
                      disabled={disabled}
                    />
                  </Field>
                );
              }

              if (f.type === "date") {
                return (
                  <Field key={f.key} label={f.label} required={isRequired} error={err} hint={f.hint}>
                    <input
                      type="date"
                      className={err ? errorInputCls : inputCls}
                      value={v}
                      onChange={(e) => set(f.key, e.target.value)}
                      disabled={disabled}
                    />
                  </Field>
                );
              }

              const type =
                f.type === "email" ? "email" : f.type === "number" ? "number" : "text";

              return (
                <Field key={f.key} label={f.label} required={isRequired} error={err} hint={f.hint}>
                  <input
                    type={type}
                    className={err ? errorInputCls : inputCls}
                    value={v}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.example}
                    disabled={disabled}
                  />
                </Field>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

