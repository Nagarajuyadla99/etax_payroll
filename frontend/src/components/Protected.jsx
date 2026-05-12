import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../Moduels/Context/AuthContext";
import { getStoredAccessToken, clearAuthSession } from "../utils/authSession";

export default function Protected({ children }) {
  const { loading, user } = useContext(AuthContext);
  const token = getStoredAccessToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return null;
  }

  if (!user) {
    clearAuthSession("protected_route_without_profile");
    return <Navigate to="/login" replace />;
  }

  return children;
}
