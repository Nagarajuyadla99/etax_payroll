import axios from "axios";

// 🔥 Environment-aware base URL
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:9000/api"   // ✅ local dev
    : "https://api.brixigo.com/api"); // ✅ production

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
      console.error("API Error:", error.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default API;