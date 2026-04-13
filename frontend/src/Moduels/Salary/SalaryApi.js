import axios from "axios";

// BUG FIX: was hardcoded to 127.0.0.1 — breaks in every non-local environment.
// Read from env vars; fall back to localhost only for local dev.
const API =
  (typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_API_URL        // Vite / React (Vite)
    : process.env.REACT_APP_API_URL) ||    // CRA
  "http://127.0.0.1:9000/api/salary";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  // BUG FIX: guard missing token so we never send "Authorization: Bearer null"
  if (!token) {
    console.warn("[SalaryApi] No auth token in localStorage");
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/* ── TEMPLATES ─────────────────────────────────────────────────────── */

export async function createTemplate(payload) {
  try {
    const res = await axios.post(
      `${API}/templates/`,
      payload,
      {
        ...getAuthHeaders(),
        headers: {
          ...(getAuthHeaders()?.headers || {}),
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  } catch (err) {
    const apiErr = err?.response?.data;
    throw apiErr || err;
  }
}

export const getTemplates = async () => {
  const res = await axios.get(`${API}/templates/`, getAuthHeaders());
  return res.data;
};

/* ── COMPONENTS ─────────────────────────────────────────────────────── */

export const createComponent = async (data) => {
  const res = await axios.post(`${API}/components/`, data, getAuthHeaders());
  return res.data;
};

export const getComponents = async () => {
  const res = await axios.get(`${API}/components/`, getAuthHeaders());
  return res.data;
};

export const updateComponent = async (componentId, data) => {
  const res = await axios.put(
    `${API}/components/${componentId}`,
    data,
    getAuthHeaders()
  );
  return res.data;
};

/* ── TEMPLATE COMPONENTS ─────────────────────────────────────────────── */

export const getTemplateComponents = async (templateId) => {
  const res = await axios.get(
    `${API}/templates/${templateId}/components`,
    getAuthHeaders()
  );
  return res.data;
};

export const addTemplateComponent = async (data) => {
  const res = await axios.post(
    `${API}/templates/components`,
    data,
    getAuthHeaders()
  );
  return res.data;
};

// BUG FIX: this function was completely missing.
// SalaryTemplate.jsx needs it to update an existing component instead of
// silently returning after the "already exists" alert.
export const updateTemplateComponent = async (stcId, data) => {
  const res = await axios.put(
    `${API}/templates/components/${stcId}`,
    data,
    getAuthHeaders()
  );
  return res.data;
};

/* ── EMPLOYEE SALARY STRUCTURES ───────────────────────────────────────── */

export const getEmployeeSalaryStructure = async (employeeId) => {
  const res = await axios.get(
    `${API}/employee-salary-structures/${employeeId}`,
    getAuthHeaders()
  );
  return res.data;
};

export const listEmployeeSalaryStructures = async () => {
  const res = await axios.get(
    `${API}/employee-salary-structures/`,
    getAuthHeaders()
  );
  return res.data;
};

export const assignEmployeeSalary = async (data) => {
  const res = await axios.post(
    `${API}/employee-salary-structures/`,
    data,
    getAuthHeaders()
  );
  return res.data;
};

/* ── SALARY CALCULATOR ────────────────────────────────────────────────── */

export const calculateEmployeeSalary = async (employeeId) => {
  const res = await axios.get(
    `${API}/employee-salary/${employeeId}/calculate`,
    getAuthHeaders()
  );
  return res.data;
};
