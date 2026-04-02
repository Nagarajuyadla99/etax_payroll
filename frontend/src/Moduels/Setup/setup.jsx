import { useState } from "react";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function Setup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    departments: [""],
    designations: [""],
    locations: [""],
    manager_name: "",
    manager_email: "",
  });

  const handleArrayChange = (field, index, value) => {
    const updated = [...form[field]];
    updated[index] = value;
    setForm({ ...form, [field]: updated });
  };

  const addField = (field) => {
    setForm({ ...form, [field]: [...form[field], ""] });
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    
    console.log("SETUP TOKEN:", localStorage.getItem("token")); // ✅ DEBUG

    const payload = {
      departments: form.departments.filter(Boolean),
      designations: form.designations.filter(Boolean),
      locations: form.locations.filter(Boolean),
      manager: form.manager_name
        ? {
            name: form.manager_name,
            email: form.manager_email,
          }
        : null,
    };

    try {
      await API.post("/setup/", payload);

      alert("Setup Completed");

      navigate("/employeeCreate");

    } catch (err) {
      console.error(err);
      alert("Setup failed");
    }
  };

  const input = "border p-2 rounded w-full mb-2";

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Initial Setup</h2>

      {/* Departments */}
      <h3>Departments</h3>
      {form.departments.map((d, i) => (
        <input
          key={i}
          className={input}
          placeholder="Department"
          value={d}
          onChange={(e) =>
            handleArrayChange("departments", i, e.target.value)
          }
        />
      ))}
      <button onClick={() => addField("departments")}>
        + Add Department
      </button>

      {/* Designations */}
      <h3 className="mt-4">Designations</h3>
      {form.designations.map((d, i) => (
        <input
          key={i}
          className={input}
          placeholder="Designation"
          value={d}
          onChange={(e) =>
            handleArrayChange("designations", i, e.target.value)
          }
        />
      ))}
      <button onClick={() => addField("designations")}>
        + Add Designation
      </button>

      {/* Locations */}
      <h3 className="mt-4">Locations</h3>
      {form.locations.map((l, i) => (
        <input
          key={i}
          className={input}
          placeholder="Location"
          value={l}
          onChange={(e) =>
            handleArrayChange("locations", i, e.target.value)
          }
        />
      ))}
      <button onClick={() => addField("locations")}>
        + Add Location
      </button>

      {/* Manager */}
      <h3 className="mt-4">Admin Employee</h3>
      <input
        className={input}
        placeholder="Name"
        value={form.manager_name}
        onChange={(e) =>
          setForm({ ...form, manager_name: e.target.value })
        }
      />
      <input
        className={input}
        placeholder="Email"
        value={form.manager_email}
        onChange={(e) =>
          setForm({ ...form, manager_email: e.target.value })
        }
      />

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 mt-4"
      >
        Complete Setup
      </button>

      <button
  onClick={() => navigate(-1)}
  className="fixed  right-3 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-full shadow-lg transition duration-300 flex items-center gap-2 z-50"
>
  ← Back
</button>
    </div>
  );
}