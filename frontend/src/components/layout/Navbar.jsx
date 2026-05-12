import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Search,
  Menu,
  Building2,
  X,
  Wallet,
  ClipboardList,
  FileText,
  AlertTriangle,
} from "lucide-react";
import API from "../../services/api";
import { AuthContext } from "../../Moduels/Context/AuthContext";
import UserDropdown from "../user/UserDropdown";

export default function Navbar({ toggle }) {
  const nav = useNavigate();
  const { role, principalType, logout: authLogout } = useContext(AuthContext);

  const [openNotify, setOpenNotify] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const notifyRef = useRef();

  const logout = () => {
    authLogout();
    nav("/login");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await API.get("/users/me");
        setUser(data);
      } catch (err) {
        console.error("User load error:", err?.response?.data || err.message);
        setUser(null);
      }
    };
    fetchUser();
  }, [role, principalType]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setOpenNotify(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpenNotify(false);
    };
    document.addEventListener("mousedown", fn);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", fn);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await API.get("/organisation/me");
        setOrg(res.data);
      } catch (err) {
        console.error("Organisation load error:", err?.response?.data || err.message);
        setOrg(null);
      }
    };
    fetchOrg();
  }, [role, principalType]);

  const notifications = [
    { id: 1, type: "payroll", color: "var(--green-600)", bg: "var(--green-50)", title: "Payroll Processed", desc: "March 2025 payroll completed for 54 employees", time: "2m ago", unread: true },
    { id: 2, type: "leave", color: "var(--amber-600)", bg: "var(--amber-50)", title: "Leave Requests Pending", desc: "3 requests awaiting your approval", time: "45m ago", unread: true },
    { id: 3, type: "tax", color: "var(--blue-600)", bg: "var(--blue-50)", title: "TDS Filing Due", desc: "Q4 TDS statement due in 3 days", time: "2h ago", unread: false },
    { id: 4, type: "alert", color: "var(--red-600)", bg: "var(--red-50)", title: "Missing Bank Accounts", desc: "5 employees have no bank details on file", time: "5h ago", unread: false },
  ];
  const unreadCount = notifications.filter((n) => n.unread).length;
  const orgName = org?.name || user?.organisation?.name || "Your Organisation";

  return (
    <header className={`nb${scrolled ? " scrolled" : ""}`}>
      <motion.div className="nb-inner">
        <div className="nb-left">
          <button className="nb-hamburger" onClick={toggle} aria-label="Toggle menu" type="button">
            <Menu size={18} />
          </button>
          <motion.div className="nb-org" layout={false} whileHover={{ scale: 1.01 }}>
            <div className="nb-org-icon">
              <Building2 size={12} />
            </div>
            <span className="nb-org-name">{orgName}</span>
          </motion.div>
        </div>

        <div className="nb-search-wrap">
          <label className="nb-search" aria-label="Search payroll workspace">
            <Search size={14} style={{ color: "var(--slate-400)", flexShrink: 0 }} aria-hidden />
            <input
              placeholder="Search employees, payroll, reports…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate-400)", display: "flex", outline: "none" }}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : (
              <motion.div style={{ display: "flex", gap: 4, opacity: 0.7 }} aria-hidden initial={false}>
                <span className="nb-search-kbd">⌘</span>
                <span className="nb-search-kbd">K</span>
              </motion.div>
            )}
          </label>
        </div>

        <div className="nb-actions">
          <div ref={notifyRef} style={{ position: "relative" }}>
            <button
              className="nb-btn"
              type="button"
              onClick={() => setOpenNotify((v) => !v)}
              title="Notifications"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              aria-expanded={openNotify}
            >
              <Bell size={17} />
              {unreadCount > 0 ? <span className="nb-badge-count">{unreadCount}</span> : null}
            </button>

            <AnimatePresence>
              {openNotify ? (
                <motion.div
                  className="nb-dropdown nb-notif-panel"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="nb-notif-header">
                    <span className="nb-notif-title">Notifications</span>
                    {unreadCount > 0 ? <span className="nb-notif-badge">{unreadCount} new</span> : null}
                  </div>
                  {notifications.map((n) => (
                    <div key={n.id} className={`nb-notif-item${n.unread ? " unread" : ""}`}>
                      <motion.div className="nb-notif-icon-wrap" style={{ background: n.bg, color: n.color }} whileHover={{ scale: 1.04 }}>
                        <NotificationIcon type={n.type} />
                      </motion.div>
                      <div className="nb-notif-body">
                        <div className="nb-notif-item-title">{n.title}</div>
                        <div className="nb-notif-item-desc">{n.desc}</div>
                      </div>
                      <span className="nb-notif-time">{n.time}</span>
                    </div>
                  ))}
                  <div className="nb-notif-footer">
                    <button type="button" className="nb-notif-view-all">
                      View all notifications →
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="nb-divider" aria-hidden />

          <UserDropdown
            me={user}
            orgName={orgName}
            onLogout={() => {
              setOpenNotify(false);
              logout();
            }}
          />
        </div>
      </motion.div>
    </header>
  );
}

function NotificationIcon({ type }) {
  const map = {
    payroll: Wallet,
    leave: ClipboardList,
    tax: FileText,
    alert: AlertTriangle,
  };
  const Icon = map[type] || AlertTriangle;
  return <Icon size={16} aria-hidden />;
}
