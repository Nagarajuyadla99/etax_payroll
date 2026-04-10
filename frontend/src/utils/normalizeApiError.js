export function normalizeApiError(err) {
  // Axios: err.response?.data can be many shapes; FastAPI commonly uses { detail: ... }
  const data = err?.response?.data;

  if (!data) {
    return err?.message || "Something went wrong. Please try again.";
  }

  const detail = data?.detail ?? data?.message ?? data?.error;

  if (typeof detail === "string") return detail;

  // FastAPI validation error: { detail: [{ loc, msg, type }, ...] }
  if (Array.isArray(detail)) {
    const firstMsg = detail.find((x) => typeof x?.msg === "string")?.msg;
    if (firstMsg) return firstMsg;
    const asStrings = detail.filter((x) => typeof x === "string");
    if (asStrings.length) return asStrings.join(", ");
    return "Invalid request. Please check your input.";
  }

  if (detail && typeof detail === "object") {
    // Try common nested message fields
    const msg =
      (typeof detail.msg === "string" && detail.msg) ||
      (typeof detail.message === "string" && detail.message);
    if (msg) return msg;
    try {
      return JSON.stringify(detail);
    } catch {
      return "Something went wrong. Please try again.";
    }
  }

  return "Something went wrong. Please try again.";
}

