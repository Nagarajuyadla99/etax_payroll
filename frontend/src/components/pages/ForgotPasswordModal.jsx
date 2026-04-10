import { useState, useEffect, useRef } from "react";
import "./auth.css";
import API from "../../services/api";

export default function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!email.trim()) {
    setError("Email address is required.");
    return;
  }

  setIsLoading(true);

  try {
    await API.post("/auth/forgot-password", {
      email: email,
    });

    setSent(true);
  } catch (err) {
    setError("Failed to send reset link.");
  } finally {
    setIsLoading(false);
  }
};
  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Reset password">
      <div className="modal-card modal-card--sm">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {sent ? (
          <div className="modal-success">
            <div className="success-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="1" y="6" width="30" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1 10l15 10L31 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="auth-title">Check your email</h2>
            <p className="auth-subtitle">
              We've sent a password reset link to <strong>{email}</strong>. Check your inbox (and spam folder).
            </p>
            <button className="auth-btn primary-btn" style={{ marginTop: "1.5rem" }} onClick={onClose}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="modal-icon-header">
              <div className="modal-icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </div>
            </div>

            <div className="auth-header">
              <h2 className="auth-title">Reset your password</h2>
              <p className="auth-subtitle">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="field-group">
                <label className="field-label" htmlFor="forgot-email">Email Address</label>
                <div className="field-wrapper">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    className="field-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`auth-btn primary-btn ${isLoading ? "loading" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><span className="spinner" />Sending…</>
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <button type="button" className="auth-btn ghost-btn" onClick={onClose} style={{ marginTop: "0.5rem" }}>
                Cancel
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
