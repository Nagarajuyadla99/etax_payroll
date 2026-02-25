import { useState } from "react";

export default function SalaryComponents() {

  const [component, setComponent] = useState({
    name: "",
    type: "Earning",
    calculation: "Fixed",
    value: ""
  });

  const [components, setComponents] = useState([
    { id: 1, name: "Basic", type: "Earning", calculation: "Fixed", value: 30000 },
    { id: 2, name: "HRA", type: "Earning", calculation: "Percentage", value: 40 },
    { id: 3, name: "PF", type: "Deduction", calculation: "Percentage", value: 12 }
  ]);

  const handleChange = (e) =>
    setComponent({ ...component, [e.target.name]: e.target.value });

  const addComponent = () => {
    if (!component.name || !component.value) return;

    setComponents([
      ...components,
      { ...component, id: Date.now(), value: Number(component.value) }
    ]);

    setComponent({ name: "", type: "Earning", calculation: "Fixed", value: "" });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow">

        <h2 className="text-xl font-semibold mb-6">
          Salary Components
        </h2>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <input name="name" placeholder="Component Name"
            value={component.name} onChange={handleChange}
            className="border px-3 py-2 rounded-xl" />

          <select name="type" value={component.type}
            onChange={handleChange}
            className="border px-3 py-2 rounded-xl">
            <option>Earning</option>
            <option>Deduction</option>
          </select>

          <select name="calculation" value={component.calculation}
            onChange={handleChange}
            className="border px-3 py-2 rounded-xl">
            <option>Fixed</option>
            <option>Percentage</option>
          </select>

          <input type="number" name="value"
            placeholder="Value"
            value={component.value}
            onChange={handleChange}
            className="border px-3 py-2 rounded-xl" />
        </div>

        <button
          onClick={addComponent}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl mb-6"
        >
          Add Component
        </button>

        <table className="w-full text-sm border rounded-xl overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Calculation</th>
              <th className="p-3 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {components.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.type}</td>
                <td className="p-3">{c.calculation}</td>
                <td className="p-3">
                  {c.calculation === "Percentage" ? `${c.value}%` : `₹${c.value}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}
