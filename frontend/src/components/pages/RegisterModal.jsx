import { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../../Moduels/Context/AuthContext";
import "./auth.css";
import { forgotPassword } from "../../Moduels/auth/auth";
import logo1 from "../assets/images/logo_brixigo3.png"

export default function RegisterModal({ onClose }) {
  const { register } = useContext(AuthContext);

  const [step, setStep] = useState(1); // 2-step registration
  const [formData, setFormData] = useState({
  fullName: "",
  email: "",
  organisationName: "",
  organisationCode: "",
  username: "",
  password: "",
  confirmPassword: "",
});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const overlayRef = useRef(null);

  // Close on Escape key
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

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

 const validateStep1 = () => {
  const errs = {};

  if (!formData.fullName.trim())
    errs.fullName = "Full name is required.";

  if (!formData.email.trim()) {
    errs.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errs.email = "Enter a valid email address.";
  }

  if (!formData.organisationName.trim())
    errs.organisationName = "Organization name is required.";

  setErrors(errs);
  return Object.keys(errs).length === 0;
};

  const validateStep2 = () => {
    const errs = {};
    if (!formData.username.trim()) errs.username = "Username is required.";
    else if (formData.username.length < 3) errs.username = "Minimum 3 characters.";
    if (!formData.password) {
      errs.password = "Password is required.";
    } else if (formData.password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }
    if (!formData.confirmPassword) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsLoading(true);
    try {
    await register({
  username: formData.username,
  email: formData.email,
  password: formData.password,
  full_name: formData.fullName,
  organisation_name: formData.organisationName,
  organisation_code: formData.organisationCode
});
      setSuccess(true);
    } catch (err) {
      setErrors({ global: err?.message || "Registration failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const map = [
      { label: "", color: "" },
      { label: "Weak", color: "#ef4444" },
      { label: "Fair", color: "#f5ab0b" },
      { label: "Good", color: "#3b82f6" },
      { label: "Strong", color: "#10b981" },
    ];
    return { score, ...map[score] };
  };

  const strength = passwordStrength(formData.password);

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Register new account">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {success ? (
          <div className="modal-success">
            <div className="success-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 16l5 5 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="auth-title">Account Created!</h2>
            <p className="auth-subtitle">Welcome aboard, {formData.fullName.split(" ")[0]}. You can now sign in.</p>
            <button className="auth-btn primary-btn" style={{ marginTop: "1.5rem" }} onClick={onClose}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="brand" style={{ marginBottom: "0.25rem" }}>
              
                 <img
                        src={logo1}
                        alt="Brixigo"
                        style={{
                          height: 50,
                          width: "auto",
                
                          objectFit: "contain"
                        }}
                      />
              
              
            </div>

            <div className="auth-header">
              <h2 className="auth-title">Create your account</h2>
              <p className="auth-subtitle">Step {step} of 2 — {step === 1 ? "Personal info" : "Set credentials"}</p>
            </div>

            {/* Step indicator */}
            <div className="step-indicator">
              <div className={`step-dot ${step >= 1 ? "active" : ""}`} />
              <div className={`step-line ${step === 2 ? "active" : ""}`} />
              <div className={`step-dot ${step === 2 ? "active" : ""}`} />
            </div>

            {errors.global && (
              <div className="auth-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {errors.global}
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleNext} className="auth-form" noValidate>
                <div className="field-group">
                  <label className="field-label" htmlFor="reg-fullname">Full Name</label>
                  <div className="field-wrapper">
                    <span className="field-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      id="reg-fullname"
                      type="text"
                      className={`field-input ${errors.fullName ? "input-error" : ""}`}
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={handleChange("fullName")}
                      autoFocus
                    />
                  </div>
                  {errors.fullName && <p className="field-error">{errors.fullName}</p>}
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="reg-email">Email Address</label>
                  <div className="field-wrapper">
                    <span className="field-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      className={`field-input ${errors.email ? "input-error" : ""}`}
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleChange("email")}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="field-error">{errors.email}</p>}
                </div>
                <div className="field-group">
  <label className="field-label">Organization Name</label>
  <div className="field-wrapper">
    <input
      type="text"
      className={`field-input ${errors.organisationName ? "input-error" : ""}`}
      placeholder="ABC Pvt Ltd"
      value={formData.organisationName}
      onChange={handleChange("organisationName")}
    />
  </div>
  {errors.organisationName && (
    <p className="field-error">{errors.organisationName}</p>
  )}
</div> 

           <div className="field-group">
  <label className="field-label">Organization Code (Optional)</label>
  <div className="field-wrapper">
    <input
      type="text"
      className="field-input"
      placeholder="ABC001"
      value={formData.organisationCode}
      onChange={handleChange("organisationCode")}
    />
  </div>
            </div>

                <button type="submit" className="auth-btn primary-btn" style={{ marginTop: "0.5rem" }}>
                  Continue
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="field-group">
                  <label className="field-label" htmlFor="reg-username">Username</label>
                  <div className="field-wrapper">
                    <span className="field-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5.5 9.5s.5 1 2.5 1 2.5-1 2.5-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      id="reg-username"
                      type="text"
                      className={`field-input ${errors.username ? "input-error" : ""}`}
                      placeholder="johndoe"
                      value={formData.username}
                      onChange={handleChange("username")}
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                  {errors.username && <p className="field-error">{errors.username}</p>}
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="reg-password">Password</label>
                  <div className="field-wrapper">
                    <span className="field-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      className={`field-input ${errors.password ? "input-error" : ""}`}
                      placeholder="Min. 8 characters"
                      value={formData.password}
                      onChange={handleChange("password")}
                      autoComplete="new-password"
                    />
                    <button type="button" className="toggle-password" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="password-strength">
                      <div className="strength-bars">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`strength-bar ${strength.score >= i ? "filled" : ""}`} style={strength.score >= i ? { backgroundColor: strength.color } : {}} />
                        ))}
                      </div>
                      <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  )}
                  {errors.password && <p className="field-error">{errors.password}</p>}
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="reg-confirm">Confirm Password</label>
                  <div className="field-wrapper">
                    <span className="field-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M5 8l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      id="reg-confirm"
                      type="password"
                      className={`field-input ${errors.confirmPassword ? "input-error" : ""}`}
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                      autoComplete="new-password"
                    />
                  </div>
                  {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
                </div>

                <div className="modal-actions">
                  <button type="button" className="auth-btn ghost-btn" onClick={() => setStep(1)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back
                  </button>
                  <button type="submit" className={`auth-btn primary-btn flex-1 ${isLoading ? "loading" : ""}`} disabled={isLoading}>
                    {isLoading ? <><span className="spinner" />Creating…</> : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
