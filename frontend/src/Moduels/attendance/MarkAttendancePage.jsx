import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AttendanceForm from "./AttendanceForm";
import { fetchMyOrganisationSummary } from "./attendanceApi";
import { getEmployees } from "../Employees/EmployeeApi";

export default function MarkAttendancePage() {
  const [organisationId, setOrganisationId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const org = await fetchMyOrganisationSummary();
        setOrganisationId(org?.id || "");
        const rows = await getEmployees();
        setEmployees(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setError(e.message || "Failed to load organisation");
      }
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Mark attendance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Record present, absent, half-day, leave, or holiday for one employee on one date.
        </p>
        <p className="text-sm mt-2">
          <Link to="/attendance/records" className="text-teal-700 underline">
            View all records
          </Link>
        </p>
      </div>
      {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
      <AttendanceForm
        reload={() => {}}
        defaultOrganisationId={organisationId}
        employees={employees}
        hideOrganisationId
      />
    </div>
  );
}
