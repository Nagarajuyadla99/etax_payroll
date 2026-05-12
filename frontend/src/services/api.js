import axios from "axios";
import {
  getStoredAccessToken,
  isPublicAuthRequestUrl,
  shouldRedirectToLoginOn401,
  clearAuthSession,
} from "../utils/authSession";

const AUTH_DEBUG =
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";

// Environment-aware base URL: CRA dev → API :9000; production → same-origin /api.
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? "http://localhost:9000/api"
    : `${window.location.origin}/api`);

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

API.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();

    if (AUTH_DEBUG) {
      const rel = config.url || "";
      console.debug("[auth][request]", {
        method: (config.method || "get").toUpperCase(),
        baseURL: config.baseURL,
        url: rel,
        hasBearer: Boolean(token),
      });
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error?.config?.url || "";
    const method = (error?.config?.method || "get").toUpperCase();

    if (status === 401 && !isPublicAuthRequestUrl(url)) {
      const hadToken = Boolean(getStoredAccessToken());
      clearAuthSession(
        hadToken ? "401_unauthorized" : "401_no_valid_session"
      );
      if (shouldRedirectToLoginOn401()) {
        window.location.replace("/login");
      }
    }

    if (AUTH_DEBUG) {
      const requestId =
        error.response?.headers?.["x-request-id"] ||
        error.response?.headers?.["X-Request-Id"];

      console.error("[api] error", {
        method,
        baseURL: error?.config?.baseURL,
        url,
        status,
        requestId,
        data: error.response?.data,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default API;
