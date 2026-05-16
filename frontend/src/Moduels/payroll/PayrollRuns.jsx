import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPayrollRun } from "./payrollApi";
import PayrollWorkflowBanner from "./PayrollWorkflowBanner";
import { formatShortId, usePayrollWorkflow } from "./payrollWorkflow";

function formatError(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join("; ");
  }
  return error?.message || "Request failed";
}

export default function PayrollRunsPage() {
  const navigate = useNavigate();
  const {
    workflow,
    setWorkflow,
    organisationId,
    organisationName,
    payPeriodId,
    payPeriodLabel,
    payrollRunId,
    payrollRunLabel,
  } = usePayrollWorkflow();

  const [data, setData] = useState({
    organisation_id: "",
    pay_period_id: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setData({
      organisation_id: organisationId || "",
      pay_period_id: payPeriodId || "",
    });
  }, [organisationId, payPeriodId]);

  const createRun = async () => {
    setError(null);

    if (!data.organisation_id || !data.pay_period_id) {
      setError("Organisation and pay period are required.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: created } = await createPayrollRun(data);
      const label = `Run #${formatShortId(created.payroll_run_id)}`;

      setWorkflow({
        organisationId: created.organisation_id,
        organisationName,
        payPeriodId: created.pay_period_id,
        payPeriodLabel,
        payrollRunId: created.payroll_run_id,
        payrollRunLabel: label,
      });

      navigate("/process-payroll");
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Create Payroll Run</h1>
          <p className="text-gray-500 text-sm">
            Start a payroll process for the selected pay period.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/payrollhome")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm"
        >
          ← Back
        </button>
      </div>

      <PayrollWorkflowBanner
        organisationName={organisationName}
        organisationId={organisationId}
        payPeriodId={payPeriodId}
        payPeriodLabel={payPeriodLabel}
        payrollRunId={payrollRunId}
        payrollRunLabel={payrollRunLabel}
        workflow={workflow}
      />

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Organisation ID</label>
            <input
              value={data.organisation_id}
              readOnly
              className="w-full border rounded-md p-2 bg-gray-50 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Pay period</label>
            {payPeriodLabel && (
              <p className="mb-2 text-sm font-medium text-gray-800">{payPeriodLabel}</p>
            )}
            <input
              value={data.pay_period_id}
              onChange={(e) => setData({ ...data, pay_period_id: e.target.value })}
              placeholder="Pay period ID"
              className="w-full border rounded-md p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={createRun}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-2 rounded-md font-medium"
          >
            {submitting ? "Creating…" : "Create payroll run and continue"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/pay-periods")}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm"
          >
            Change pay period
          </button>
        </div>
      </div>
    </div>
  );
}
