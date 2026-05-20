import { useCallback, useEffect, useState } from "react";
import { fetchWfLabels } from "../Moduels/attendance/wfApi";

const FALLBACK = {
  "attendance.entity": "Attendance",
  "employee.entity": "Employee",
  "shift.entity": "Shift",
  "present.label": "Present",
  "absent.label": "Absent",
};

export function useWfLabels(locale = "en") {
  const [labels, setLabels] = useState(FALLBACK);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await fetchWfLabels(locale);
      setLabels({ ...FALLBACK, ...(data.labels || {}) });
      setVersion(data.version || 0);
    } catch {
      setLabels(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    reload();
  }, [reload]);

  const t = useCallback((key, fallback) => labels[key] || fallback || key, [labels]);

  return { labels, version, loading, t, reload };
}
