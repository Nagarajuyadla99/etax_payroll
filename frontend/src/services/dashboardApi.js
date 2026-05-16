import API from "./api";

/** GET /api/dashboard/overview — org-scoped payroll dashboard metrics */
export async function getDashboardOverview() {
  const { data } = await API.get("/dashboard/overview");
  return data;
}
