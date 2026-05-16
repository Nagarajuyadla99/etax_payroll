import API from "../../services/api";
import {
  createIdempotencyKey,
  getApiErrorDetail,
  idempotencyHeaders,
} from "../../utils/idempotency";

export { createIdempotencyKey };

/** @deprecated Use createIdempotencyKey — kept for existing payroll screens. */
export function newIdempotencyKey() {
  return createIdempotencyKey("payroll");
}

// PAY PERIOD
export const createPayPeriod = (data) =>
  API.post("/payrolls/pay-periods", data);

// PAYROLL RUN
export const createPayrollRun = (data) => API.post("/payrolls", data);

export const getPayroll = (id) => API.get(`/payrolls/${id}`);

/**
 * GET /payrolls/:id — poll this for execution_status (same as backend; no separate /status route).
 */
export const getPayrollRunStatus = (id) => API.get(`/payrolls/${id}`);

/**
 * POST /payrolls/:id/process — accepts 200 (sync) or 202 (Celery).
 * @param {string} runId
 * @param {{ idempotencyKey?: string, shadowLegacy?: boolean, parallelism?: number }} options
 */
export const processPayroll = (runId, options = {}) => {
  const idempotencyKey = options.idempotencyKey ?? newIdempotencyKey();
  const params = {};
  if (options.shadowLegacy === true) params.shadow_legacy = true;
  if (options.parallelism != null && options.parallelism !== "") {
    params.parallelism = options.parallelism;
  }
  return API.post(`/payrolls/${runId}/process`, {}, {
    headers: { "Idempotency-Key": idempotencyKey },
    params,
    validateStatus: (s) => s === 200 || s === 202,
  }).then((res) => ({ ...res, idempotencyKey }));
};

export const getExecutionTrace = (runId) =>
  API.get(`/payrolls/${runId}/execution-trace`);

export const replayVerifyPayroll = (runId, options = {}) => {
  const idempotencyKey = options.idempotencyKey ?? newIdempotencyKey();
  return API.post(
    `/payrolls/${runId}/replay-verify`,
    {},
    {
      headers: { "Idempotency-Key": idempotencyKey },
    }
  ).then((res) => ({ ...res, idempotencyKey }));
};

/**
 * POST /payrolls/batch/process
 * @param {string[]} payrollRunIds
 * @param {{ idempotencyKey?: string, shadowLegacy?: boolean, parallelism?: number }} options
 */
export const batchProcessPayrolls = (payrollRunIds, options = {}) => {
  const idempotencyKey = options.idempotencyKey ?? newIdempotencyKey();
  const params = {};
  if (options.shadowLegacy === true) params.shadow_legacy = true;
  if (options.parallelism != null && options.parallelism !== "") {
    params.parallelism = options.parallelism;
  }
  return API.post(
    "/payrolls/batch/process",
    { payroll_run_ids: payrollRunIds },
    {
      headers: { "Idempotency-Key": idempotencyKey },
      params,
      validateStatus: (s) => s === 200 || s === 202,
    }
  ).then((res) => ({ ...res, idempotencyKey }));
};

// SUMMARY
export const getPayrollSummary = (id) =>
  API.get(`/payrolls/${id}/summary`);

// REPORTS
export const getPayrollRegister = (id) =>
  API.get(`/payrolls/${id}/register`);

export const getSalaryStatement = (id) =>
  API.get(`/payrolls/${id}/salary-statement`);

export const getTdsSummary = (id) =>
  API.get(`/payrolls/${id}/tds-summary`);

export const downloadPayslip = (runId, empId) =>
  API.get(`/payslips/${runId}/${empId}/download`, {
    responseType: "blob",
  });

/** Phase 4: JSON payslip from stored entries (locked payroll only). */
export const getPayslipData = (employeeId, payrollRunId) =>
  API.get(`/payslip/${employeeId}`, { params: { payroll_run_id: payrollRunId } });

export const verifyPayrollLifecycle = (runId) =>
  API.post(`/payrolls/${runId}/lifecycle/verify`);

export const approvePayrollLifecycle = (runId) =>
  API.post(`/payrolls/${runId}/lifecycle/approve`);

export const lockPayrollLifecycle = (runId) =>
  API.post(`/payrolls/${runId}/lifecycle/lock`);

export const getPayrollLifecycleAudit = (runId) =>
  API.get(`/payrolls/${runId}/lifecycle/audit`);

/**
 * User-facing message for payroll process / reset API errors (structured detail from backend).
 */
export function formatPayrollProcessError(error) {
  const detail = error?.response?.data?.detail;

  if (detail && typeof detail === "object" && detail.code) {
    const code = detail.code;
    const msg = detail.message || "Payroll request failed";
    if (code === "PAYROLL_ALREADY_PROCESSED" || code === "PAYROLL_MODE_MISMATCH") {
      return `${msg} Use “Regenerate payroll using attendance mode” below, then Process again.`;
    }
    if (code === "ATTENDANCE_VALIDATION_FAILED") {
      return msg;
    }
    return msg;
  }

  if (typeof detail === "string") {
    if (detail.toLowerCase().includes("already processed")) {
      return `${detail} Use “Regenerate payroll using attendance mode”, then Process again.`;
    }
    return detail;
  }

  return getApiErrorDetail(error);
}

export function resetPayrollForReprocess(runId, options = {}) {
  const idempotencyKey = options.idempotencyKey ?? newIdempotencyKey();
  return API.post(
    `/payrolls/${runId}/reset-for-reprocess`,
    {},
    {
      headers: idempotencyHeaders("payroll-reset", idempotencyKey),
    }
  ).then((res) => ({ ...res, idempotencyKey }));
}
