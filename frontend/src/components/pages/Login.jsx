import { useState, useContext } from "react";
import { AuthContext } from "../../Moduels/Context/AuthContext";
import { useNavigate } from "react-router-dom";
import RegisterModal from "./RegisterModal";
import ForgotPasswordModal from "./ForgotPasswordModal";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .login-root {
          min-height: 100vh;
          background: #fff5f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        /* Decorative blobs */
        .lb1 {
          position: absolute;
          top: -100px; left: -100px;
          width: 420px; height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251, 36, 36, 0.22) 0%, transparent 70%);
          pointer-events: none;
        }
        .lb2 {
          position: absolute;
          bottom: -80px; right: -80px;
          width: 380px; height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(249, 22, 22, 0.16) 0%, transparent 70%);
          pointer-events: none;
        }
        .lb3 {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(253, 138, 138, 0.13) 0%, transparent 65%);
          pointer-events: none;
        }

        /* Card */
        .login-card {
          background: #FFFFFF;
          border-radius: 24px;
          border: 1.5px solid #f0c0c0;
          padding: 40px 36px;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
          box-shadow:
            0 4px 6px rgba(180,83,9,0.04),
            0 12px 28px rgba(180,83,9,0.08),
            0 0 0 1px rgba(245,158,11,0.06);
          animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Brand */
        .login-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 28px;
        }
        .login-logo {
          width: 42px; height: 42px;
          border-radius: 13px;
          background: linear-gradient(135deg, #f51b0b, #f34949);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 4px 14px rgba(245, 11, 11, 0.38);
          flex-shrink: 0;
        }
        .login-brand-name {
          font-size: 17px;
          font-weight: 800;
          color: #1C1507;
          letter-spacing: -0.3px;
        }
        .login-brand-sub {
          font-size: 11px;
          color: #a34d4a;
          font-weight: 500;
        }

        /* Title */
        .login-title {
          font-size: 22px;
          font-weight: 800;
          color: #1C1507;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }
        .login-subtitle {
          font-size: 13px;
          color: #000000;
          margin-bottom: 24px;
          font-weight: 500;
        }

        /* Error */
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFF1F2;
          border: 1.5px solid #FECDD3;
          color: #BE123C;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 18px;
        }

        /* Fields */
        .field-group { margin-bottom: 16px; }
        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #5c271e;
          margin-bottom: 7px;
          letter-spacing: 0.1px;
        }
        .field-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 7px;
        }
        .field-label-row .field-label { margin-bottom: 0; }

        .field-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-icon {
          position: absolute;
          left: 12px;
          color: #c47d7d;
          display: flex;
          pointer-events: none;
        }
        .field-input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border-radius: 10px;
          border: 1.5px solid #f0dac0;
          background: #ffffff;
          font-size: 13.5px;
          color: #1C1507;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
          outline: none;
          transition: all 0.15s ease;
        }
        .field-input::placeholder { color: #c47d7d; }
        .field-input:focus {
          border-color: #f51b0b;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.12);
        }

        .toggle-pw {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #c47d7d;
          display: flex;
          padding: 0;
          transition: color 0.15s;
        }
        .toggle-pw:hover { color: #f50b0b; }

        .forgot-link {
          font-size: 12px;
          font-weight: 600;
          color: #f50b0b;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .forgot-link:hover { color: #d91406; }

        /* Buttons */
        .btn-primary {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #f50b0b, #f91616);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;
          box-shadow: 0 4px 14px rgba(245, 11, 11, 0.35);
          transition: all 0.15s ease;
          letter-spacing: 0.1px;
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #d90606, #ea0c0c);
          box-shadow: 0 6px 18px rgba(245, 11, 11, 0.42);
          transform: translateY(-1px);
        }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
        }
        .divider-line { flex: 1; height: 1px; background: #F0E4C0; }
        .divider-text { font-size: 11.5px; color: #c48e7d; font-weight: 600; }

        .btn-secondary {
          width: 100%;
          padding: 11px;
          border-radius: 12px;
          border: 1.5px solid #F0E4C0;
          background: #FFFBEB;
          color: #5c1e1e;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.15s ease;
        }
        .btn-secondary:hover {
          background: #ffffff;
          border-color: #f50b0b;
          color: #f30e0e;
        }

        .login-footer {
          text-align: center;
          margin-top: 20px;
          font-size: 11.5px;
          color: #c47d7d;
          font-weight: 500;
        }
        .login-footer a { color: #f50b0b; font-weight: 600; text-decoration: none; }
        .login-footer a:hover { color: #d90606; text-decoration: underline; }
      `}</style>

      <div className="login-root">
        <div className="lb1" />
        <div className="lb2" />
        <div className="lb3" />

        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-logo">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <rect width="12" height="12" rx="3" fill="currentColor" />
                <rect x="16" width="12" height="12" rx="3" fill="currentColor" opacity="0.65" />
                <rect y="16" width="12" height="12" rx="3" fill="currentColor" opacity="0.65" />
                <rect x="16" y="16" width="12" height="12" rx="3" fill="currentColor" opacity="0.35" />
              </svg>
            </div>
            <div>
              <div className="login-brand-name">Payroll Pro</div>
              <div className="login-brand-sub">Management System</div>
            </div>
          </div>

          <h1 className="login-title">Welcome back </h1>
          <p className="login-subtitle">Sign in to continue to your workspace</p>

          {error && (
            <div className="login-error" role="alert">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="username">Username</label>
              <div className="field-wrap">
                <span className="field-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  className="field-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label className="field-label" htmlFor="password">Password</label>
                <button type="button" className="forgot-link" onClick={() => setShowForgotPassword(true)}>
                  Forgot password?
                </button>
              </div>
              <div className="field-wrap">
                <span className="field-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="field-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="toggle-pw" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <><span className="spinner" />Signing in…</> : "Sign In →"}
            </button>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">or</span>
            <div className="divider-line" />
          </div>

          <button type="button" className="btn-secondary" onClick={() => setShowRegister(true)}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M1 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 9v4M10 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Create a new account
          </button>

          <p className="login-footer">
            By signing in you agree to our{" "}
            <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
    </>
  );
}
