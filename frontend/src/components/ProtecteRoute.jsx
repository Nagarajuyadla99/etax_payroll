import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../Moduels/Context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { loading, role } = useContext(AuthContext);
  const token = localStorage.getItem("token");

  if (loading) return null; // or spinner

  if (!token) return <Navigate to="/login" replace />;

  if (Array.isArray(allowedRoles) && allowedRoles.length) {
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}