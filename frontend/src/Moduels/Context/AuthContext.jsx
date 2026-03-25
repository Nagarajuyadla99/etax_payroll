import { createContext, useEffect, useState } from "react";
import { loginUser, getProfile, registerUser } from "../auth/auth";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  // LOGIN
  const login = async (username, password) => {
    const res = await loginUser(username, password);
    console.log("LOGIN RESPONSE:", res);
    localStorage.setItem("token", res.access_token);

    const profile = await getProfile();
    setUser(profile);
  };

  // REGISTER
  const register = async (data) => {
    const res = await registerUser(data);
    return res;
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  useEffect(() => {
    if (localStorage.getItem("token")) {
      getProfile().then(setUser).catch(logout);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}