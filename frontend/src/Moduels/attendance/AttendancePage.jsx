import { useEffect, useState } from "react";
import AttendanceForm from "./AttendanceForm";
import { fetchMyOrganisationSummary } from "./attendanceApi";

export default function AttendancePage() {

  const [organisationId, setOrganisationId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const org = await fetchMyOrganisationSummary();
        setOrganisationId(org?.id || "");
      } catch (e) {
        setError(e.message || "Failed to load organisation context");
      }
    })();
  }, []);

  return (
    <div className="p-6">

      {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}

      <AttendanceForm
        reload={() => {}}
        defaultOrganisationId={organisationId}
      />

    </div>
  );
}
