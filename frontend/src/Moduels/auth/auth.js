import API from "../../services/api";

export const loginUser = async (username, password) => {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);

  const { data } = await API.post("/login", form);
  return data;
};

export const getProfile = async () => {
  const { data } = await API.get("/me");
  return data;
};