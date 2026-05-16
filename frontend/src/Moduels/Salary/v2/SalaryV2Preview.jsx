import { useEffect, useMemo, useState } from "react";
import { v2Preview } from "./SalaryApiV2";
import { useToast } from "../../Context/ToastContext";
import { usePayrollWorkflow } from "../../payroll/payrollWorkflow";

function toErr(e, fallback) {
  return e?.detail || e?.message || fallback;
}

function pretty(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return String(n ?? "");
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function SalaryV2Preview() {
  const toast = useToast();
  const { payPeriodId } = usePayrollWorkflow();
  const [payload, setPayload] = useState(() => ({
    template_id: "",
    employee_id: "",
    pay_period_id: "",
    as_of_date: "",
    ctc: 120000,
    overrides: {},
    include_engine_audit: false,
  }));

  useEffect(() => {
    if (payPeriodId) {
      setPayload((p) => (p.pay_period_id ? p : { ...p, pay_period_id: payPeriodId }));
    }
  }, [payPeriodId]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canRun = payload.template_id && payload.as_of_date;

  async function run() {
    if (!canRun) return;
    try {
      setLoading(true);
      setSubmitted(true);
      setError("");
      setSuccess("");
      setResult(null);
      const res = await v2Preview({
        template_id: payload.template_id,
        employee_id: payload.employee_id || null,
        pay_period_id: payload.pay_period_id?.trim() || null,
        as_of_date: payload.as_of_date,
        ctc: Number(payload.ctc || 0),
        overrides: payload.overrides || {},
        include_engine_audit: Boolean(payload.include_engine_audit),
      });
      setResult(res);
      setSuccess("Preview completed.");
      toast.success("Preview completed.");
    } catch (e) {
      setError(toErr(e, "Preview failed"));
      toast.error(toErr(e, "Preview failed"));
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => (result ? result.totals || null : null), [result]);

  const grouped = useMemo(() => {
    const lines = Array.isArray(result?.lines) ? result.lines : [];
    const out = {
      earnings: [],
      deductions: [],
      employer_contributions: [],
      statutory: [],
    };
    for (const ln of lines) {
      const cat = String(ln.category || "").toLowerCase();
      if (cat === "earning") out.earnings.push(ln);
      else if (cat === "deduction") out.deductions.push(ln);
      else if (cat === "employer_contribution") out.employer_contributions.push(ln);
      else if (cat === "statutory") out.statutory.push(ln);
      else out.earnings.push(ln);
    }
    return out;
  }, [result]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {String(error)}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {String(success)}
        </div>
      ) : null}

      <div>
        <h2 className="text-sm font-semibold text-slate-900">Preview (v2)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Requires a v2-enabled template and its components/groups already configured.
        </p>
      </div>

      {!result && !loading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div className="font-semibold">Quick checklist</div>
          <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
            <li>Create components (e.g. BASIC, EMP_PF)</li>
            <li>Create derived var PF_WAGE = BASIC</li>
            <li>Create PF statutory config (pf_wage_context_key = PF_WAGE)</li>
            <li>Create PF_GROUP and add EMP_PF as item</li>
            <li>Link PF_GROUP to the template you are previewing</li>
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Template ID</label>
          <input
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm font-mono",
              submitted && !payload.template_id ? "border-red-300" : "border-slate-200",
            ].join(" ")}
            value={payload.template_id}
            onChange={(e) => setPayload((p) => ({ ...p, template_id: e.target.value }))}
            placeholder="uuid"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Employee ID (optional)</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
            value={payload.employee_id}
            onChange={(e) => setPayload((p) => ({ ...p, employee_id: e.target.value }))}
            placeholder="uuid"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">As of date</label>
          <input
            type="date"
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm",
              submitted && !payload.as_of_date ? "border-red-300" : "border-slate-200",
            ].join(" ")}
            value={payload.as_of_date}
            onChange={(e) => setPayload((p) => ({ ...p, as_of_date: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Pay period ID (attendance)</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
            value={payload.pay_period_id}
            onChange={(e) => setPayload((p) => ({ ...p, pay_period_id: e.target.value }))}
            placeholder="uuid — merged with employee_id like payroll"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={payload.include_engine_audit}
              onChange={(e) => setPayload((p) => ({ ...p, include_engine_audit: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Include engine audit in response
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">CTC</label>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={payload.ctc}
            onChange={(e) => setPayload((p) => ({ ...p, ctc: e.target.value }))}
            placeholder="120000"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-700">Overrides (JSON)</div>
            <div className="mt-0.5 text-xs text-slate-500">
              These are merged into the evaluation context (e.g. {"{"}"BASIC":30000{"}"} or {"{"}"pf_applicable":false{"}"}).
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            onClick={() => setPayload((p) => ({ ...p, overrides: { BASIC: 30000, DA: 0 } }))}
          >
            Reset sample
          </button>
        </div>

        <textarea
          className="mt-2 h-32 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
          value={JSON.stringify(payload.overrides || {}, null, 2)}
          onChange={(e) => {
            try {
              const next = JSON.parse(e.target.value || "{}");
              setPayload((p) => ({ ...p, overrides: next }));
              setError("");
            } catch {
              setError("Overrides must be valid JSON.");
            }
          }}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={run}
          disabled={!canRun || loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Running..." : "Run preview"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">Loading preview…</div>
      ) : null}

      {result ? (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-500">
            Trace ID: <span className="font-mono">{result.trace_id || "—"}</span>
          </div>
          {Array.isArray(result.errors) && result.errors.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="font-semibold">Engine warnings/errors</div>
              <ul className="mt-1 list-disc pl-5 text-amber-900/90">
                {result.errors.map((e, idx) => (
                  <li key={idx}>{String(e)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result?.template_engine_meta && !result.template_engine_meta.prorate_with_attendance ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <strong>Template note:</strong> Add{" "}
              <code className="rounded bg-white/70 px-1">prorate_with_attendance: true</code> on the template version
              meta, or run preview with a pay period so attendance can auto-apply when factor is below 1.
            </div>
          ) : null}

          {result?.preview_audit?.attendance_proration_applied ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
              <strong>Attendance proration applied.</strong> Factor{" "}
              {result.preview_audit.wage_proration_factor ?? "—"} on{" "}
              {(result.preview_audit.prorated_components || []).length} earning line(s). Net and earnings totals are
              post-proration.
            </div>
          ) : null}
          {result?.preview_audit?.attendance_proration_suppressed_reason ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {result.preview_audit.attendance_proration_suppressed_reason}
            </div>
          ) : null}

          {result?.preview_audit ? (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <div className="font-semibold text-slate-800">Preview audit</div>
              <pre className="mt-2 overflow-x-auto text-[11px]">{JSON.stringify(result.preview_audit, null, 2)}</pre>
            </div>
          ) : null}

          {result?.template_engine_meta && Object.keys(result.template_engine_meta).length ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <div className="font-semibold text-slate-800">Template engine meta</div>
              <pre className="mt-2 overflow-x-auto text-[11px]">
                {JSON.stringify(result.template_engine_meta, null, 2)}
              </pre>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">Earnings</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{pretty(totals?.earnings)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">Deductions</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{pretty(totals?.deductions)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">Employer</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {pretty(totals?.employer_contributions)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">Net</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{pretty(totals?.net_pay)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Lines title="Earnings" rows={grouped.earnings} />
            <Lines title="Deductions" rows={grouped.deductions} />
            <Lines title="Employer contributions" rows={grouped.employer_contributions} />
            <Lines title="Statutory (system outputs)" rows={grouped.statutory} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Evaluated variables</h3>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              {JSON.stringify(result.variables || {}, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function prorationLineLabel(line) {
  const bd = line?.breakdown || {};
  if (bd.attendance_auto_proration) return "Auto attendance proration";
  const cat = String(line?.category || "").toLowerCase();
  if (cat !== "earning") return "—";
  return "Manual / none";
}

function Lines({ title, rows }) {
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[520px] w-full border-collapse text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Attendance</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, idx) => (
              <tr key={`${r.component_code || r.code}-${idx}`}>
                <td className="px-3 py-2 font-medium text-slate-900">{r.component_code || r.code}</td>
                <td className="px-3 py-2 text-slate-700">{r.name}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{prorationLineLabel(r)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-900">{pretty(r.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                  No lines.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

