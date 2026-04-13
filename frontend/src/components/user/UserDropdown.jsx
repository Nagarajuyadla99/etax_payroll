import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Shield, User } from "lucide-react";

import { AuthContext } from "../../Moduels/Context/AuthContext";
import UserAvatar from "./UserAvatar";
import { loadProfileImage } from "./profileImageStore";

function displayName(me) {
  if (!me) return "User";
  if (me.user) return me.user.full_name || me.user.username || "User";
  if (me.employee) {
    const parts = [me.employee.first_name, me.employee.last_name].filter(Boolean);
    if (parts.length) return parts.join(" ");
    return me.employee.email || "Employee";
  }
  if (me.legacy && me.employee) return me.employee.name || me.employee.email || "Employee";
  return me.full_name || me.username || "User";
}

function displayEmail(me) {
  if (!me) return "";
  if (me.user) return me.user.email || "";
  if (me.employee) return me.employee.email || "";
  return me.email || "";
}

export default function UserDropdown({ me, onLogout }) {
  const nav = useNavigate();
  const { role: authRole } = useContext(AuthContext);

  const role = (me?.role || me?.user?.role || authRole || "employee").toLowerCase();
  const name = useMemo(() => displayName(me), [me]);
  const email = useMemo(() => displayEmail(me), [me]);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const imageSrc = useMemo(() => loadProfileImage(me), [me]);

  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="nb-profile-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserAvatar name={name} src={imageSrc} size={30} roundedClassName="rounded-md" />
        <div>
          <div className="nb-profile-name">{name}</div>
          <div className="nb-profile-role">{role}</div>
        </div>
        <span className={`nb-chevron${open ? " open" : ""}`} aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          className="nb-dropdown nb-profile-panel"
          role="menu"
          style={{
            width: 280,
            maxWidth: "calc(100vw - 16px)",
            right: 0,
          }}
        >
          <div
            className="nb-profile-header"
            style={{
              textAlign: "left",
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "14px 14px",
              background: "linear-gradient(135deg, var(--blue-50), var(--teal-50))",
            }}
          >
            <UserAvatar name={name} src={imageSrc} size={44} roundedClassName="rounded-xl" />
            <div style={{ minWidth: 0 }}>
              <div className="nb-profile-header-name" style={{ marginBottom: 0 }}>
                {name}
              </div>
              <div className="nb-profile-header-role" style={{ fontSize: 12 }}>
                {email || "—"}
              </div>
            </div>
          </div>

          <div className="nb-drop-section">
            <MenuItem
              icon={<User size={14} />}
              label="My Profile"
              onClick={() => {
                setOpen(false);
                nav("/profile");
              }}
            />
            <MenuItem
              icon={<Settings size={14} />}
              label="Settings"
              onClick={() => {
                setOpen(false);
                nav("/settings");
              }}
            />
            <MenuItem
              icon={<Shield size={14} />}
              label="Security"
              onClick={() => {
                setOpen(false);
                nav("/security");
              }}
            />
            <div className="nb-drop-divider" />
            <MenuItem
              icon={<LogOut size={14} />}
              label="Sign Out"
              danger
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      className={`nb-drop-item${danger ? " danger" : ""}`}
      onClick={onClick}
      role="menuitem"
    >
      {icon}
      {label}
    </button>
  );
}

