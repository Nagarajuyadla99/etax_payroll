/**
 * Single source of truth for API base URL (CRA: REACT_APP_* at build time).
 * Dev default: backend on :9000. Production: same-origin /api behind reverse proxy.
 */

const LOCAL_API = "http://localhost:9000/api";
const LOOPBACK_API = "http://127.0.0.1:9000/api";

function resolveDevBaseUrl() {
  if (typeof window === "undefined") return LOCAL_API;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return host === "127.0.0.1" ? LOOPBACK_API : LOCAL_API;
  }
  return `${window.location.origin}/api`;
}

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? resolveDevBaseUrl()
    : typeof window !== "undefined"
      ? `${window.location.origin}/api`
      : "/api");

export const API_DEBUG =
  process.env.NODE_ENV === "development" ||
  process.env.REACT_APP_API_DEBUG === "true";

export function apiLog(stage, payload) {
  if (!API_DEBUG) return;
  const fn = stage === "error" ? console.error : console.debug;
  fn(`[api][${stage}]`, payload);
}
