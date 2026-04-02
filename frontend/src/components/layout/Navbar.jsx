import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Search, Menu,
  User, LogOut, ShieldCheck, Building2,
  ChevronDown, Settings, X
} from "lucide-react";

export default function Navbar({ toggle }) {
  const nav = useNavigate();

  const [openProfile, setOpenProfile] = useState(false);
  const [openNotify, setOpenNotify] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const profileRef = useRef();
  const notifyRef = useRef();

  const logout = () => {
    localStorage.removeItem("token");
    nav("/");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("http://127.0.0.1:9000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setUser(data);
        if (data.organisation_id) {
          try {
            const orgRes = await fetch(`http://127.0.0.1:9000/api/organisation/${data.organisation_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (orgRes.ok) setOrg(await orgRes.json());
          } catch {}
        }
      } catch (err) {
        console.error("User load error:", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpenProfile(false);
      if (notifyRef.current  && !notifyRef.current.contains(e.target))  setOpenNotify(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const notifications = [
    { id: 1, type: "payroll", color: "var(--green-600)", bg: "var(--green-50)",  title: "Payroll Processed",       desc: "March 2025 payroll completed for 54 employees",  time: "2m ago",  unread: true  },
    { id: 2, type: "leave",   color: "var(--amber-600)", bg: "var(--amber-50)",  title: "Leave Requests Pending",  desc: "3 requests awaiting your approval",              time: "45m ago", unread: true  },
    { id: 3, type: "tax",     color: "var(--blue-600)",  bg: "var(--blue-50)",   title: "TDS Filing Due",          desc: "Q4 TDS statement due in 3 days",                 time: "2h ago",  unread: false },
    { id: 4, type: "alert",   color: "var(--red-600)",   bg: "var(--red-50)",    title: "Missing Bank Accounts",   desc: "5 employees have no bank details on file",       time: "5h ago",  unread: false },
  ];
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <style>{`
        /* ══════════════════════════════════════
           NAVBAR
        ══════════════════════════════════════ */
        .nb {
          height: var(--nav-height, 58px);
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          border-bottom: 1px solid var(--border, #E2E8F0);
          transition: box-shadow var(--dur-base, 200ms) ease;
        }
        .nb.scrolled {
          box-shadow: 0 1px 12px rgba(15,23,42,0.08);
          background: rgba(255,255,255,0.97);
        }

        .nb-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 0 20px;
          gap: 12px;
        }

        /* ── Left ── */
        .nb-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .nb-hamburger {
          display: none;
          width: 34px; height: 34px;
          border-radius: var(--r-md, 8px);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--slate-500);
          align-items: center;
          justify-content: center;
          transition: all var(--dur-fast, 120ms) ease;
          outline: none;
        }
        .nb-hamburger:hover { background: var(--bg-hover); color: var(--slate-800); }

        .nb-org {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px 5px 6px;
          background: var(--bg-surface, #FFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: var(--r-full, 999px);
          cursor: default;
          transition: all var(--dur-fast, 120ms) ease;
        }
        .nb-org:hover { border-color: var(--blue-300, #93C5FD); background: var(--blue-50); }

        .nb-org-icon {
          width: 22px; height: 22px;
          background: linear-gradient(135deg, var(--blue-600), var(--blue-700));
          color: white;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .nb-org-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--slate-700, #334155);
          white-space: nowrap;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Breadcrumb pill */
        .nb-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: var(--bg-subtle, #F1F5F9);
          border-radius: var(--r-full, 999px);
          font-size: 12px;
          font-weight: 500;
          color: var(--slate-500);
        }
        .nb-breadcrumb strong { color: var(--slate-700); font-weight: 600; }

        /* ── Center Search ── */
        .nb-search-wrap {
          flex: 1;
          max-width: 340px;
          position: relative;
        }
        .nb-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-subtle, #F1F5F9);
          border: 1.5px solid transparent;
          border-radius: var(--r-lg, 12px);
          padding: 0 12px;
          height: 36px;
          width: 100%;
          transition: all var(--dur-base, 200ms) ease;
        }
        .nb-search:focus-within {
          background: #FFFFFF;
          border-color: var(--blue-400, #60A5FA);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .nb-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          font-family: var(--font-body, inherit);
          color: var(--slate-800);
          width: 100%;
        }
        .nb-search input::placeholder { color: var(--slate-400); }
        .nb-search-kbd {
          font-size: 10px;
          font-weight: 700;
          color: var(--slate-400);
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 1px 5px;
        }

        /* ── Right Actions ── */
        .nb-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .nb-divider {
          width: 1px;
          height: 20px;
          background: var(--border);
          margin: 0 6px;
        }

        .nb-btn {
          width: 34px; height: 34px;
          border-radius: var(--r-md, 8px);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--slate-500);
          display: flex; align-items: center; justify-content: center;
          transition: all var(--dur-fast, 120ms) ease;
          position: relative;
          outline: none;
        }
        .nb-btn:hover { background: var(--bg-hover); color: var(--slate-800); }

        .nb-badge-dot {
          position: absolute;
          top: 7px; right: 7px;
          width: 7px; height: 7px;
          background: var(--red-600, #DC2626);
          border-radius: 50%;
          border: 1.5px solid white;
        }
        .nb-badge-count {
          position: absolute;
          top: 4px; right: 4px;
          min-width: 16px; height: 16px;
          background: var(--red-600, #DC2626);
          color: #fff;
          border-radius: 99px;
          font-size: 9px;
          font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          padding: 0 3px;
          border: 1.5px solid white;
        }

        /* ── Dropdowns ── */
        .nb-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--r-xl, 16px);
          box-shadow: var(--shadow-xl, 0 20px 44px rgba(15,23,42,0.12));
          z-index: 500;
          animation: dropIn 180ms var(--ease-out, ease) both;
          overflow: hidden;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Notifications panel */
        .nb-notif-panel { width: 340px; }

        .nb-notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--border);
        }
        .nb-notif-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--slate-900);
        }
        .nb-notif-badge {
          background: var(--blue-50);
          color: var(--blue-700);
          border: 1px solid var(--blue-100);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .nb-notif-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          transition: background var(--dur-fast) ease;
          cursor: pointer;
        }
        .nb-notif-item:last-of-type { border-bottom: none; }
        .nb-notif-item:hover { background: var(--bg-hover); }
        .nb-notif-item.unread { background: var(--blue-50); }
        .nb-notif-item.unread:hover { background: var(--blue-100); }

        .nb-notif-icon-wrap {
          width: 32px; height: 32px;
          border-radius: var(--r-md, 8px);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
        }
        .nb-notif-body { flex: 1; min-width: 0; }
        .nb-notif-item-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--slate-800);
          margin-bottom: 2px;
        }
        .nb-notif-item-desc {
          font-size: 12px;
          color: var(--slate-500);
          line-height: 1.4;
        }
        .nb-notif-time {
          font-size: 11px;
          color: var(--slate-400);
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .nb-notif-footer {
          padding: 10px 16px;
          border-top: 1px solid var(--border);
          background: var(--bg-subtle);
        }
        .nb-notif-view-all {
          width: 100%;
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 600;
          color: var(--blue-600);
          cursor: pointer;
          font-family: var(--font-body);
          transition: color var(--dur-fast) ease;
        }
        .nb-notif-view-all:hover { color: var(--blue-700); }

        /* Profile panel */
        .nb-profile-panel { width: 230px; }

        .nb-profile-header {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          text-align: center;
          background: linear-gradient(135deg, var(--blue-50), var(--teal-50));
        }
        .nb-profile-header-avatar {
          width: 44px; height: 44px;
          border-radius: var(--r-xl, 16px);
          background: linear-gradient(135deg, var(--blue-600), var(--teal-500));
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 8px;
          box-shadow: 0 4px 12px rgba(37,99,235,0.25);
        }
        .nb-profile-header-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--slate-900);
          margin-bottom: 2px;
        }
        .nb-profile-header-role {
          font-size: 11px;
          color: var(--slate-500);
          font-weight: 500;
        }

        .nb-profile-trigger {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 5px 10px 5px 5px;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: var(--r-lg, 12px);
          transition: background var(--dur-fast) ease;
          outline: none;
        }
        .nb-profile-trigger:hover { background: var(--bg-hover); }

        .nb-avatar {
          width: 30px; height: 30px;
          border-radius: var(--r-md, 8px);
          background: linear-gradient(135deg, var(--blue-600), var(--teal-500));
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .nb-profile-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--slate-800);
          white-space: nowrap;
        }
        .nb-profile-role {
          font-size: 11px;
          color: var(--slate-400);
          font-weight: 500;
        }
        .nb-chevron {
          transition: transform var(--dur-fast) ease;
          color: var(--slate-400);
        }
        .nb-chevron.open { transform: rotate(180deg); }

        /* Dropdown items */
        .nb-drop-section { padding: 6px 8px; }
        .nb-drop-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          color: var(--slate-600);
          transition: all var(--dur-fast) ease;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          border-radius: var(--r-md, 8px);
          font-family: var(--font-body);
        }
        .nb-drop-item:hover { background: var(--bg-hover); color: var(--slate-900); }
        .nb-drop-item.danger { color: var(--red-600); }
        .nb-drop-item.danger:hover { background: var(--red-50); }
        .nb-drop-divider { height: 1px; background: var(--border); margin: 4px 0; }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .nb-hamburger { display: flex; }
          .nb-search-wrap { display: none; }
        }
        @media (max-width: 640px) {
          .nb-inner { padding: 0 12px; }
          .nb-profile-name, .nb-profile-role, .nb-chevron { display: none; }
          .nb-org-name { display: none; }
          .nb-breadcrumb { display: none; }
        }
      `}</style>

      <header className={`nb${scrolled ? " scrolled" : ""}`}>
        <div className="nb-inner">

          {/* LEFT */}
          <div className="nb-left">
            <button className="nb-hamburger" onClick={toggle} aria-label="Toggle menu">
              <Menu size={17} />
            </button>
            <div className="nb-org">
              <div className="nb-org-icon"><Building2 size={11} /></div>
              <span className="nb-org-name">
                {org?.name || org?.organisation_name || "Your Organisation"}
              </span>
            </div>
          </div>

          {/* CENTER */}
          <div className="nb-search-wrap">
            <div className="nb-search">
              <Search size={13} style={{ color: "var(--slate-400)", flexShrink: 0 }} />
              <input
                placeholder="Search employees, payroll, reports…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate-400)", display: "flex", outline: "none" }}>
                  <X size={12} />
                </button>
              ) : (
                <div style={{ display: "flex", gap: 3, opacity: 0.6 }}>
                  <span className="nb-search-kbd">⌘</span>
                  <span className="nb-search-kbd">K</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="nb-actions">

            {/* Notifications */}
            <div ref={notifyRef} style={{ position: "relative" }}>
              <button
                className="nb-btn"
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
                    {unreadCount > 0 && <span className="nb-notif-badge">{unreadCount} new</span>}
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} className={`nb-notif-item${n.unread ? " unread" : ""}`}>
                      <div className="nb-notif-icon-wrap" style={{ background: n.bg, color: n.color }}>
                        {n.type === "payroll" ? "💰" : n.type === "leave" ? "📋" : n.type === "tax" ? "📑" : "⚠️"}
                      </div>
                      <div className="nb-notif-body">
                        <div className="nb-notif-item-title">{n.title}</div>
                        <div className="nb-notif-item-desc">{n.desc}</div>
                      </div>
                      <span className="nb-notif-time">{n.time}</span>
                    </div>
                  ))}
                  <div className="nb-notif-footer">
                    <button className="nb-notif-view-all">View all notifications →</button>
                  </div>
                </div>
              )}
            </div>

            <div className="nb-divider" />

            {/* Profile */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                className="nb-profile-trigger"
                onClick={() => { setOpenProfile(!openProfile); setOpenNotify(false); }}
              >
                <div className="nb-avatar">{getInitials(user?.full_name || user?.username)}</div>
                <div>
                  <div className="nb-profile-name">{user?.full_name || user?.username || "Admin"}</div>
                  <div className="nb-profile-role">{user?.role || "HR Manager"}</div>
                </div>
                <ChevronDown size={12} className={`nb-chevron${openProfile ? " open" : ""}`} />
              </button>

              {openProfile && (
                <div className="nb-dropdown nb-profile-panel">
                  <div className="nb-profile-header">
                    <div className="nb-profile-header-avatar">
                      {getInitials(user?.full_name || user?.username)}
                    </div>
                    <div className="nb-profile-header-name">{user?.full_name || user?.username || "Admin"}</div>
                    <div className="nb-profile-header-role">{user?.email || "admin@company.com"}</div>
                  </div>
                  <div className="nb-drop-section">
                    <NbDropItem icon={<User size={13} />}        label="My Profile" />
                    <NbDropItem icon={<Settings size={13} />}    label="Settings" />
                    <NbDropItem icon={<ShieldCheck size={13} />} label="Security" />
                    <div className="nb-drop-divider" />
                    <NbDropItem icon={<LogOut size={13} />} label="Sign Out" onClick={logout} danger />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>
    </>
  );
}

function NbDropItem({ icon, label, onClick, danger }) {
  return (
    <button className={`nb-drop-item${danger ? " danger" : ""}`} onClick={onClick}>
      {icon}{label}
    </button>
  );
}
