import axios from "axios";
import {
  getStoredAccessToken,
  isPublicAuthRequestUrl,
  shouldRedirectToLoginOn401,
  clearAuthSession,
} from "../utils/authSession";
import { API_BASE_URL, API_DEBUG, apiLog } from "../config/apiConfig";

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 60_000,
});

if (API_DEBUG) {
  apiLog("init", { baseURL: API_BASE_URL });
}

API.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();

    if (API_DEBUG) {
      apiLog("request", {
        method: (config.method || "get").toUpperCase(),
        baseURL: config.baseURL,
        url: config.url || "",
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
  (response) => {
    if (API_DEBUG) {
      apiLog("response", {
        method: (response.config.method || "get").toUpperCase(),
        url: response.config.url,
        status: response.status,
      });
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error?.config?.url || "";
    const method = (error?.config?.method || "get").toUpperCase();

    if (status === 401 && !isPublicAuthRequestUrl(url)) {
      const hadToken = Boolean(getStoredAccessToken());
      clearAuthSession(hadToken ? "401_unauthorized" : "401_no_valid_session");
      if (shouldRedirectToLoginOn401()) {
        window.location.replace("/login");
      }
    }

    apiLog("error", {
      method,
      baseURL: error?.config?.baseURL,
      url,
      status,
      requestId:
        error.response?.headers?.["x-request-id"] ||
        error.response?.headers?.["X-Request-Id"],
      data: error.response?.data,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

export default API;
export { API_BASE_URL };
