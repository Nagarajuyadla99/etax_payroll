/**
 * Client-side idempotency keys for financial POST/PATCH operations.
 * Generate a fresh key per deliberate user action; reuse only when retrying the same request.
 */
export function createIdempotencyKey(prefix = "payroll") {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}-${Date.now()}`;
}

export function idempotencyHeaders(prefix = "payroll", key) {
  return {
    "Idempotency-Key": key ?? createIdempotencyKey(prefix),
  };
}

export function getApiErrorDetail(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === "string" ? item : item?.msg || JSON.stringify(item)))
      .join("; ");
  }
  if (detail && typeof detail === "object") {
    return detail.message || JSON.stringify(detail);
  }
  return error?.message || "Request failed";
}

/**
 * Maps disbursement / financial API errors to user-facing messages.
 */
export function formatFinancialApiError(error, { context = "action" } = {}) {
  const status = error?.response?.status;
  const detail = getApiErrorDetail(error);
  const lower = String(detail).toLowerCase();

  if (status === 409) {
    if (lower.includes("idempotency")) {
      return "This request was already processed. The list will refresh.";
    }
    if (lower.includes("not ready for finance")) {
      return "Finance approval is not available yet — complete HR approval first.";
    }
    if (lower.includes("not approved")) {
      return "Payout is only available after the batch is fully approved.";
    }
    if (lower.includes("already approved")) {
      return "This approval step is already complete. Refreshing the batch list.";
    }
    if (lower.includes("finance approval is required") || lower.includes("fully approved")) {
      return detail;
    }
    if (lower.includes("duplicate") || lower.includes("unique") || lower.includes("already exists")) {
      return "A salary batch already exists for this payroll run.";
    }
    return detail;
  }

  if (status === 400) {
    if (lower.includes("bank file format")) {
      return detail;
    }
    if (lower.includes("no payable batch items")) {
      return detail;
    }
    if (lower.includes("idempotency-key")) {
      return "System configuration error: missing idempotency key. Please retry.";
    }
  }

  if (status === 404) {
    return "Salary batch not found or you do not have access.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  return detail || `Failed to complete ${context}`;
}
