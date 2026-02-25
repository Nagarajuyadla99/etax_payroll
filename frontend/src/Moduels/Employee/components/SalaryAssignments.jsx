import { useState, useMemo } from "react";

export default function SalaryAssignment() {

  const [form, setForm] = useState({
    empId: "",
    basic: "",
    hra: "",
    bonus: "",
    pf: "",
    tax: ""
  });

  const grossSalary = useMemo(
    () =>
      Number(form.basic || 0) +
      Number(form.hra || 0) +
      Number(form.bonus || 0),
    [form]
  );

  const netSalary = useMemo(
    () => grossSalary - (Number(form.pf || 0) + Number(form.tax || 0)),
    [grossSalary, form]
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm">

        <h2 className="text-xl font-semibold mb-6">
          Salary Assignment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {[
            ["empId", "Employee ID"],
            ["basic", "Basic Salary"],
            ["hra", "HRA"],
            ["bonus", "Bonus"],
            ["pf", "PF Deduction"],
            ["tax", "Tax Deduction"]
          ].map(([name, label]) => (
            <input
              key={name}
              type="number"
              name={name}
              placeholder={label}
              value={form[name]}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ))}

        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <p className="text-sm">
            Gross Salary: <strong>₹{grossSalary.toLocaleString()}</strong>
          </p>
          <p className="text-sm mt-1">
            Net Salary: <strong>₹{netSalary.toLocaleString()}</strong>
          </p>
        </div>

        <button
          className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
        >
          Assign Salary
        </button>

      </div>
    </div>
  );
}
