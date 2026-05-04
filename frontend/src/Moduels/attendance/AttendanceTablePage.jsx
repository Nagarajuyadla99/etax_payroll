import { useEffect, useState } from "react";
import AttendanceTable from "./AttendanceTable";
import { fetchAttendance, fetchMyOrganisationSummary } from "./attendanceApi";
import { getEmployees } from "../Employees/EmployeeApi";

export default function AttendanceTablePage() {
  const [attendance, setAttendance] = useState([]);
  const [organisationId, setOrganisationId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeNameById, setEmployeeNameById] = useState({});

  const loadAttendance = async (orgId) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAttendance({
        organisation_id: orgId || undefined,
      });
      setAttendance(Array.isArray(data) ? data : []);
    } catch (e) {
      setAttendance([]);
      setError(e?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const rows = await getEmployees();
      const map = {};
      for (const e of Array.isArray(rows) ? rows : []) {
        const id = e?.employee_id;
        if (!id) continue;
        const name =
          String(e?.display_name || "").trim() ||
          [e?.first_name, e?.middle_name, e?.last_name].filter(Boolean).join(" ").trim() ||
          String(e?.employee_code || "").trim() ||
          String(id);
        map[String(id)] = name;
      }
      setEmployeeNameById(map);
    } catch {
      // If employees fail to load, keep IDs in the table (no hard failure)
      setEmployeeNameById({});
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadEmployees();
        const org = await fetchMyOrganisationSummary();
        const id = org?.id || "";
        setOrganisationId(id);
        if (id) await loadAttendance(id);
      } catch (e) {
        setError(e?.message || "Failed to load organisation context");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <style>{`
        .att-table-scroll {
          overflow-y: auto;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.45) transparent;
        }
        .att-table-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .att-table-scroll::-webkit-scrollbar-track { background: transparent; }
        .att-table-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.35);
          border-radius: 10px;
        }
        .att-table-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.5); }
      `}</style>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-lg font-semibold">Attendance Table</div>
        <button
          type="button"
          className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => loadAttendance(organisationId)}
          disabled={!organisationId || loading}
          title={!organisationId ? "Organisation not loaded yet" : "Reload"}
        >
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>

      {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}

      <div
        className="att-table-scroll border rounded"
        style={{ maxHeight: "calc(100dvh - 210px)" }}
      >
        <AttendanceTable data={attendance} employeeNameById={employeeNameById} />
      </div>
    </div>
  );
}

