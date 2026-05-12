/**
 * Centralized auth session helpers (token key, read/write, JWT exp, events).
 * Keeps localStorage key stable as "token" for backward compatibility.
 */

export const AUTH_TOKEN_STORAGE_KEY = "token";

const AUTH_DEBUG =
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";

export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getStoredAccessToken() {
  try {
    const raw = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const t = String(raw).trim();
    if (!t || t === "null" || t === "undefined") return null;
    return t;
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token) {
  if (token == null || token === "") {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    if (AUTH_DEBUG) {
      console.info("[auth] token cleared (set empty)");
    }
    return;
  }
  const t = String(token).trim();
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, t);
  if (AUTH_DEBUG) {
    console.info("[auth] token stored", { length: t.length });
  }
}

export function clearAuthSession(reason = "unknown") {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  try {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (AUTH_DEBUG) {
    console.warn("[auth] session cleared", { reason });
  }
  window.dispatchEvent(
    new CustomEvent("auth:session-expired", { detail: { reason } })
  );
}

/**
 * @param {string} token
 * @param {number} leewaySec — treat as expired this many seconds before exp
 */
export function isAccessTokenExpired(token, leewaySec = 60) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + leewaySec;
}

/** Login / register / password flows — 401 must not wipe an existing session. */
export function isPublicAuthRequestUrl(url) {
  if (!url || typeof url !== "string") return false;
  const path = url.split("?")[0];
  return (
    path.includes("/auth/login") ||
    path.includes("/auth/login-unified") ||
    path.includes("/auth/register") ||
    path.includes("/employee-auth/login") ||
    path.includes("/auth/forgot-password") ||
    path.includes("/auth/reset-password") ||
    path.includes("/auth/google/")
  );
}

const PUBLIC_APP_PATHS = new Set([
  "/",
  "/login",
  "/reset-password",
  "/registermodal",
]);

export function shouldRedirectToLoginOn401() {
  const p = window.location.pathname || "";
  return !PUBLIC_APP_PATHS.has(p);
}
