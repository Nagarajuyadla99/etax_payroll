import API from "../../services/api";

const STATUS_TO_CODE = {
  present: "P",
  absent: "A",
  half_day: "HD",
  leave: "L",
  holiday: "H",
  wo: "WO",
  week_off: "WO",
  P: "P",
  A: "A",
  HD: "HD",
  L: "L",
  WO: "WO",
  H: "H",
};

export function normalizeAttendanceStatus(status) {
  if (!status) return "";
  const s = String(status).trim();
  return STATUS_TO_CODE[s] || STATUS_TO_CODE[s.toLowerCase()] || s;
}

// 🔹 Fetch Attendance (Protected)
export async function fetchAttendance(params = {}) {
  try {
    const res = await API.get("/attendance/", { params });
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to fetch attendance";
    throw new Error(msg);
  }
}

// 🔹 Create Attendance (Protected - Admin Only)
export async function createAttendance(data) {
  const payload = { ...data };
  if (payload.status) payload.status = normalizeAttendanceStatus(payload.status);
  try {
    const res = await API.post("/attendance/", payload);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to create attendance";
    throw new Error(msg);
  }
}

// 🔹 Update Attendance (Protected - Admin Only)
export async function updateAttendance(attendance_id, data) {
  const payload = { ...data };
  if (payload.status) payload.status = normalizeAttendanceStatus(payload.status);
  if (payload.work_hours !== undefined) payload.work_hours = Number(payload.work_hours || 0);
  try {
    const res = await API.put(`/attendance/${attendance_id}`, payload);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to update attendance";
    throw new Error(msg);
  }
}

export async function bulkUploadAttendance({ organisation_id, records, upsert = true }) {
  const payload = {
    organisation_id,
    upsert,
    records: (records || []).map((r) => ({
      ...r,
      status: normalizeAttendanceStatus(r.status),
      work_hours: Number(r.work_hours || 0),
    })),
  };
  try {
    const res = await API.post("/attendance/bulk", payload);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to bulk upload attendance";
    throw new Error(msg);
  }
}

export async function applyAttendanceCalendarJob({ organisation_id, from_date, to_date, employee_ids }) {
  const payload = { organisation_id, from_date, to_date, employee_ids: employee_ids || null };
  try {
    const res = await API.post("/attendance/jobs/apply-calendar", payload);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to apply calendar marks";
    throw new Error(msg);
  }
}

export async function upsertAttendanceRecord({ organisation_id, employee_id, work_date, status, work_hours = 0, remarks = null }) {
  return bulkUploadAttendance({
    organisation_id,
    upsert: true,
    records: [
      {
        employee_id,
        work_date,
        status,
        work_hours,
        remarks,
      },
    ],
  });
}

export async function fetchLeaves({ employee_id } = {}) {
  try {
    const res = await API.get("/attendance/leave/", { params: { employee_id: employee_id || undefined } });
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to fetch leaves";
    throw new Error(msg);
  }
}

export async function createLeave(data) {
  try {
    const res = await API.post("/attendance/leave/", data);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to create leave";
    throw new Error(msg);
  }
}

export async function approveLeave({ leave_id, decision = "approved", notes = null }) {
  try {
    const res = await API.post(`/attendance/leave/${leave_id}/approve`, { decision, notes });
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to update leave";
    throw new Error(msg);
  }
}

export async function fetchPayPeriodAttendanceSummary(pay_period_id) {
  try {
    const res = await API.get(`/payrolls/pay-periods/${pay_period_id}/attendance-summary`);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to fetch pay period attendance summary";
    throw new Error(msg);
  }
}

export async function fetchMyOrganisationSummary() {
  try {
    const res = await API.get("/organisation/me");
    return res.data; // { id, name, is_setup_complete }
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "Failed to fetch organisation";
    throw new Error(msg);
  }
}