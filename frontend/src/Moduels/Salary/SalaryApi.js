import API from "../../services/api";

const S = "/salary";

/* ── TEMPLATES ─────────────────────────────────────────────────────── */

export async function createTemplate(payload) {
  try {
    const { data } = await API.post(`${S}/templates/`, payload);
    return data;
  } catch (err) {
    const apiErr = err?.response?.data;
    throw apiErr || err;
  }
}

export const getTemplates = async () => {
  const { data } = await API.get(`${S}/templates/`);
  return data;
};

/* ── COMPONENTS ─────────────────────────────────────────────────────── */

export const createComponent = async (body) => {
  const { data } = await API.post(`${S}/components/`, body);
  return data;
};

export const getComponents = async () => {
  const { data } = await API.get(`${S}/components/`);
  return data;
};

export const updateComponent = async (componentId, body) => {
  const { data } = await API.put(`${S}/components/${componentId}`, body);
  return data;
};

/* ── TEMPLATE COMPONENTS ─────────────────────────────────────────────── */

export const getTemplateComponents = async (templateId) => {
  const { data } = await API.get(`${S}/templates/${templateId}/components`);
  return data;
};

export const addTemplateComponent = async (body) => {
  const { data } = await API.post(`${S}/templates/components`, body);
  return data;
};

export const updateTemplateComponent = async (stcId, body) => {
  const { data } = await API.put(`${S}/templates/components/${stcId}`, body);
  return data;
};

/* ── EMPLOYEE SALARY STRUCTURES ───────────────────────────────────────── */

export const getEmployeeSalaryStructure = async (employeeId) => {
  const { data } = await API.get(`${S}/employee-salary-structures/${employeeId}`);
  return data;
};

export const listEmployeeSalaryStructures = async () => {
  const { data } = await API.get(`${S}/employee-salary-structures/`);
  return data;
};

export const assignEmployeeSalary = async (body) => {
  const { data } = await API.post(`${S}/employee-salary-structures/`, body);
  return data;
};

/* ── SALARY CALCULATOR ────────────────────────────────────────────────── */

export const calculateEmployeeSalary = async (employeeId) => {
  const { data } = await API.get(`${S}/employee-salary/${employeeId}/calculate`);
  return data;
};
