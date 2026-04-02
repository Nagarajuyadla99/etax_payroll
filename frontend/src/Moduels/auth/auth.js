import API from "../../services/api";

export const loginUser = async (username, password) => {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);

  const { data } = await API.post("/auth/login", form);
  localStorage.setItem("token", data.access_token);
  return data;
};

export const registerUser = async (payload) => {
  const { data } = await API.post("/auth/register", payload);
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await API.post("/auth/forgot-password", { email });
  return data;
};

export const getProfile = async () => {
  const { data } = await API.get("/users/me");
  return data;
};