import axios from "axios";

const API = "http://127.0.0.1:9000/api/salary";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/* CREATE TEMPLATE */
export const createTemplate = async (data) => {
  const res = await axios.post(`${API}/templates/`, data, getAuthHeaders());
  return res.data;
};

/* GET TEMPLATES */
export const getTemplates = async () => {
  const res = await axios.get(`${API}/templates/`, getAuthHeaders());
  return res.data;
};

/* CREATE COMPONENT */
export const createComponent = async (data) => {
  const res = await axios.post(`${API}/components/`, data, getAuthHeaders());
  return res.data;
};

/* GET COMPONENTS */
export const getComponents = async () => {
  const res = await axios.get(`${API}/components/`, getAuthHeaders());
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

/* GET EMPLOYEE SALARY STRUCTURE */

export const getEmployeeSalaryStructure = async (employeeId) => {

  const res = await axios.get(
    `${API}/employee-salary-structures/${employeeId}`,
    getAuthHeaders()
  );

  return res.data;
};


/* LIST EMPLOYEE SALARY STRUCTURES */

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

/* ADD THIS */
export const calculateEmployeeSalary = async (employeeId) => {

  const res = await axios.get(
    `${API}/employee-salary/${employeeId}/calculate`,
    getAuthHeaders()
  );

  return res.data;
};