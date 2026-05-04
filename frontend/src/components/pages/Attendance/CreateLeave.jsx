import { useEffect, useState } from "react";
import { createLeave, fetchMyOrganisationSummary } from "../../../Moduels/attendance/attendanceApi";

export default function CreateLeave() {
  const [form, setForm] = useState({
    organisation_id: "",
    employee_id: "",
    leave_type: "CL",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const org = await fetchMyOrganisationSummary();
        const id = org?.id || "";
        setForm((prev) => (prev.organisation_id ? prev : { ...prev, organisation_id: id }));
      } catch {
        // keep manual entry
      }
    })();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        organisation_id: form.organisation_id,
        employee_id: form.employee_id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
      };
      await createLeave(payload);
      alert("Leave request created successfully");
      setForm((prev) => ({
        ...prev,
        employee_id: "",
        leave_type: "CL",
        start_date: "",
        end_date: "",
        reason: "",
      }));
    } catch (err) {
      setError(err?.message || "Failed to create leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Create Leave</h2>
        <p className="text-sm text-gray-500 mt-1">Create a leave request (will appear in Leave Approval).</p>
      </div>

      <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow-md max-w-2xl">
        {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organisation ID *</label>
            <input
              name="organisation_id"
              value={form.organisation_id}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              placeholder="Enter organisation ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID *</label>
            <input
              name="employee_id"
              value={form.employee_id}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              placeholder="Enter employee ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type *</label>
            <select name="leave_type" value={form.leave_type} onChange={handleChange} className="border p-2 w-full rounded" required>
              <option value="CL">CL - Casual Leave</option>
              <option value="SL">SL - Sick Leave</option>
              <option value="EL">EL - Earned Leave</option>
              <option value="LOP">LOP - Loss of Pay</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} className="border p-2 w-full rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
              <input name="end_date" type="date" value={form.end_date} onChange={handleChange} className="border p-2 w-full rounded" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              placeholder="Enter reason (optional)"
              rows={3}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`mt-5 px-5 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

