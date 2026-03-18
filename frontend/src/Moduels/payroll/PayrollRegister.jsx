import { useState } from "react";
import { useNavigate, useNavigation } from "react-router-dom";
import { getPayrollRegister } from "../payroll/payrollApi";

export default function PayrollRegister(){
  const navigate = useNavigate()
  const [id,setId] = useState("");
  const [rows,setRows] = useState([]);

  const load = async () => {

    if(!id){
      alert("Please enter Payroll Run ID");
      return;
    }

    const res = await getPayrollRegister(id);

    setRows(res.data.register);
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
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md"
          >
            Load Register
          </button>

        </div>

      </div>


      {/* Table Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="text-left p-3 border-b">Employee</th>
              <th className="text-left p-3 border-b">Earnings</th>
              <th className="text-left p-3 border-b">Deductions</th>
              <th className="text-left p-3 border-b">Net Salary</th>
            </tr>
          </thead>

          <tbody>

            {rows.length === 0 ? (

              <tr>
                <td colSpan="4" className="text-center p-6 text-gray-500">
                  No payroll data loaded
                </td>
              </tr>

            ) : (

              rows.map((r)=>(
                <tr
                  key={r.employee_id}
                  className="hover:bg-gray-50"
                >
                  <td className="p-3 border-b">{r.employee_id}</td>
                  <td className="p-3 border-b text-green-600">{r.earnings}</td>
                  <td className="p-3 border-b text-red-500">{r.deductions}</td>
                  <td className="p-3 border-b font-medium">{r.net_salary}</td>
                </tr>
              ))

            )}

          </tbody>

        </table>

      </div>

    </div>

  );
}