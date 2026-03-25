import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Mail, MessageSquare, Search, Menu,
  User, LogOut, ShieldCheck, Building2,
  ChevronDown, Settings, Sparkles, X, Command
} from "lucide-react";

export default function Navbar({ toggle }) {
  const nav = useNavigate();

  const [openProfile, setOpenProfile] = useState(false);
  const [openNotify, setOpenNotify] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const profileRef = useRef();
  const notifyRef = useRef();
  const searchRef = useRef();

  const logout = () => {
    localStorage.removeItem("token");
    nav("/");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("http://127.0.0.1:9000/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setUser(data);
        if (data.organisation_id) {
          try {
            const orgRes = await fetch(`http://127.0.0.1:9000/api/organisation/${data.organisation_id}`,  {
              headers: { Authorization: `Bearer ${token}` },
            });
           if (orgRes.ok) {
             const orgData = await orgRes.json();
             console.log("ORG DATA:", orgData);
             setOrg(orgData);
}
          } catch {}
        }
      } catch (error) {
        console.error("User load error:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (window.scrollY > 8) setScrolled(true); else setScrolled(false);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpenProfile(false);
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setOpenNotify(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const notifications = [
    { id: 1, type: "payroll", icon: "💰", title: "Payroll processed", desc: "Feb 2025 payroll completed for 54 employees", time: "2m ago", unread: true },
    { id: 2, type: "leave",   icon: "📋", title: "Leave requests pending", desc: "2 leave requests awaiting approval", time: "1h ago", unread: true },
    { id: 3, type: "tax",     icon: "⚡", title: "Tax update", desc: "Q4 TDS statement ready for review", time: "3h ago", unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <style>{`
        /* ══ NAVBAR ROOT ══════════════════════════════════════════ */
        .nb {
          position: relative;
          height: var(--nav-height, 60px);
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border-bottom: 1px solid var(--border, #E5E7EB);
          transition: box-shadow var(--dur-base,200ms) ease;
        }
        .nb.scrolled {
          box-shadow: 0 1px 12px rgba(17,24,39,0.07);
          background: rgba(255,255,255,0.94);
        }

        .nb-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 0 24px;
          gap: 12px;
        }

        /* ══ LEFT ════════════════════════════════════════════════ */
        .nb-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .nb-hamburger {
          display: none;
          width: 36px; height: 36px;
          border-radius: var(--r-sm, 8px);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-secondary, #ffffff);
          align-items: center;
          justify-content: center;
          transition: background var(--dur-fast,120ms) ease;
          outline: none;
        }
        .nb-hamburger:hover { background: var(--bg-hover, #ffffff); color: var(--text-primary,#111827); }

        /* Org pill */
        .nb-org {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px 5px 6px;
          background: var(--brand-light, #fdfdfd);
          border: 1px solid var(--brand-border, rgba(245, 11, 11, 0.22));
          border-radius: var(--r-full, 999px);
          cursor: default;
          transition: all var(--dur-fast,120ms) ease;
        }
        .nb-org:hover {
          background: #ffffff;
          border-color: rgba(245, 11, 11, 0.35);
        }
        .nb-org-icon {
          width: 22px; height: 22px;
          background: linear-gradient(135deg, #f34343, #f52929);
          color: white;
          border-radius: var(--r-xs, 6px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .nb-org-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #000000;
          letter-spacing: -0.01em;
          white-space: nowrap;
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ══ CENTER SEARCH ═══════════════════════════════════════ */
        .nb-search-wrap {
          flex: 1;
          max-width: 360px;
          position: relative;
        }
        .nb-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-base, #F7F8FC);
          border: 1.5px solid transparent;
          border-radius: var(--r-lg, 14px);
          padding: 0 12px;
          height: 36px;
          width: 100%;
          transition: all var(--dur-base,200ms) ease;
          cursor: text;
        }
        .nb-search:focus-within {
          background: #FFFFFF;
          border-color: var(--brand-border, rgba(245,158,11,0.45));
          box-shadow: 0 0 0 3px rgba(245,158,11,0.10);
        }
        .nb-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          font-family: var(--font-body, inherit);
          color: var(--text-primary, #111827);
          width: 100%;
          letter-spacing: -0.01em;
        }
        .nb-search input::placeholder { color: var(--text-muted, #9CA3AF); }

        .nb-search-hint {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-shrink: 0;
          opacity: 0.5;
        }
        .nb-search-kbd {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          background: var(--bg-surface, #FFF);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 1px 5px;
          line-height: 1.6;
        }

        /* ══ RIGHT ACTIONS ═══════════════════════════════════════ */
        .nb-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .nb-btn {
          position: relative;
          width: 36px; height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--r-md, 10px);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-muted, #9CA3AF);
          transition: all var(--dur-fast,120ms) ease;
          outline: none;
        }
        .nb-btn:hover {
          background: var(--bg-hover, #F1F3F9);
          color: var(--text-secondary, #4B5563);
          transform: translateY(-1px);
        }

        .nb-btn-bell {
          background: rgba(217,119,6,0.08);
          color: #D97706;
        }
        .nb-btn-bell:hover {
          background: rgba(217,119,6,0.14);
          color: #B45309;
          transform: translateY(-1px) rotate(-10deg);
        }

        /* Badge */
        .nb-badge {
          position: absolute;
          top: 6px; right: 6px;
          width: 8px; height: 8px;
          background: #EF4444;
          border-radius: 50%;
          border: 2px solid white;
        }
        .nb-badge-count {
          position: absolute;
          top: 4px; right: 3px;
          min-width: 16px; height: 16px;
          background: #EF4444;
          color: white;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          padding: 0 2px;
        }

        /* Divider between icon groups */
        .nb-divider {
          width: 1px;
          height: 20px;
          background: var(--border, #E5E7EB);
          margin: 0 4px;
          flex-shrink: 0;
        }

        /* ══ PROFILE TRIGGER ══════════════════════════════════════ */
        .nb-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px 4px 4px;
          border-radius: var(--r-lg, 14px);
          cursor: pointer;
          transition: background var(--dur-fast,120ms) ease;
          border: 1px solid transparent;
          background: transparent;
          outline: none;
        }
        .nb-profile:hover {
          background: var(--bg-hover, #F1F3F9);
          border-color: var(--border, #E5E7EB);
        }

        .nb-avatar {
          width: 30px; height: 30px;
          background: linear-gradient(135deg, var(--brand,#4F46E5), #6D28D9);
          border-radius: var(--r-sm, 8px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }

        .nb-profile-info { line-height: 1.3; }
        .nb-profile-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary, #111827);
          white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .nb-profile-role {
          font-size: 11px;
          color: var(--text-muted, #9CA3AF);
          white-space: nowrap;
          font-weight: 500;
        }

        .nb-chevron {
          color: var(--text-muted);
          transition: transform 200ms ease;
          flex-shrink: 0;
        }
        .nb-chevron.open { transform: rotate(180deg); }

        /* ══ DROPDOWN PANEL ═══════════════════════════════════════ */
        .nb-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: white;
          border: 1px solid var(--border, #E5E7EB);
          border-radius: var(--r-xl, 18px);
          box-shadow: var(--shadow-xl, 0 20px 44px rgba(17,24,39,0.12));
          z-index: 10000;
          overflow: hidden;
          animation: dropIn 180ms var(--ease-out,ease) both;
          min-width: 220px;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Notification panel */
        .nb-notif-panel {
          width: 300px;
        }
        .nb-notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--border-light, #F3F4F6);
        }
        .nb-notif-title {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary, #111827);
          letter-spacing: -0.02em;
        }
        .nb-notif-pill {
          font-size: 10.5px;
          font-weight: 700;
          color: white;
          background: #EF4444;
          padding: 2px 7px;
          border-radius: 999px;
          letter-spacing: 0;
        }

        .nb-notif-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 16px;
          transition: background var(--dur-fast,120ms) ease;
          cursor: pointer;
          position: relative;
        }
        .nb-notif-item:hover { background: var(--bg-base, #F7F8FC); }
        .nb-notif-item.unread::after {
          content: '';
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px; height: 6px;
          background: linear-gradient(135deg, #F59E0B, #F97316);
          border-radius: 50%;
        }
        .nb-notif-emoji {
          width: 32px; height: 32px;
          background: var(--bg-base, #F7F8FC);
          border-radius: var(--r-sm, 8px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
        }
        .nb-notif-body { flex: 1; min-width: 0; }
        .nb-notif-item-title {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary, #111827);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nb-notif-item-desc {
          font-size: 11.5px;
          color: var(--text-muted, #9CA3AF);
          margin-top: 1px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .nb-notif-time {
          font-size: 10.5px;
          color: var(--text-disabled, #D1D5DB);
          white-space: nowrap;
          font-weight: 500;
          flex-shrink: 0;
        }
        .nb-notif-footer {
          padding: 10px 16px;
          border-top: 1px solid var(--border-light, #F3F4F6);
          text-align: center;
        }
        .nb-notif-view-all {
          font-size: 12px;
          font-weight: 600;
          color: #92400E;
          background: none;
          border: none;
          cursor: pointer;
          letter-spacing: -0.01em;
          transition: opacity 150ms ease;
        }
        .nb-notif-view-all:hover { opacity: 0.7; }

        /* Profile dropdown */
        .nb-profile-panel {
          width: 228px;
        }
        .nb-profile-header {
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--border-light, #F3F4F6);
        }
        .nb-profile-header-avatar {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, var(--brand,#4F46E5), #6D28D9);
          border-radius: var(--r-md, 10px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .nb-profile-header-name {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary, #111827);
          letter-spacing: -0.02em;
        }
        .nb-profile-header-email {
          font-size: 11.5px;
          color: var(--text-muted, #9CA3AF);
          margin-top: 2px;
          font-weight: 500;
        }

        .nb-drop-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          color: var(--text-secondary, #4B5563);
          transition: background var(--dur-fast,120ms) ease, color var(--dur-fast,120ms) ease;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          letter-spacing: -0.01em;
        }
        .nb-drop-item:hover { background: var(--bg-hover, #F1F3F9); color: var(--text-primary, #111827); }
        .nb-drop-item.danger { color: #DC2626; }
        .nb-drop-item.danger:hover { background: #FEF2F2; }

        .nb-drop-divider {
          height: 1px;
          background: var(--border-light, #F3F4F6);
          margin: 4px 0;
        }

        /* ══ MOBILE SEARCH BAR ════════════════════════════════════ */
        .nb-mobile-search {
          padding: 0 16px 12px;
          animation: dropIn 200ms ease both;
        }
        .nb-mobile-search-inner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-base, #F7F8FC);
          border: 1.5px solid transparent;
          border-radius: var(--r-md, 10px);
          padding: 9px 12px;
        }
        .nb-mobile-search-inner:focus-within {
          background: white;
          border-color: var(--brand-border, rgba(245,158,11,0.35));
        }
        .nb-mobile-search-inner input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13.5px;
          font-family: var(--font-body, inherit);
          color: var(--text-primary, #111827);
          width: 100%;
        }

        /* ══ RESPONSIVE ═══════════════════════════════════════════ */
        @media (max-width: 1024px) {
          .nb-hamburger { display: flex; }
          .nb-search-wrap { display: none; }
        }
        @media (max-width: 640px) {
          .nb-inner { padding: 0 14px; }
          .nb-profile-info, .nb-chevron { display: none; }
          .nb-org-name { display: none; }
        }
      `}</style>

      <header className={`nb${scrolled ? " scrolled" : ""}`}>
        <div className="nb-inner">

          {/* LEFT */}
          <div className="nb-left">
            <button className="nb-hamburger" onClick={toggle} aria-label="Toggle menu">
              <Menu size={18} />
            </button>
            <div className="nb-org">
              <div className="nb-org-icon">
                <Building2 size={12} />
              </div>
              <span className="nb-org-name">
                {org?.name || org?.organisation_name || "Your Organisation"}
              </span>
            </div>
          </div>

          {/* CENTER */}
          <div className="nb-search-wrap" ref={searchRef}>
            <div className="nb-search">
              <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                placeholder="Search employees, payroll…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", outline: "none" }}
                >
                  <X size={13} />
                </button>
              ) : (
                <div className="nb-search-hint">
                  <span className="nb-search-kbd">⌘</span>
                  <span className="nb-search-kbd">K</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="nb-actions">

            <button className="nb-btn" title="Messages">
              <MessageSquare size={16} />
            </button>
            <button className="nb-btn" title="Mail">
              <Mail size={16} />
            </button>

            <div className="nb-divider" />

            {/* Notifications */}
            <div ref={notifyRef} style={{ position: "relative" }}>
              <button
                className="nb-btn nb-btn-bell"
                onClick={() => { setOpenNotify(!openNotify); setOpenProfile(false); }}
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && <span className="nb-badge-count">{unreadCount}</span>}
              </button>

              {openNotify && (
                <div className="nb-dropdown nb-notif-panel">
                  <div className="nb-notif-header">
                    <span className="nb-notif-title">Notifications</span>
                    {unreadCount > 0 && <span className="nb-notif-pill">{unreadCount} new</span>}
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} className={`nb-notif-item${n.unread ? " unread" : ""}`}>
                      <div className="nb-notif-emoji">{n.icon}</div>
                      <div className="nb-notif-body">
                        <div className="nb-notif-item-title">{n.title}</div>
                        <div className="nb-notif-item-desc">{n.desc}</div>
                      </div>
                      <span className="nb-notif-time">{n.time}</span>
                    </div>
                  ))}
                  <div className="nb-notif-footer">
                    <button className="nb-notif-view-all">View all notifications</button>
                  </div>
                </div>
              )}
            </div>

            <div className="nb-divider" />

            {/* Profile */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                className="nb-profile"
                onClick={() => { setOpenProfile(!openProfile); setOpenNotify(false); }}
              >
                <div className="nb-avatar">{getInitials(user?.full_name || user?.username)}</div>
                <div className="nb-profile-info">
                  <div className="nb-profile-name">{user?.full_name || user?.username || "Raju Admin"}</div>
                  <div className="nb-profile-role">{user?.role || ""} </div>
                </div>
                <ChevronDown size={13} className={`nb-chevron${openProfile ? " open" : ""}`} />
              </button>

              {openProfile && (
                <div className="nb-dropdown nb-profile-panel">
                  <div className="nb-profile-header">
                    <div className="nb-profile-header-avatar">
                      {getInitials(user?.full_name || user?.username)}
                    </div>
                    <div className="nb-profile-header-name">{user?.full_name || user?.username || "Raju Admin"}</div>
                    <div className="nb-profile-header-email">{user?.email || "admin@company.com"}</div>
                  </div>
                  <div style={{ padding: "6px 0" }}>
                    <NbDropItem icon={<User size={14} />}       label="My Profile" />
                    <NbDropItem icon={<Settings size={14} />}   label="Settings" />
                    <NbDropItem icon={<ShieldCheck size={14} />} label="Security" />
                    <NbDropItem icon={<Sparkles size={14} />}   label="Upgrade Plan" />
                    <div className="nb-drop-divider" />
                    <NbDropItem icon={<LogOut size={14} />} label="Sign Out" onClick={logout} danger />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Search */}
        {showSearch && (
          <div className="nb-mobile-search">
            <div className="nb-mobile-search-inner">
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input placeholder="Search employees, payroll…" autoFocus />
            </div>
          </div>
        )}
      </header>
    </>
  );
}

function NbDropItem({ icon, label, onClick, danger }) {
  return (
    <button className={`nb-drop-item${danger ? " danger" : ""}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
