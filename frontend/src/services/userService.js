import API from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getCurrentUser = async () => {
  const { data } = await API.get("/users/me", getAuthHeaders());
  return data;
};