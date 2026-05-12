import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Building2,
  CreditCard,
  Globe,
  LogOut,
  Moon,
  ScrollText,
  Settings,
  Shield,
  Sun,
  User,
} from "lucide-react";

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

function workspaceLabel(me) {
  return me?.organisation?.name || me?.user?.organisation?.name || "Active workspace";
}

export default function UserDropdown({ me, onLogout, orgName }) {
  const nav = useNavigate();
  const { role: authRole } = useContext(AuthContext);

  const role = (me?.role || me?.user?.role || authRole || "employee").toLowerCase();
  const name = useMemo(() => displayName(me), [me]);
  const email = useMemo(() => displayEmail(me), [me]);
  const workspace = orgName || workspaceLabel(me);

  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.getAttribute("data-theme") === "dark");
  const [language, setLanguage] = useState("en");
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 300 });

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const imageSrc = useMemo(() => loadProfileImage(me), [me]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("brixigo-theme");
      if (saved === "dark" || saved === "light") {
        document.documentElement.setAttribute("data-theme", saved);
        setDarkMode(saved === "dark");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(300, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const top = rect.bottom + 8;
    setMenuStyle({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onReflow = () => updatePosition();
    window.addEventListener("resize", onReflow, { passive: true });
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const target = e.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    try {
      localStorage.setItem("brixigo-theme", darkMode ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  const go = (path) => {
    setOpen(false);
    nav(path);
  };

  const menu = (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={menuRef}
          className="nb-dropdown user-menu-panel"
          role="menu"
          aria-label="Account menu"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            right: "auto",
          }}
        >
          <motion.div
            className="user-menu-header"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.02 }}
          >
            <UserAvatar name={name} src={imageSrc} size={44} roundedClassName="rounded-xl" />
            <div style={{ minWidth: 0 }}>
              <div className="user-menu-header-name">{name}</div>
              <div className="user-menu-header-email">{email || "—"}</div>
              <span className="user-menu-workspace">
                <Building2 size={11} aria-hidden />
                {workspace}
              </span>
            </div>
          </motion.div>

          <div className="user-menu-section">
            <MenuItem icon={<User size={15} />} label="My Profile" onClick={() => go("/profile")} />
            <MenuItem icon={<Settings size={15} />} label="Account Settings" onClick={() => go("/settings")} />
            <MenuItem icon={<Shield size={15} />} label="Security & Access" onClick={() => go("/security")} />
            <MenuItem icon={<CreditCard size={15} />} label="Billing & Subscription" onClick={() => go("/settings")} />
            <MenuItem icon={<Bell size={15} />} label="Notifications" onClick={() => go("/noticeboard")} />
            {role === "admin" ? (
              <MenuItem icon={<ScrollText size={15} />} label="Audit Logs" onClick={() => go("/audit")} />
            ) : null}
          </div>

          <div className="user-menu-divider" />

          <div className="user-menu-section">
            <div className="user-menu-row">
              <span>
                {darkMode ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
                <span style={{ marginLeft: 8 }}>Dark mode</span>
              </span>
              <button
                type="button"
                className={`user-menu-toggle${darkMode ? " on" : ""}`}
                aria-pressed={darkMode}
                aria-label="Toggle dark mode"
                onClick={() => setDarkMode((v) => !v)}
              />
            </div>
            <div className="user-menu-row">
              <span>
                <Globe size={14} aria-hidden />
                <span style={{ marginLeft: 8 }}>Language</span>
              </span>
              <select
                className="user-menu-select"
                value={language}
                aria-label="Language"
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>

          <div className="user-menu-divider" />

          <div className="user-menu-section">
            <MenuItem
              icon={<LogOut size={15} />}
              label="Logout"
              danger
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="nb-profile-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
      >
        <UserAvatar name={name} src={imageSrc} size={32} roundedClassName="rounded-md" />
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

      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      className={`user-menu-item${danger ? " danger" : ""}`}
      onClick={onClick}
      role="menuitem"
    >
      {icon}
      {label}
    </button>
  );
}
