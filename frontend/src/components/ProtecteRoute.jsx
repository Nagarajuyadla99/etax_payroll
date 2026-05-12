import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../Moduels/Context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { loading, role } = useContext(AuthContext);
  const token = localStorage.getItem("token");

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading…
        </div>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  if (Array.isArray(allowedRoles) && allowedRoles.length) {
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}