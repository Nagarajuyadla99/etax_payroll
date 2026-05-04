import API from "../../services/api";

// PAY PERIOD
export const createPayPeriod = (data) =>
  API.post("/payrolls/pay-periods", data);

// PAYROLL RUN
export const createPayrollRun = (data) =>
  API.post("/payrolls", data);

// GET PAYROLL
export const getPayroll = (id) =>
  API.get(`/payrolls/${id}`);

// PROCESS PAYROLL
export const processPayroll = (id) =>
  API.post(`/payrolls/${id}/process`);

// SUMMARY
export const getPayrollSummary = (id) =>
  API.get(`/payrolls/${id}/summary`);

// REPORTS
export const getPayrollRegister = (id) =>
  API.get(`/payrolls/${id}/register`);

export const getSalaryStatement = (id) =>
  API.get(`/payrolls/${id}/salary-statement`);

export const getTdsSummary = (id) =>
  API.get(`/payrolls/${id}/tds-summary`);

// PAYSLIP
export const downloadPayslip = (runId, empId) =>
  API.get(`/payslips/${runId}/${empId}/download`, {
    responseType: "blob"
  });