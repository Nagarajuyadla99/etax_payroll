import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPayPeriod } from "./payrollApi";
import PayrollWorkflowBanner from "./PayrollWorkflowBanner";
import { usePayrollWorkflow } from "./payrollWorkflow";

function formatError(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join("; ");
  }
  return error?.message || "Request failed";
}

export default function PayPeriods() {
  const navigate = useNavigate();
  const {
    workflow,
    setWorkflow,
    organisationId,
    organisationName,
    payPeriodId,
    payPeriodLabel,
  } = usePayrollWorkflow();

  const [form, setForm] = useState({
    organisation_id: "",
    start_date: "",
    end_date: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (organisationId) {
      setForm((current) => ({
        ...current,
        organisation_id: current.organisation_id || organisationId,
      }));
    }
  }, [organisationId]);

  const submit = async () => {
    setError(null);

    if (!form.organisation_id || !form.start_date || !form.end_date) {
      setError("Organisation, start date, and end date are required.");
      return;
    }

    if (form.end_date < form.start_date) {
      setError("End date must be on or after the start date.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await createPayPeriod(form);
      const label = `${data.start_date} → ${data.end_date}`;

      setWorkflow({
        organisationId: data.organisation_id,
        organisationName,
        payPeriodId: data.pay_period_id,
        payPeriodLabel: label,
        payPeriodStart: data.start_date,
        payPeriodEnd: data.end_date,
      });

      navigate("/payroll-runs");
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Create Pay Period</h1>
          <p className="text-gray-500 text-sm">
            Define the payroll period. After creation you will continue to payroll run setup.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/payrollhome")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
        >
          ← Back
        </button>
      </div>

      <PayrollWorkflowBanner
        organisationName={organisationName}
        organisationId={organisationId}
        payPeriodId={payPeriodId}
        payPeriodLabel={payPeriodLabel}
        workflow={workflow}
      />

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Organisation</label>
            <input
              className="w-full border rounded-md p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.organisation_id}
              readOnly
            />
            {organisationName && (
              <p className="mt-1 text-xs text-gray-500">Signed in as {organisationName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Start date</label>
            <input
              type="date"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">End date</label>
            <input
              type="date"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-2 rounded-md"
          >
            {submitting ? "Creating…" : "Create pay period and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
