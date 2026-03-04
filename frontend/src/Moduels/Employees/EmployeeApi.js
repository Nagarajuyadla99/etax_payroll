import API from "../../services/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getEmployees = async () => {
  const { data } = await API.get("/employees/", getAuthHeaders());
  return data;
};

export const createEmployee = async (payload) => {
  const { data } = await API.post("/employees/", payload, getAuthHeaders());
  return data;
};