import { useEffect, useState } from "react";
import {
  createWfHoliday,
  deleteWfHoliday,
  fetchWfHolidays,
  updateWfHoliday,
} from "../../../Moduels/attendance/wfApi";

export default function HolidayManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ holiday_date: "", name: "", is_optional: false });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchWfHolidays();
      setRows(data);
    } catch (e) {
      setError(e.message || "Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.holiday_date) return;
    try {
      await createWfHoliday({
        holiday_date: form.holiday_date,
        name: form.name || null,
        is_optional: form.is_optional,
      });
      setForm({ holiday_date: "", name: "", is_optional: false });
      await load();
    } catch (err) {
      setError(err.message || "Create failed");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this holiday?")) return;
    try {
      await deleteWfHoliday(id);
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const toggleOptional = async (row) => {
    try {
      await updateWfHoliday(row.holiday_id, { is_optional: !row.is_optional });
      await load();
    } catch (err) {
      setError(err.message || "Update failed");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Holiday Calendar</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage organisation holidays used by Apply Calendar and payroll attendance.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl border p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <input
          type="date"
          required
          className="border rounded-lg px-3 py-2"
          value={form.holiday_date}
          onChange={(e) => setForm({ ...form, holiday_date: e.target.value })}
        />
        <input
          type="text"
          placeholder="Holiday name"
          className="border rounded-lg px-3 py-2 md:col-span-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_optional}
            onChange={(e) => setForm({ ...form, is_optional: e.target.checked })}
          />
          Optional
        </label>
        <button
          type="submit"
          className="md:col-span-4 bg-teal-600 text-white rounded-lg py-2 hover:bg-teal-700"
        >
          Add Holiday
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <table className="w-full bg-white rounded-xl border overflow-hidden text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Optional</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-gray-500 text-center">
                  No holidays defined.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.holiday_id} className="border-t">
                  <td className="p-3">{r.holiday_date}</td>
                  <td className="p-3">{r.name || "—"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => toggleOptional(r)}
                      className="text-teal-700 underline"
                    >
                      {r.is_optional ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(r.holiday_id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
