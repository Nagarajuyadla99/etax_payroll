import { useEffect, useState } from "react";
import { createAttendance, fetchAttendance, updateAttendance } from "./attendanceApi";

const STATUS_OPTIONS = [
  { value: "P", label: "Present" },
  { value: "A", label: "Absent" },
  { value: "HD", label: "Half day" },
  { value: "L", label: "Leave" },
  { value: "WO", label: "Week off" },
  { value: "H", label: "Holiday" },
];

function employeeLabel(e) {
  const name =
    String(e?.display_name || "").trim() ||
    [e?.first_name, e?.last_name].filter(Boolean).join(" ").trim();
  const code = e?.employee_code ? ` (${e.employee_code})` : "";
  return name ? `${name}${code}` : e?.employee_id;
}

export default function AttendanceForm({
  reload,
  defaultOrganisationId = "",
  employees = [],
  hideOrganisationId = false,
}) {
  const [form, setForm] = useState({
    organisation_id: defaultOrganisationId || "",
    employee_id: "",
    attendance_date: "",
    check_in: "",
    check_out: "",
    total_hours: "",
    status: "P",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (defaultOrganisationId) {
      setForm((prev) => ({ ...prev, organisation_id: defaultOrganisationId }));
    }
  }, [defaultOrganisationId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = {
        organisation_id: form.organisation_id,
        employee_id: form.employee_id,
        work_date: form.attendance_date,
        time_in: form.check_in || null,
        time_out: form.check_out || null,
        work_hours: Number(form.total_hours || 0),
        status: form.status,
        remarks: form.remarks || null,
      };

      const findExistingRow = async () => {
        const rows = await fetchAttendance({
          employee_id: payload.employee_id || undefined,
          for_date: payload.work_date || undefined,
        });
        if (!Array.isArray(rows) || rows.length === 0) return null;
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
        setMessage({ type: "ok", text: "Attendance updated for this date." });
      } else {
        try {
          await createAttendance(payload);
          setMessage({ type: "ok", text: "Attendance saved." });
        } catch (err) {
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
              setMessage({ type: "ok", text: "Attendance updated (existing row)." });
            } else throw err;
          } else throw err;
        }
      }

      setForm({
        organisation_id: defaultOrganisationId || form.organisation_id,
        employee_id: "",
        attendance_date: "",
        check_in: "",
        check_out: "",
        total_hours: "",
        status: "P",
        remarks: "",
      });
      reload?.();
    } catch (err) {
      setMessage({ type: "err", text: err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 shadow-sm border border-slate-200 rounded-xl">
      {message.text && (
        <div
          className={`mb-4 text-sm px-3 py-2 rounded-lg ${
            message.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {!hideOrganisationId && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organisation ID</label>
            <input
              name="organisation_id"
              value={form.organisation_id}
              className="border border-slate-300 p-2 w-full rounded-lg"
              onChange={handleChange}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
          {employees.length > 0 ? (
            <select
              name="employee_id"
              value={form.employee_id}
              className="border border-slate-300 p-2 w-full rounded-lg"
              onChange={handleChange}
              required
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {employeeLabel(emp)}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="employee_id"
              placeholder="Employee ID (load employees failed — paste UUID)"
              value={form.employee_id}
              className="border border-slate-300 p-2 w-full rounded-lg"
              onChange={handleChange}
              required
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Work date *</label>
          <input
            name="attendance_date"
            type="date"
            value={form.attendance_date}
            className="border border-slate-300 p-2 w-full rounded-lg"
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Check in (optional)</label>
            <input
              name="check_in"
              type="datetime-local"
              value={form.check_in}
              className="border border-slate-300 p-2 w-full rounded-lg"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Check out (optional)</label>
            <input
              name="check_out"
              type="datetime-local"
              value={form.check_out}
              className="border border-slate-300 p-2 w-full rounded-lg"
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Work hours (optional)</label>
          <input
            name="total_hours"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 8"
            value={form.total_hours}
            className="border border-slate-300 p-2 w-full rounded-lg"
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
          <select
            name="status"
            value={form.status}
            className="border border-slate-300 p-2 w-full rounded-lg"
            onChange={handleChange}
            required
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Present and half-day count toward payable days in payroll.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
          <textarea
            name="remarks"
            value={form.remarks}
            className="border border-slate-300 p-2 w-full rounded-lg"
            onChange={handleChange}
            rows={2}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full sm:w-auto bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium"
      >
        {saving ? "Saving…" : "Save attendance"}
      </button>
    </form>
  );
}
