import { createContext, useEffect, useState } from "react";
import { loginUser, getProfile } from "../auth/auth";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    const res = await loginUser(username, password);
    localStorage.setItem("token", res.access_token);
    const profile = await getProfile();
    setUser(profile);
  };

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
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}