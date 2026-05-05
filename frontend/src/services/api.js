import axios from "axios";

// 🔥 Environment-aware base URL
// Local dev: CRA on 9999 → API on 9000. Production behind nginx: same-origin /api.
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

// 🔐 Attach token automatically
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🚨 Global error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error?.config?.url || "";
    const method = (error?.config?.method || "get").toUpperCase();

    // 🔒 Handle unauthorized
    if (status === 401) {
      // /users/me supports all principals; keep 401 handling scoped if needed.
      if (!url.includes("/users/me")) {
        localStorage.removeItem("token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    // Optional: log for debugging
    if (process.env.NODE_ENV === "development") {
      const requestId =
        error.response?.headers?.["x-request-id"] ||
        error.response?.headers?.["X-Request-Id"];

      console.error("API Error", {
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