import { useEffect, useState } from "react";
import { getComponents, createComponent } from "./SalaryApi";

export default function SalaryComponents() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // BUG FIX: controlled inputs — inputs were uncontrolled (no value prop),
  // causing the form to never reset after a successful create.
  const [form, setForm] = useState({
    name: "",
    code: "",
    component_type: "earning",
    calc_type: "fixed",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    // BUG FIX: no error handling meant a network failure left the table blank
    // with no feedback to the user.
    try {
      setLoading(true);
      const data = await getComponents();
      setComponents(data);
    } catch (err) {
      console.error("Failed to load components:", err);
      setError("Failed to load components. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      alert("Component name is required");
      return;
    }

    try {
      // BUG FIX: removed hardcoded organisation_id.
      // The server derives it from the JWT (current_user.organisation_id) via
      // clean_payload() in the CRUD layer — sending it from the client was
      // redundant and a potential IDOR vector.
      await createComponent({ ...form });

      // Reset form after success
      setForm({ name: "", code: "", component_type: "earning", calc_type: "fixed" });
      await load();
    } catch (err) {
      console.error("Failed to create component:", err);
      alert(err?.response?.data?.detail || "Failed to create component");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">Salary Components</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-4 gap-3 mb-6">
        <input
          name="name"
          value={form.name}
          placeholder="Component Name"
          className="border p-2 rounded"
          onChange={handleChange}
        />

        <input
          name="code"
          value={form.code}
          placeholder="Code"
          className="border p-2 rounded"
          onChange={handleChange}
        />

        <select
          name="component_type"
          value={form.component_type}
          className="border p-2 rounded"
          onChange={handleChange}
        >
          <option value="earning">Earning</option>
          <option value="deduction">Deduction</option>
        </select>

        <select
          name="calc_type"
          value={form.calc_type}
          className="border p-2 rounded"
          onChange={handleChange}
        >
          <option value="fixed">Fixed</option>
          <option value="percentage">Percentage</option>
          <option value="formula">Formula</option>
        </select>

        <button
          className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50"
          onClick={handleCreate}
          disabled={loading}
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
          {loading ? (
            <tr>
              <td colSpan="4" className="p-4 text-center text-gray-400">
                Loading…
              </td>
            </tr>
          ) : (
            components.map((c) => (
              <tr key={c.component_id}>
                <td className="p-2 border">{c.name}</td>
                <td className="p-2 border">{c.code}</td>
                <td className="p-2 border">{c.component_type}</td>
                <td className="p-2 border">{c.calc_type}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
