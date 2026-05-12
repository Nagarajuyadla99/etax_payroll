import API from "./api";

export const getCurrentUser = async () => {
  const { data } = await API.get("/users/me");
  return data;
};