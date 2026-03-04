import { useState } from "react";
import { createEmployee } from "./EmployeeApi";

export default function EmployeeCreate() {
  const [form, setForm] = useState({
    employee_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    work_email: "",
    phone: "",
    mobile_phone: "",
    gender: "",
    marital_status: "",
    fathers_name: "",
    business_unit: "",
    annual_ctc: "",
    pay_frequency: "Monthly",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Update form state dynamically
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Filter out empty strings and convert numeric fields
      const payload = Object.fromEntries(
        Object.entries(form).filter(([_, v]) => v !== "")
      );
      payload.annual_ctc = payload.annual_ctc
        ? parseFloat(payload.annual_ctc)
        : null;

      await createEmployee(payload);

      setMessage("✅ Employee created successfully");
      // Reset form
      setForm({
        employee_code: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        work_email: "",
        phone: "",
        mobile_phone: "",
        gender: "",
        marital_status: "",
        fathers_name: "",
        business_unit: "",
        annual_ctc: "",
        pay_frequency: "Monthly",
      });
    } catch (error) {
      setMessage(
        "❌ " +
          (error.response?.data?.detail || error.response?.data || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Create Employee</h2>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <input
          name="employee_code"
          placeholder="Employee Code"
          value={form.employee_code}
          onChange={handleChange}
        />

        <input
          name="first_name"
          placeholder="First Name *"
          value={form.first_name}
          onChange={handleChange}
          required
        />

        <input
          name="middle_name"
          placeholder="Middle Name"
          value={form.middle_name}
          onChange={handleChange}
        />

        <input
          name="last_name"
          placeholder="Last Name"
          value={form.last_name}
          onChange={handleChange}
        />

        <input
          name="email"
          type="email"
          placeholder="Personal Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          name="work_email"
          type="email"
          placeholder="Work Email"
          value={form.work_email}
          onChange={handleChange}
        />

        <input
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
        />

        <input
          name="mobile_phone"
          placeholder="Mobile Phone"
          value={form.mobile_phone}
          onChange={handleChange}
        />

        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <select
          name="marital_status"
          value={form.marital_status}
          onChange={handleChange}
        >
          <option value="">Marital Status</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
        </select>

        <input
          name="fathers_name"
          placeholder="Father's Name"
          value={form.fathers_name}
          onChange={handleChange}
        />

        <input
          name="business_unit"
          placeholder="Business Unit"
          value={form.business_unit}
          onChange={handleChange}
        />

        <input
          name="annual_ctc"
          placeholder="Annual CTC"
          value={form.annual_ctc}
          onChange={handleChange}
        />

        <select
          name="pay_frequency"
          value={form.pay_frequency}
          onChange={handleChange}
        >
          <option value="Monthly">Monthly</option>
          <option value="Biweekly">Biweekly</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Employee"}
        </button>
      </form>
    </div>
  );
}