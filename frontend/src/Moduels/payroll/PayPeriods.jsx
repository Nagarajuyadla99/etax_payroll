import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPayPeriod } from "../payroll/payrollApi";

export default function PayPeriods() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    organisation_id: "",
    start_date: "",
    end_date: ""
  });

  const submit = async () => {
    await createPayPeriod(form);
    alert("Pay period created");

    // optional redirect after creation
    navigate("/payrollhome");
  };

  return (
    <div className="p-8 bg-white min-h-screen">

      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">

        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Create Pay Period
          </h1>

          <p className="text-gray-500 text-sm">
            Define payroll period for salary processing
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

        <div className="grid grid-cols-1 gap-4">

          {/* Organisation ID */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Organisation ID
            </label>

            <input
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter organisation ID"
              onChange={(e)=>
                setForm({...form, organisation_id:e.target.value})
              }
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Start Date
            </label>

            <input
              type="date"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              onChange={(e)=>
                setForm({...form,start_date:e.target.value})
              }
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              End Date
            </label>

            <input
              type="date"
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              onChange={(e)=>
                setForm({...form,end_date:e.target.value})
              }
            />
          </div>

        </div>

        {/* Button */}
        <div className="mt-6 flex gap-3">

        

          <button
            onClick={submit}
            className="bg-indigo-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
          >
            Create Pay Period
          </button>

        </div>

      </div>

    </div>
  );
}