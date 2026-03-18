import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { processPayroll } from "../payroll/payrollApi";

export default function ProcessPayroll(){

  const navigate = useNavigate();
  const [payrollId,setPayrollId] = useState("");

  const runPayroll = async () => {

    if(!payrollId){
      alert("Please enter Payroll Run ID");
      return;
    }

    await processPayroll(payrollId);

    alert("Payroll processed successfully");

    setPayrollId("");
  };

  return (

    <div className="p-8 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">

        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Process Payroll
          </h1>

          <p className="text-gray-500 text-sm">
            Run payroll calculation for the selected payroll run
          </p>
        </div>

        <button
          onClick={() => navigate("/payrollhome")}
          className="bg-gray-200 hover:bg-red-300 text-gray-800 px-4 py-2 rounded-md"
        >
          ← Back
        </button>

      </div>


      {/* Card */}
      <div className="bg-white shadow rounded-lg p-6 max-w-xxl">

        <div className="space-y-4">

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Payroll Run ID
            </label>

            <input
              value={payrollId}
              onChange={(e)=>setPayrollId(e.target.value)}
              placeholder="Enter payroll run ID"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

        </div>


        {/* Action Button */}
        <div className="mt-6 flex justify-end">

          <button
            onClick={runPayroll}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Process Payroll
          </button>

        </div>

      </div>

    </div>
  );
}