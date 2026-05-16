import { useState } from "react";
import { getPayrollSummary } from "../payroll/payrollApi";
import { usePrefilledPayrollRunId } from "./payrollWorkflow";

export default function PayrollSummary(){

  const [id,setId] = useState("");
  const [summary,setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  usePrefilledPayrollRunId(setId);

  const fmt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v ?? "");
  };

  const loadSummary = async () => {

    if(!id){
      alert("Please enter Payroll Run ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getPayrollSummary(id);
      setSummary(res.data);
    } catch (e) {
      setSummary(null);
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="p-8 bg-white min-h-screen">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Payroll Summary
        </h1>
        <p className="text-gray-500 text-sm">
          View total payroll earnings, deductions and net pay
        </p>
      </div>

      {/* Search Card */}
      <div className="bg-white shadow rounded-lg p-6 max-w-xxl mb-6">

        <div className="flex gap-4">

          <input
            placeholder="Enter Payroll Run ID"
            value={id}
            onChange={(e)=>setId(e.target.value)}
            className="flex-1 border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          <button
            onClick={loadSummary}
            disabled={loading}
            className="bg-indigo-600 hover:bg-green-700 text-white px-6 py-2 rounded-md disabled:opacity-60"
          >
            {loading ? "Loading…" : "Get Summary"}
          </button>

        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

      </div>

      {/* Summary Card */}
      {summary && (

        <div className="bg-white shadow rounded-lg p-6 max-w-xxl">

          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Payroll Totals
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">

            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-500">Earnings</p>
              <p className="text-green-600 font-semibold text-lg">
                {fmt(summary.totals.earnings)}
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded">
              <p className="text-gray-500">Deductions</p>
              <p className="text-red-600 font-semibold text-lg">
                {fmt(summary.totals.deductions)}
              </p>
            </div>

            {summary.totals.employer_contributions != null && Number(summary.totals.employer_contributions) !== 0 && (
              <div className="bg-blue-50 p-4 rounded col-span-2 sm:col-span-1">
                <p className="text-gray-500">Employer contributions (not deducted from net)</p>
                <p className="text-blue-700 font-semibold text-lg">
                  {fmt(summary.totals.employer_contributions)}
                </p>
              </div>
            )}

            <div className="bg-red-50 p-4 rounded">
              <p className="text-gray-500">Net Salary</p>
              <p className="text-red-700 font-semibold text-lg">
                {fmt(summary.totals.net)}
              </p>
            </div>

            <div className="bg-gray-100 p-4 rounded">
              <p className="text-gray-500">Entries</p>
              <p className="font-semibold text-lg">
                {summary.entries}
              </p>
            </div>

          </div>

        </div>

      )}

    </div>

  );
}