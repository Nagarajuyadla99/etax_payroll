import { useEffect, useState } from "react";
import { createAttendance, fetchAttendance, updateAttendance } from "./attendanceApi";

export default function AttendanceForm({ reload, defaultOrganisationId = "" }) {

  const [form, setForm] = useState({
    organisation_id: defaultOrganisationId || "",
    employee_id: "",
    attendance_date: "",
    check_in: "",
    check_out: "",
    total_hours: "",
    status: "P",
    remarks: ""
  });

  useEffect(() => {
    if (defaultOrganisationId) {
      setForm((prev) => {
        if (prev.organisation_id) return prev;
        return { ...prev, organisation_id: defaultOrganisationId };
      });
    }
  }, [defaultOrganisationId]);

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
        work_date: form.attendance_date,      // match backend schema
        time_in: form.check_in || null,
        time_out: form.check_out || null,
        work_hours: Number(form.total_hours || 0),
        status: form.status,
        remarks: form.remarks || null
      };

      const findExistingRow = async () => {
        const rows = await fetchAttendance({
          // Match backend uniqueness: it checks duplicate by employee_id + work_date
          employee_id: payload.employee_id || undefined,
          for_date: payload.work_date || undefined,
        });
        if (!Array.isArray(rows) || rows.length === 0) return null;
        // Prefer exact date match if API returns broader results
        const exact = rows.find((r) => String(r.work_date) === String(payload.work_date));
        return exact || rows[0] || null;
      };

      const existingRow = await findExistingRow();
      if (existingRow?.attendance_id) {
        await updateAttendance(existingRow.attendance_id, {
          time_in: payload.time_in,
          time_out: payload.time_out,
          work_hours: payload.work_hours,
          status: payload.status,
          remarks: payload.remarks,
        });
      } else {
        try {
          await createAttendance(payload);
        } catch (err) {
          // If create races or backend rejects as duplicate (409), fetch again then update.
          if (String(err?.message || "").toLowerCase().includes("already exists")) {
            const retryRow = await findExistingRow();
            if (retryRow?.attendance_id) {
              await updateAttendance(retryRow.attendance_id, {
                time_in: payload.time_in,
                time_out: payload.time_out,
                work_hours: payload.work_hours,
                status: payload.status,
                remarks: payload.remarks,
              });
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }

      alert("Attendance saved successfully");

      setForm({
        organisation_id: defaultOrganisationId || "",
        employee_id: "",
        attendance_date: "",
        check_in: "",
        check_out: "",
        total_hours: "",
        status: "P",
        remarks: ""
      });

      reload();

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 shadow rounded">

      <h2 className="text-lg font-bold mb-3">Create Attendance</h2>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Organisation ID *</label>
          <input
            name="organisation_id"
            placeholder="Enter organisation ID"
            value={form.organisation_id}
            className="border p-2 w-full rounded"
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID *</label>
          <input
            name="employee_id"
            placeholder="Enter employee ID"
            value={form.employee_id}
            className="border p-2 w-full rounded"
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
          <input
            name="attendance_date"
            type="date"
            value={form.attendance_date}
            className="border p-2 w-full rounded"
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Check In</label>
          <input
            name="check_in"
            type="datetime-local"
            value={form.check_in}
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Check Out</label>
          <input
            name="check_out"
            type="datetime-local"
            value={form.check_out}
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
          <input
            name="total_hours"
            placeholder="Enter work hours"
            value={form.total_hours}
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
          <select
            name="status"
            value={form.status}
            className="border p-2 w-full rounded"
            onChange={handleChange}
            required
          >
            <option value="P">P - Present</option>
            <option value="A">A - Absent</option>
            <option value="HD">HD - Half Day</option>
            <option value="L">L - Leave</option>
            <option value="WO">WO - Week Off</option>
            <option value="H">H - Holiday</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
          <textarea
            name="remarks"
            placeholder="Enter remarks"
            value={form.remarks}
            className="border p-2 w-full rounded"
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>

      <button className="bg-blue-600 text-white px-4 py-2 rounded">
        Save
      </button>

    </form>
  );
}