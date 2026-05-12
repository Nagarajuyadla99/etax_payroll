import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadPayslip, getPayslipData } from "./payslipApi";
import { usePrefilledPayrollRunId } from "../payroll/payrollWorkflow";

export default function PayslipViewer() {
  const navigate = useNavigate();
  const [runId, setRunId] = useState("");
  const [empId, setEmpId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  usePrefilledPayrollRunId(setRunId);

  const loadJson = async () => {
    if (!runId.trim() || !empId.trim()) {
      alert("Enter payroll run ID and employee ID");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await getPayslipData(empId.trim(), runId.trim());
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!runId.trim() || !empId.trim()) {
      alert("Enter payroll run ID and employee ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await downloadPayslip(runId.trim(), empId.trim());
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "payslip.pdf";
      link.click();
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Payslip (stored data)</h1>
          <p className="text-gray-500 text-sm">
            Requires payroll to be <strong>locked</strong> (Phase 4). No recalculation — lines come from
            payroll entries.
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

      <div className="bg-white shadow rounded-lg p-6 max-w-4xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Payroll run ID</label>
            <input
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              className="w-full border rounded-md p-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Employee ID</label>
            <input
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full border rounded-md p-2 font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadJson}
            disabled={loading}
            className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm"
          >
            {loading ? "Loading…" : "View data"}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
          >
            Download PDF
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}

        {data && (
          <div className="border rounded-lg p-4 text-sm space-y-4">
            <div>
              <p className="font-semibold">{data.employee_name}</p>
              <p className="text-xs text-gray-500 font-mono">{data.employee_id}</p>
              {data.organisation?.name && (
                <p className="text-gray-700 mt-2">{data.organisation.name}</p>
              )}
              {data.pay_period?.start_date && (
                <p className="text-xs text-gray-600">
                  Period: {data.pay_period.start_date} — {data.pay_period.end_date}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-gray-800 mb-1">Earnings</p>
                <ul className="text-xs space-y-1">
                  {(data.earnings || []).map((e, i) => (
                    <li key={i}>
                      {e.name}: {Number(e.amount).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Deductions</p>
                <ul className="text-xs space-y-1">
                  {(data.deduction_lines || data.deductions || []).map((e, i) => (
                    <li key={i}>
                      {e.name}: {Number(e.amount).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              {(data.statutory_breakdown || []).length > 0 && (
                <div>
                  <p className="font-medium text-gray-800 mb-1">Statutory breakdown</p>
                  <ul className="text-xs space-y-1">
                    {data.statutory_breakdown.map((e, i) => (
                      <li key={i}>
                        {e.code}: {Number(e.amount).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="border-t pt-2 text-sm">
              <p>Gross: {Number(data.gross_salary).toFixed(2)}</p>
              <p>
                Total deductions:{" "}
                {Number(data.total_deductions ?? data.total_deductions_and_statutory).toFixed(2)}
              </p>
              <p className="font-semibold">Net: {Number(data.net_salary).toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
