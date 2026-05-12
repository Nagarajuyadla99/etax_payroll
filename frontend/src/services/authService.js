import API from "./api";
import { setStoredAccessToken } from "../utils/authSession";

export async function login({ mode, identifier, password }) {
  if (!mode || !identifier || !password) {
    throw new Error("Missing login credentials.");
  }

  if (mode === "admin") {
    const form = new URLSearchParams();
    form.append("username", identifier);
    form.append("password", password);

    const { data } = await API.post("/auth/login", form);
    if (data?.access_token) setStoredAccessToken(data.access_token);
    return data;
  }

  if (mode === "employee") {
    const { data } = await API.post("/employee-auth/login", {
      email: identifier,
      password,
    });
    if (data?.access_token) setStoredAccessToken(data.access_token);
    return data;
  }

  throw new Error("Invalid login mode.");
}

