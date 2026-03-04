import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../Moduels/Context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null; // or spinner

  return user ? children : <Navigate to="/" replace />;
}