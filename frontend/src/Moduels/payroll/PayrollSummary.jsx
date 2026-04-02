import { useState } from "react";
import { getPayrollSummary } from "../payroll/payrollApi";

export default function PayrollSummary(){

  const [id,setId] = useState("");
  const [summary,setSummary] = useState(null);

  const loadSummary = async () => {

    if(!id){
      alert("Please enter Payroll Run ID");
      return;
    }

    const res = await getPayrollSummary(id);

    setSummary(res.data);
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
            className="bg-indigo-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
          >
            Get Summary
          </button>

        </div>

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
                {summary.totals.earnings}
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded">
              <p className="text-gray-500">Deductions</p>
              <p className="text-red-600 font-semibold text-lg">
                {summary.totals.deductions}
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded">
              <p className="text-gray-500">Net Salary</p>
              <p className="text-red-700 font-semibold text-lg">
                {summary.totals.net}
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