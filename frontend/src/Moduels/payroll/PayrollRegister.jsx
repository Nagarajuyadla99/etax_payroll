import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPayrollRegister } from "../payroll/payrollApi";
import { usePrefilledPayrollRunId } from "./payrollWorkflow";

export default function PayrollRegister(){
  const navigate = useNavigate()
  const [id,setId] = useState("");
  const [rows,setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  usePrefilledPayrollRunId(setId);

  const fmt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v ?? "");
  };

  const load = async () => {

    if(!id){
      alert("Please enter Payroll Run ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getPayrollRegister(id);
      setRows(res.data.register || []);
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="p-8 bg-gray-50 min-h-screen">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Payroll View
        </h1>

        <p className="text-gray-500 text-sm">
          View employee payroll earnings and deductions
        </p>
         <button
          onClick={() => navigate("/payrollhome")}
          className="bg-gray-200 hover:bg-red-300 text-gray-800 px-4 py-2 rounded-md"
        >
          ← Back
        </button>
      </div>

      {/* Search Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6 max-w-xl">

        <div className="flex gap-4">

          <input
            placeholder="Enter Payroll Run ID"
            value={id}
            onChange={(e)=>setId(e.target.value)}
            className="flex-1 border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          <button
            onClick={load}
            disabled={loading}
            className="bg-indigo-600 hover:bg-green-700 text-white px-6 py-2 rounded-md disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load Register"}
          </button>

        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      </div>


      {/* Table Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="text-left p-3 border-b">Employee</th>
              <th className="text-left p-3 border-b">Mode</th>
              <th className="text-left p-3 border-b">Cal.</th>
              <th className="text-left p-3 border-b">H/WO</th>
              <th className="text-left p-3 border-b">Working</th>
              <th className="text-left p-3 border-b">Payable</th>
              <th className="text-left p-3 border-b">Absent</th>
              <th className="text-left p-3 border-b">Factor</th>
              <th className="text-left p-3 border-b">Earnings</th>
              <th className="text-left p-3 border-b">Deductions</th>
              <th className="text-left p-3 border-b">Net</th>
            </tr>
          </thead>

          <tbody>

            {rows.length === 0 ? (

              <tr>
                <td colSpan="12" className="text-center p-6 text-gray-500">
                  No payroll data loaded
                </td>
              </tr>

            ) : (

              rows.map((r)=>(
                <tr
                  key={r.employee_id}
                  className="hover:bg-gray-50"
                >
                  <td className="p-3 border-b font-mono text-xs">{String(r.employee_id).slice(0, 8)}…</td>
                  <td className="p-3 border-b text-xs text-gray-600">{r.payable_days_mode ?? "—"}</td>
                  <td className="p-3 border-b text-gray-600">{r.calendar_days ?? "—"}</td>
                  <td className="p-3 border-b text-xs text-gray-600">
                    {r.holiday_units != null || r.week_off_units != null
                      ? `${r.holiday_units ?? 0}/${r.week_off_units ?? 0}`
                      : "—"}
                  </td>
                  <td className="p-3 border-b text-gray-600">{r.total_working_days ?? "—"}</td>
                  <td className="p-3 border-b text-gray-600">{r.payable_days ?? "—"}</td>
                  <td className="p-3 border-b text-gray-600">{r.absent_units ?? "—"}</td>
                  <td className="p-3 border-b text-gray-600">{r.wage_proration_factor ?? "—"}</td>
                  <td className="p-3 border-b text-green-600">{fmt(r.earnings)}</td>
                  <td className="p-3 border-b text-red-500">{fmt(r.deductions)}</td>
                  <td className="p-3 border-b font-medium">{fmt(r.net_salary)}</td>
                </tr>
              ))

            )}

          </tbody>

        </table>

      </div>

    </div>

  );
}