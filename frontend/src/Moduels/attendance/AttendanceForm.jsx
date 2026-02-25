import { useState } from "react";
import { createAttendance } from "./attendanceApi";

export default function AttendanceForm({ reload }) {

  const [form, setForm] = useState({
    organisation_id: "",
    employee_id: "",
    attendance_date: "",
    time_in: "",
    time_out: "",
    total_hours: "",
    status: "present",
    remarks: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

     const payload = {
  organisation_id: form.organisation_id,
  employee_id: form.employee_id,
  work_date: form.attendance_date,     
  time_in: form.check_in || null,      
  time_out: form.check_out || null,    
  work_hours: form.total_hours || 0,  
  status: form.status,
  remarks: form.remarks || null
};
      await createAttendance(payload);

      alert("Attendance created successfully");

      reload();

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 shadow rounded">

      <h2 className="text-lg font-bold mb-3">Create Attendance</h2>

      <input
        name="organisation_id"
        placeholder="Organisation ID"
        className="border p-2 w-full mb-2"
        onChange={handleChange}
        required
      />

      <input
        name="employee_id"
        placeholder="Employee ID"
        className="border p-2 w-full mb-2"
        onChange={handleChange}
        required
      />

      <input
        name="attendance_date"
        type="date"
        className="border p-2 w-full mb-2"
        onChange={handleChange}
        required
      />

      <input
        name="check_in"
        type="datetime-local"
        className="border p-2 w-full mb-2"
        onChange={handleChange}
      />

      <input
        name="check_out"
        type="datetime-local"
        className="border p-2 w-full mb-2"
        onChange={handleChange}
      />

      <input
        name="total_hours"
        placeholder="Total Hours"
        className="border p-2 w-full mb-2"
        onChange={handleChange}
      />

      <select
        name="status"
        className="border p-2 w-full mb-2"
        onChange={handleChange}
      >
        <option value="present">Present</option>
        <option value="absent">Absent</option>
        <option value="half_day">Half Day</option>
        <option value="leave">Leave</option>
      </select>

      <textarea
        name="remarks"
        placeholder="Remarks"
        className="border p-2 w-full mb-2"
        onChange={handleChange}
      />

      <button className="bg-blue-600 text-white px-4 py-2 rounded">
        Save
      </button>

    </form>
  );
}
