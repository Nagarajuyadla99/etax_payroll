import { useState } from "react";
import { getTdsSummary } from "../payroll/payrollApi";

export default function TdsSummaryPage(){

  const [id,setId] = useState("");
  const [data,setData] = useState([]);

  const load = async () => {

    if(!id){
      alert("Please enter Payroll Run ID");
      return;
    }

    const res = await getTdsSummary(id);

    setData(res.data.tds_summary);
  };

  return (

    <div className="p-8 bg-white min-h-screen">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          TDS Summary
        </h1>

        <p className="text-gray-500 text-sm">
          View employee taxable salary and TDS deductions
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
            onClick={load}
            className="bg-indigo-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
          >
            Load Summary
          </button>

        </div>

      </div>


      {/* Table Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="text-left p-3 border-b">Employee ID</th>
              <th className="text-left p-3 border-b">Taxable Salary</th>
              <th className="text-left p-3 border-b">TDS (10%)</th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (

              <tr>
                <td colSpan="3" className="text-center p-6 text-gray-500">
                  No TDS data loaded
                </td>
              </tr>

            ) : (

              data.map((r)=>(
                <tr
                  key={r.employee_id}
                  className="hover:bg-gray-50"
                >
                  <td className="p-3 border-b">
                    {r.employee_id}
                  </td>

                  <td className="p-3 border-b text-gray-700">
                    {r.taxable_salary}
                  </td>

                  <td className="p-3 border-b text-red-600 font-medium">
                    {r.tds}
                  </td>
                </tr>
              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}