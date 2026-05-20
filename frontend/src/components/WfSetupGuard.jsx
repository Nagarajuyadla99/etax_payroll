import { useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../Moduels/Context/AuthContext";
import { fetchWfSetupStatus } from "../Moduels/attendance/wfApi";

const SETUP_PATH = "/attendance/setup";
const ALLOWED_WHILE_SETUP = [SETUP_PATH, "/profile", "/settings", "/security"];

function isAdminRole(role) {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "superadmin" || r === "super_admin";
}

export default function WfSetupGuard({ children }) {
  const { role } = useContext(AuthContext);
  const location = useLocation();
  const [required, setRequired] = useState(null);

  const isAdmin = isAdminRole(role);

  useEffect(() => {
    if (!isAdmin) {
      setRequired(false);
      return;
    }
    let cancelled = false;
    fetchWfSetupStatus()
      .then((s) => {
        if (!cancelled) setRequired(!!s.setup_required);
      })
      .catch(() => {
        if (!cancelled) setRequired(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, location.pathname]);

  if (!isAdmin || required === null) {
    return children;
  }

  if (
    required &&
    !ALLOWED_WHILE_SETUP.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
  ) {
    return <Navigate to={SETUP_PATH} replace />;
  }

  return children;
}
