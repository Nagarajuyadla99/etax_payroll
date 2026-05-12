import { payPeriodLabel, payrollRunLabel } from "./payrollWorkflow";

export default function PayrollWorkflowBanner({
  organisationName,
  organisationId,
  payPeriodId,
  payPeriodLabel: periodLabel,
  payrollRunId,
  payrollRunLabel: runLabel,
  workflow,
}) {
  const wf = workflow || {};
  const orgName = organisationName || wf.organisationName;
  const orgId = organisationId || wf.organisationId;
  const periodId = payPeriodId || wf.payPeriodId;
  const runId = payrollRunId || wf.payrollRunId;
  const periodText = periodLabel || payPeriodLabel(wf);
  const runText = runLabel || payrollRunLabel(wf);

  if (!orgId && !periodId && !runId) return null;

  return (
    <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-gray-800">
      <p className="font-medium text-indigo-900">Current payroll context</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {orgId && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Organisation</p>
            <p className="font-medium">{orgName || "Your organisation"}</p>
            <p className="font-mono text-xs text-gray-500 break-all">{orgId}</p>
          </div>
        )}
        {periodId && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Pay period</p>
            <p className="font-medium">{periodText || "Selected period"}</p>
            <p className="font-mono text-xs text-gray-500 break-all">{periodId}</p>
          </div>
        )}
        {runId && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Payroll run</p>
            <p className="font-medium">{runText || "Selected run"}</p>
            <p className="font-mono text-xs text-gray-500 break-all">{runId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
