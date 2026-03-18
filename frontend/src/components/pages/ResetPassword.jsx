import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import "../pages/auth.css";

export default function ResetPassword() {

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {

      await API.post("/auth/reset-password", {
        token: token,
        new_password: password
      });

      setSuccess(true);

      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {
      setError(
        err?.response?.data?.detail || "Password reset failed."
      );
    }

    setLoading(false);
  };

  return (
    <div className="auth-root">

      <div className="auth-card login-card">

        <div className="auth-header">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter your new password
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {success ? (
          <div className="modal-success">
            <h2>Password Updated</h2>
            <p>You will be redirected to sign in.</p>
          </div>
        ) : (

          <form onSubmit={handleSubmit} className="auth-form">

            <div className="field-group">
              <label className="field-label">New Password</label>

              <input
                type="password"
                className="field-input"
                placeholder="Enter new password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Confirm Password</label>

              <input
                type="password"
                className="field-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e)=>setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className={`auth-btn primary-btn ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

          </form>

        )}

      </div>

    </div>
  );
}