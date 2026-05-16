import {
  createContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { getProfile, registerUser } from "../auth/auth";
import { login as loginUnified } from "../../services/authService";
import {
  decodeJwtPayload,
  getStoredAccessToken,
  clearAuthSession,
  isAccessTokenExpired,
} from "../../utils/authSession";
import {
  clearPayrollWorkflow,
  reconcilePayrollWorkflowWithUser,
} from "../payroll/payrollWorkflow";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [principalType, setPrincipalType] = useState(null);

  const resetLocalState = useCallback(() => {
    setUser(null);
    setRole(null);
    setPrincipalType(null);
  }, []);

  const login = useCallback(
    async ({ mode, identifier, password }) => {
      const res = await loginUnified({ mode, identifier, password });

      const token = getStoredAccessToken();
      const payload = token ? decodeJwtPayload(token) : null;
      setPrincipalType(
        payload?.type === "employee" || mode === "employee" ? "employee" : "user"
      );

      try {
        const profile = await getProfile();
        setUser(profile);
        setRole(profile?.role ?? payload?.role ?? null);
        reconcilePayrollWorkflowWithUser(profile);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          clearAuthSession("login_profile_401");
          resetLocalState();
          throw err;
        }
        setRole(payload?.role ?? (mode === "employee" ? "employee" : null));
        setUser(
          res?.employee
            ? { legacy: true, employee: res.employee, role: "employee" }
            : null
        );
      }

      return res;
    },
    [resetLocalState]
  );

  const register = useCallback(async (data) => registerUser(data), []);

  const logout = useCallback(() => {
    clearAuthSession("logout");
    clearPayrollWorkflow();
    resetLocalState();
  }, [resetLocalState]);

  useEffect(() => {
    const onExpired = () => {
      resetLocalState();
    };
    window.addEventListener("auth:session-expired", onExpired);
    return () => window.removeEventListener("auth:session-expired", onExpired);
  }, [resetLocalState]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    if (isAccessTokenExpired(token)) {
      clearAuthSession("token_expired_client");
      resetLocalState();
      setLoading(false);
      return;
    }

    const payload = decodeJwtPayload(token);
    setPrincipalType(payload?.type === "employee" ? "employee" : "user");

    getProfile()
      .then((profile) => {
        setUser(profile);
        setRole(profile?.role ?? payload?.role ?? null);
        reconcilePayrollWorkflowWithUser(profile);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) {
          clearAuthSession("bootstrap_profile_401");
        }
        resetLocalState();
      })
      .finally(() => setLoading(false));
  }, [resetLocalState]);

  const value = useMemo(
    () => ({ user, role, principalType, loading, login, logout, register }),
    [user, role, principalType, loading, login, logout, register]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
