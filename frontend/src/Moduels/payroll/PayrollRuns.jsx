import { useState } from "react";
import { createPayrollRun } from "../payroll/payrollApi";

export default function PayrollRunsPage(){

  const [data,setData] = useState({
    organisation_id:"",
    pay_period_id:""
  });

  const createRun = async () => {

    if(!data.organisation_id || !data.pay_period_id){
      alert("Please fill all fields");
      return;
    }

    await createPayrollRun(data);

    alert("Payroll run created successfully");

    setData({
      organisation_id:"",
      pay_period_id:""
    });
  };

  return (

    <div className="p-8 bg-white min-h-screen">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Create Payroll Run
        </h1>

        <p className="text-gray-500 text-sm">
          Start a payroll process for a selected pay period
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white shadow rounded-lg p-6 max-w-xxl">

        <div className="grid grid-cols-1 gap-4">

          {/* Organisation ID */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Organisation ID
            </label>

            <input
              value={data.organisation_id}
              onChange={(e)=>setData({...data,organisation_id:e.target.value})}
              placeholder="Enter organisation ID"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Pay Period ID */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Pay Period ID
            </label>

            <input
              value={data.pay_period_id}
              onChange={(e)=>setData({...data,pay_period_id:e.target.value})}
              placeholder="Enter pay period ID"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end">

          <button
            onClick={createRun}
            className="bg-indigo-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Create Payroll Run
          </button>

        </div>

      </div>

    </div>

  );
}