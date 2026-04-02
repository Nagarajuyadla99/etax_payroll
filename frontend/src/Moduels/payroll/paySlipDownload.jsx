import { useState } from "react";
import { downloadPayslip } from "../payroll/payrollApi";

export default function PayslipDownloadPage(){

  const [runId,setRunId] = useState("");
  const [empId,setEmpId] = useState("");

  const download = async () => {

    if(!runId || !empId){
      alert("Please enter Payroll Run ID and Employee ID");
      return;
    }

    const res = await downloadPayslip(runId,empId);

    const url = window.URL.createObjectURL(new Blob([res.data]));

    const link = document.createElement("a");
    link.href = url;
    link.download = "payslip.pdf";
    link.click();
    alert("Downloaded successfully")
    //setRunId("")
    //setEmpId("")

  };

  return (

    <div className="p-8 bg-white min-h-screen">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Download Payslip
        </h1>

        <p className="text-gray-500 text-sm">
          Generate and download employee payslip for a payroll run
        </p>
      </div>

      {/* Card */}
      <div className="bg-white shadow rounded-lg p-6 max-w-xxl">

        <div className="grid grid-cols-1 gap-4">

          {/* Payroll Run ID */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Payroll Run ID
            </label>

            <input
              value={runId}
              onChange={(e)=>setRunId(e.target.value)}
              placeholder="Enter payroll run ID"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Employee ID */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Employee ID
            </label>

            <input
              value={empId}
              onChange={(e)=>setEmpId(e.target.value)}
              placeholder="Enter employee ID"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

        </div>

        {/* Button */}
        <div className="mt-6 flex justify-end">

          <button
            onClick={download}
            className="bg-indigo-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Download Payslip
          </button>

        </div>

      </div>

    </div>
  );
}