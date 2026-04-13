import { createContext, useEffect, useMemo, useState } from "react";
import { getProfile, registerUser } from "../auth/auth";
import { login as loginUnified } from "../../services/authService";

export const AuthContext = createContext();

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); // "admin" | "hr" | "employee"
  const [principalType, setPrincipalType] = useState(null); // "user" | "employee"

  // LOGIN
  const login = async ({ mode, identifier, password }) => {
    const res = await loginUnified({ mode, identifier, password });

    const token = localStorage.getItem("token");
    const payload = token ? decodeJwtPayload(token) : null;
    setPrincipalType(payload?.type === "employee" || mode === "employee" ? "employee" : "user");

    try {
      const profile = await getProfile();
      setUser(profile);
      setRole(profile?.role ?? payload?.role ?? null);
    } catch {
      setRole(payload?.role ?? (mode === "employee" ? "employee" : null));
      setUser(
        res?.employee
          ? { legacy: true, employee: res.employee, role: "employee" }
          : null
      );
    }

    return res;
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
    setRole(null);
    setPrincipalType(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const payload = decodeJwtPayload(token);
    setPrincipalType(payload?.type === "employee" ? "employee" : "user");

    getProfile()
      .then((profile) => {
        setUser(profile);
        setRole(profile?.role ?? payload?.role ?? null);
      })
      .catch(() => {
        setRole(payload?.role ?? null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({ user, role, principalType, loading, login, logout, register }),
    [user, role, principalType, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}