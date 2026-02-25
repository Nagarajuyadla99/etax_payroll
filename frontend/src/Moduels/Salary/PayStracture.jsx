import { useState } from "react";

export default function PayStructure() {

  const [employeeId, setEmployeeId] = useState("");
  const [template, setTemplate] = useState("");
  const [structures, setStructures] = useState([]);

  const dummyTemplates = [
    "Developer Package",
    "HR Package",
    "Manager Package"
  ];

  const assignStructure = () => {

    if (!employeeId || !template) return;

    setStructures([
      ...structures,
      {
        id: Date.now(),
        employeeId,
        template
      }
    ]);

    setEmployeeId("");
    setTemplate("");

  };


  return (

    <div className="p-6 bg-slate-50 min-h-screen w-full">

      <div className="w-full bg-white p-6 rounded-2xl shadow">

        <h2 className="text-xl font-semibold mb-6">
          Pay Structure Assignment
        </h2>


        <div className="grid md:grid-cols-2 gap-4 mb-4">

          <input
            placeholder="Employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="border px-3 py-2 rounded-xl w-full"
          />


          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="border px-3 py-2 rounded-xl w-full"
          >

            <option value="">
              Select Template
            </option>

            {dummyTemplates.map(t => (
              <option key={t}>
                {t}
              </option>
            ))}

          </select>

        </div>


        <button
          onClick={assignStructure}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl"
        >
          Assign Pay Structure
        </button>


        <div className="mt-6 w-full">

          {structures.map(s => (

            <div key={s.id}
              className="border p-4 rounded-xl mb-3 w-full h-full bg-gray-50 shadow-sm">

              <p className="font-medium">
                Employee: {s.employeeId}
              </p>

              <p className="text-sm text-gray-500">
                Template: {s.template}
              </p>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}
