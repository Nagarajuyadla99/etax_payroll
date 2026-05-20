import API from "../../services/api";

export async function fetchWfLabels(locale = "en") {
  const res = await API.get("/wf/labels", { params: { locale } });
  return res.data;
}

export async function fetchWfAttendanceProfile() {
  const res = await API.get("/wf/attendance-profile");
  return res.data;
}

export async function activateWfAttendanceProfile(payload) {
  const res = await API.post("/wf/attendance-profile/activate", payload);
  return res.data;
}

export async function fetchWfEnabledModes() {
  const res = await API.get("/wf/attendance-profile/modes");
  return res.data;
}

export async function fetchWfSourcePlugins() {
  const res = await API.get("/wf/sources");
  return res.data;
}

export async function fetchWfHolidays(params = {}) {
  const res = await API.get("/wf/holidays", { params });
  return res.data;
}

export async function createWfHoliday(data) {
  const res = await API.post("/wf/holidays", data);
  return res.data;
}

export async function updateWfHoliday(holidayId, data) {
  const res = await API.put(`/wf/holidays/${holidayId}`, data);
  return res.data;
}

export async function deleteWfHoliday(holidayId) {
  await API.delete(`/wf/holidays/${holidayId}`);
}

export async function fetchWfFeatureFlags() {
  const res = await API.get("/wf/feature-flags");
  return res.data;
}

export async function patchWfFeatureFlag(flagCode, data) {
  const res = await API.patch(`/wf/feature-flags/${flagCode}`, data);
  return res.data;
}

export async function ingestWfRawEvent(data) {
  const res = await API.post("/wf/events/ingest", data);
  return res.data;
}

export async function startWfRecompute(data) {
  const res = await API.post("/wf/jobs/recompute", data);
  return res.data;
}

export async function fetchWfExceptions(statusFilter) {
  const res = await API.get("/wf/exceptions", {
    params: statusFilter ? { status_filter: statusFilter } : {},
  });
  return res.data;
}

export async function seedWfPlatform() {
  const res = await API.post("/wf/platform/seed");
  return res.data;
}

export async function fetchWfPolicies() {
  const res = await API.get("/wf/policies");
  return res.data;
}

export async function createWfPolicy(data) {
  const res = await API.post("/wf/policies", data);
  return res.data;
}

export async function publishWfPolicy(policyId) {
  const res = await API.post(`/wf/policies/${policyId}/publish`);
  return res.data;
}

export async function addWfPolicyRule(policyId, data) {
  const res = await API.post(`/wf/policies/${policyId}/rules`, data);
  return res.data;
}

export async function fetchWfApprovals(statusFilter = "pending") {
  const res = await API.get("/wf/approvals", {
    params: statusFilter ? { status_filter: statusFilter } : {},
  });
  return res.data;
}

export async function decideWfApproval(requestId, data) {
  const res = await API.post(`/wf/approvals/${requestId}/decide`, data);
  return res.data;
}

export async function patchWfLabels(data) {
  const res = await API.patch("/wf/labels", data);
  return res.data;
}

export async function fetchWfRosters() {
  const res = await API.get("/wf/rosters");
  return res.data;
}

export async function createWfRoster(data) {
  const res = await API.post("/wf/rosters", data);
  return res.data;
}

export async function publishWfRoster(rosterPlanId) {
  const res = await API.post(`/wf/rosters/${rosterPlanId}/publish`);
  return res.data;
}

export async function addWfRosterAssignments(rosterPlanId, assignments) {
  const res = await API.post(`/wf/rosters/${rosterPlanId}/assignments`, { assignments });
  return res.data;
}

export async function fetchWfAnalytics(fromDate, toDate) {
  const res = await API.get("/wf/analytics/dashboard", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return res.data;
}

export async function fetchWfOpsMetrics() {
  const res = await API.get("/wf/enterprise/ops/metrics");
  return res.data;
}

export async function fetchWfPolicyExecutionLogs(params = {}) {
  const res = await API.get("/wf/enterprise/policy-execution-logs", { params });
  return res.data;
}

export async function refreshWfProjections(fromDate, toDate) {
  const res = await API.post("/wf/enterprise/projections/refresh", null, {
    params: { from_date: fromDate, to_date: toDate },
  });
  return res.data;
}

export async function submitWfRoster(rosterPlanId, notes) {
  const res = await API.post(`/wf/enterprise/rosters/${rosterPlanId}/submit`, { notes });
  return res.data;
}

export async function approveWfRoster(rosterPlanId) {
  const res = await API.post(`/wf/enterprise/rosters/${rosterPlanId}/approve`);
  return res.data;
}

export async function freezeWfRoster(rosterPlanId) {
  const res = await API.post(`/wf/enterprise/rosters/${rosterPlanId}/freeze`);
  return res.data;
}

export async function archiveWfRoster(rosterPlanId) {
  const res = await API.post(`/wf/enterprise/rosters/${rosterPlanId}/archive`);
  return res.data;
}

export async function applyWfFreeze(data) {
  const res = await API.post("/wf/enterprise/freeze", data);
  return res.data;
}

export async function fetchWfDevices() {
  const res = await API.get("/wf/enterprise/devices");
  return res.data;
}

export async function registerWfDevice(data) {
  const res = await API.post("/wf/enterprise/devices", data);
  return res.data;
}

export async function fetchWfTerminals() {
  const res = await API.get("/wf/enterprise/terminals");
  return res.data;
}

export async function fetchWfPolicyLogDetail(logId) {
  const res = await API.get(`/wf/enterprise/policy-execution-logs/${logId}`);
  return res.data;
}

export async function fetchWfWorkerHealth() {
  const res = await API.get("/wf/enterprise/ops/worker-health");
  return res.data;
}

export async function fetchWfQueueMetrics() {
  const res = await API.get("/wf/enterprise/ops/queue-metrics");
  return res.data;
}

export async function fetchWfProjectionSummary(fromDate, toDate) {
  const res = await API.get("/wf/enterprise/projections/summary", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return res.data;
}
