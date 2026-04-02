import { useState } from "react";
import { getSalaryStatement } from "../payroll/payrollApi";

export default function SalaryStatementPage(){

  const [id,setId] = useState("");
  const [data,setData] = useState([]);

  const load = async () => {

    if(!id){
      alert("Please enter Payroll Run ID");
      return;
    }

    const res = await getSalaryStatement(id);

    setData(res.data.salary_statement);
  };

  return (

    <div className="p-8 bg-white min-h-screen">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Salary Statement
        </h1>
        <p className="text-gray-500 text-sm">
          View employee salary breakdown for the payroll run
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
            Load Statement
          </button>

        </div>

      </div>

      {/* Employee Salary Cards */}
      <div className="grid gap-6">

        {data.length === 0 ? (
          <div className="text-gray-500 text-center mt-6">
            No salary statement loaded
          </div>
        ) : (

          data.map(emp => (

            <div
              key={emp.employee_id}
              className="bg-white shadow rounded-lg p-6"
            >

              {/* Employee Header */}
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Employee ID: {emp.employee_id}
              </h3>

              {/* Components */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                {Object.entries(emp.components).map(([k,v]) => (

                  <div
                    key={k}
                    className="bg-gray-50 border rounded p-3"
                  >
                    <p className="text-sm text-gray-500">
                      {k}
                    </p>

                    <p className="font-semibold text-gray-800">
                      {v}
                    </p>
                  </div>

                ))}

              </div>

            </div>

          ))

        )}

      </div>

    </div>
  );
}