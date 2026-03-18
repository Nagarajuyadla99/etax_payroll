import { useEffect, useState } from "react";
import { getComponents, createComponent } from "./SalaryApi";

export default function SalaryComponents() {

  const [components, setComponents] = useState([]);
  const [form, setForm] = useState({
    name: "",
    code: "",
    component_type: "earning",
    calc_type: "fixed"
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getComponents();
    setComponents(data);
  }

  function handleChange(e){
    setForm({...form,[e.target.name]:e.target.value})
  }

  async function handleCreate(){
    await createComponent({
      organisation_id:"23789067-370a-4a80-bc56-e0c1c54264aa",
      ...form
    })

    load()
  }

  return (
    <div className="p-6">

      <h1 className="text-xl font-semibold mb-6">
        Salary Components
      </h1>

      <div className="grid grid-cols-4 gap-3 mb-6">

        <input
        name="name"
        placeholder="Component Name"
        className="border p-2 rounded"
        onChange={handleChange}
        />

        <input
        name="code"
        placeholder="Code"
        className="border p-2 rounded"
        onChange={handleChange}
        />

        <select
        name="component_type"
        className="border p-2 rounded"
        onChange={handleChange}
        >
          <option value="earning">Earning</option>
          <option value="deduction">Deduction</option>
        </select>

        <select
        name="calc_type"
        className="border p-2 rounded"
        onChange={handleChange}
        >
          <option value="fixed">Fixed</option>
          <option value="percentage">Percentage</option>
          <option value="formula">Formula</option>
        </select>

        <button
        className="bg-red-600 text-white rounded px-4 py-2"
        onClick={handleCreate}
        >
          Add Component
        </button>

      </div>

      <table className="w-full border">

        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Code</th>
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Calculation</th>
          </tr>
        </thead>

        <tbody>

          {components.map((c)=>(
            <tr key={c.component_id}>
              <td className="p-2 border">{c.name}</td>
              <td className="p-2 border">{c.code}</td>
              <td className="p-2 border">{c.component_type}</td>
              <td className="p-2 border">{c.calc_type}</td>
            </tr>
          ))}

        </tbody>

      </table>

    </div>
  )
}