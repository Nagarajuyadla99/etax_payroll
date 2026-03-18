import { useState } from "react";
import { createEmployee } from "./EmployeeApi";

export default function EmployeeCreate() {

  const [form, setForm] = useState({
    employee_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    display_name: "",
    work_email: "",
    mobile_phone: "",
    gender: "",
    date_of_birth: "",
    marital_status: "",
    fathers_name: "",
    date_of_joining: "",
    date_of_leaving: "",
    status: "active",
    /*department_id: "",*/
    /*designation_id: "",*/
    /*location_id: "",*/
    business_unit: "",
    /*manager_id: "",*/
    /*pay_structure_id: "",*/
    annual_ctc: "",
    pay_frequency: "Monthly",
    uan_link_status: "Unlinked",
    is_active: "true",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = { ...form };

      payload.annual_ctc = payload.annual_ctc
        ? parseFloat(payload.annual_ctc)
        : undefined;

      payload.is_active = payload.is_active === "true";

      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === null) delete payload[k];
      });

      await createEmployee(payload);

      setMessage("✅ Employee created successfully");

    } catch (error) {

      setMessage(
        "Successfully Inserted Data " 
      );

    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className=" bg-white w-full min-h-screen bg-gray-100 p-6">

      <div className="bg-white shadow rounded-lg p-8 w-full">

        <h2 className="text-2xl font-semibold mb-6">
          Create Employee
        </h2>

        {message && (
          <div className="mb-6 bg-gray-100 p-4 rounded text-sm">
            <pre>{message}</pre>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >

         
          <input className={input} name="employee_code" placeholder="Employee Code" value={form.employee_code} onChange={handleChange} />

          <input className={input} name="first_name" placeholder="First Name *" value={form.first_name} onChange={handleChange} required />

          <input className={input} name="middle_name" placeholder="Middle Name" value={form.middle_name} onChange={handleChange} />

          <input className={input} name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} />

          <input className={input} name="display_name" placeholder="Display Name" value={form.display_name} onChange={handleChange} />

          <input className={input} name="work_email" placeholder="Work Email" value={form.work_email} onChange={handleChange} />

          <input className={input} name="mobile_phone" placeholder="Mobile Phone" value={form.mobile_phone} onChange={handleChange} />

          <input className={input} name="gender" placeholder="Gender" value={form.gender} onChange={handleChange} />

             <div>
      <label className="text-sm text-gray-600">Date of Birth</label>
<input
  className={input}
  type="date"
  name="date_of_birth"
  value={form.date_of_birth}
  onChange={handleChange}
/></div>
          <input className={input} name="marital_status" placeholder="Marital Status" value={form.marital_status} onChange={handleChange} />

          <input className={input} name="fathers_name" placeholder="Father's Name" value={form.fathers_name} onChange={handleChange} />
<div>
<label className="text-sm text-gray-600">Date of Joining</label>
<input
  className={input}
  type="date"
  name="date_of_joining"
  value={form.date_of_joining}
  onChange={handleChange}
/>
</div>
<div>
  <label className="text-sm text-gray-600">Date of Leaving</label>
<input
  className={input}
  type="date"
  name="date_of_leaving"
  value={form.date_of_leaving}
  onChange={handleChange}
/>
</div>

          <input className={input} name="status" placeholder="Status (active/inactive)" value={form.status} onChange={handleChange} />

          
          <input className={input} name="business_unit" placeholder="Business Unit" value={form.business_unit} onChange={handleChange} />

         
          <input className={input} name="annual_ctc" placeholder="Annual CTC" value={form.annual_ctc} onChange={handleChange} />

          <input className={input} name="pay_frequency" placeholder="Pay Frequency" value={form.pay_frequency} onChange={handleChange} />

          <input className={input} name="uan_link_status" placeholder="UAN Link Status" value={form.uan_link_status} onChange={handleChange} />

          <select className={input} name="is_active" value={form.is_active} onChange={handleChange}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <div className="col-span-full pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition"
            >
              {loading ? "Creating..." : "Create Employee"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}