import React, { useState } from "react";
import { Bell, Trash2, Plus, Megaphone, AlertCircle, Info, X, ChevronRight } from "lucide-react";

export default function NoticeBoard({ isAdmin = true }) {
  const [showForm, setShowForm] = useState(false);
  const [newNotice, setNewNotice] = useState({ text: "", priority: "Normal", category: "General" });
  const [notices, setNotices] = useState([
    { id: 1, text: "Payroll processing is scheduled for the 30th. All employee salary data, bank account details, and attendance records must be finalized before the deadline.", priority: "Important", category: "Payroll",    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),  author: "HR Admin" },
    { id: 2, text: "Submit your attendance records before Friday 5 PM. Late submissions will not be accepted for this payroll cycle and may affect salary processing.", priority: "Urgent",    category: "Attendance", createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),  author: "Operations" },
    { id: 3, text: "Office will remain closed on 26th January on account of Republic Day. Attendance will be marked as paid holiday for all employees.", priority: "Normal",    category: "General",    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), author: "Admin" },
  ]);
  const [filter, setFilter] = useState("All");

  const addNotice = () => {
    if (!newNotice.text.trim()) return;
    setNotices([{ id: Date.now(), ...newNotice, createdAt: new Date(), author: "You" }, ...notices]);
    setNewNotice({ text: "", priority: "Normal", category: "General" });
    setShowForm(false);
  };

  const deleteNotice = (id) => setNotices(notices.filter(n => n.id !== id));

  const priorities = {
    Urgent:    { badgeBg: "var(--red-50)",    badgeColor: "var(--red-600)",    badgeBorder: "var(--red-100)",    dot: "var(--red-600)",    icon: <AlertCircle size={12} />, filterCls: "ff-urgent"    },
    Important: { badgeBg: "var(--amber-50)",  badgeColor: "var(--amber-700)",  badgeBorder: "var(--amber-100)",  dot: "var(--amber-500)",  icon: <Megaphone size={12} />,   filterCls: "ff-important" },
    Normal:    { badgeBg: "var(--blue-50)",   badgeColor: "var(--blue-700)",   badgeBorder: "var(--blue-100)",   dot: "var(--blue-500)",   icon: <Info size={12} />,        filterCls: "ff-normal"    },
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
  };

  const filtered = filter === "All" ? notices : notices.filter(n => n.priority === filter);

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════
           NOTICE BOARD
        ═══════════════════════════════════ */
        .nb-page { width: 100%; }

        .nb-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border, #E2E8F0);
        }
        .nb-page-title {
          font-family: var(--font-display, 'DM Serif Display', serif);
          font-size: 24px;
          color: var(--slate-900, #0F172A);
          letter-spacing: -0.3px;
          line-height: 1.1;
          margin-bottom: 3px;
        }
        .nb-page-sub {
          font-size: 13px;
          color: var(--slate-500, #64748B);
          font-weight: 500;
        }
        .nb-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          background: linear-gradient(135deg, var(--blue-600, #2563EB), var(--blue-700, #1D4ED8));
          color: #fff;
          border: none;
          border-radius: var(--r-lg, 12px);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-body);
          box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          transition: all 0.2s ease;
        }
        .nb-add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37,99,235,0.38);
        }

        /* Main card */
        .nb-card {
          background: var(--bg-surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: var(--r-2xl, 20px);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        /* Card Header */
        .nb-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(135deg, var(--blue-50, #EFF6FF) 0%, var(--teal-50, #F0FDFA) 100%);
          flex-wrap: wrap;
          gap: 12px;
        }
        .nb-card-header-left { display: flex; align-items: center; gap: 12px; }
        .nb-bell-wrap {
          width: 40px; height: 40px;
          background: var(--blue-100, #DBEAFE);
          border-radius: var(--r-lg, 12px);
          display: flex; align-items: center; justify-content: center;
          position: relative;
          color: var(--blue-600, #2563EB);
        }
        .nb-bell-ping {
          position: absolute;
          top: 8px; right: 8px;
          width: 7px; height: 7px;
          background: var(--red-600, #DC2626);
          border-radius: 50%;
          border: 1.5px solid white;
        }
        .nb-bell-ring {
          position: absolute;
          top: 8px; right: 8px;
          width: 7px; height: 7px;
          background: var(--red-600, #DC2626);
          border-radius: 50%;
          animation: nb-pulse 2s ease-in-out infinite;
        }
        @keyframes nb-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
        .nb-card-title { font-size: 15px; font-weight: 700; color: var(--slate-900, #0F172A); }
        .nb-card-sub   { font-size: 12px; color: var(--slate-500); margin-top: 1px; }
        .nb-count-badge {
          background: var(--blue-600, #2563EB);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 9px;
          border-radius: 999px;
        }

        /* Filters */
        .nb-filters {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-subtle, #F8FAFC);
          flex-wrap: wrap;
        }
        .nb-filter-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--slate-400);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-right: 4px;
        }
        .ff-tab {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: var(--r-full, 999px);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1.5px solid var(--border, #E2E8F0);
          background: var(--bg-surface, #FFF);
          color: var(--slate-500);
          font-family: var(--font-body);
        }
        .ff-tab:hover { border-color: var(--blue-300, #93C5FD); color: var(--slate-800); }
        .ff-tab.ff-active {
          background: var(--blue-600, #2563EB);
          color: #fff;
          border-color: var(--blue-600);
        }
        .ff-urgent.ff-active   { background: var(--red-600, #DC2626); border-color: var(--red-600); }
        .ff-important.ff-active { background: var(--amber-600, #D97706); border-color: var(--amber-600); }
        .ff-normal.ff-active   { background: var(--blue-500, #3B82F6); border-color: var(--blue-500); }
        .ff-count {
          min-width: 16px; height: 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.25);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          padding: 0 4px;
        }

        /* Form */
        .nb-form {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(135deg, var(--blue-50, #EFF6FF), white);
          animation: slideDown 200ms ease both;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nb-form-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--slate-800);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .nb-form-row1 { display: grid; grid-template-columns: 1fr 140px 140px; gap: 10px; margin-bottom: 10px; }
        .nb-input, .nb-select {
          padding: 9px 12px;
          border: 1.5px solid var(--border, #E2E8F0);
          border-radius: var(--r-lg, 12px);
          font-size: 13px;
          font-family: var(--font-body);
          color: var(--slate-800);
          background: white;
          outline: none;
          transition: all 0.18s ease;
          width: 100%;
        }
        .nb-input:focus, .nb-select:focus {
          border-color: var(--blue-400, #60A5FA);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .nb-form-actions { display: flex; gap: 8px; }
        .nb-submit-btn {
          padding: 9px 20px;
          background: linear-gradient(135deg, var(--green-600), var(--green-700));
          color: white;
          border: none;
          border-radius: var(--r-lg, 12px);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-body);
          transition: all 0.18s ease;
          box-shadow: 0 3px 10px rgba(22,163,74,0.25);
        }
        .nb-submit-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(22,163,74,0.35); }
        .nb-cancel-btn {
          padding: 9px 16px;
          background: var(--bg-hover, #F1F5F9);
          color: var(--slate-600);
          border: 1px solid var(--border);
          border-radius: var(--r-lg, 12px);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-body);
          transition: all 0.15s ease;
        }
        .nb-cancel-btn:hover { background: var(--slate-200); }

        /* Notice list */
        .nb-list { }

        .nb-empty {
          padding: 48px 24px;
          text-align: center;
          color: var(--slate-400);
          font-size: 14px;
        }
        .nb-empty-icon { font-size: 32px; margin-bottom: 10px; }
        .nb-empty-text { font-weight: 600; color: var(--slate-500); margin-bottom: 4px; }
        .nb-empty-sub  { font-size: 12px; }

        /* Notice item */
        .nb-item {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border, #E2E8F0);
          transition: background 0.15s ease;
          animation: fadeItem 300ms ease both;
          align-items: flex-start;
        }
        @keyframes fadeItem {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .nb-item:last-child { border-bottom: none; }
        .nb-item:hover { background: var(--bg-hover, #F1F5F9); }

        .nb-item-bar {
          width: 3px;
          align-self: stretch;
          border-radius: 99px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .nb-item-content { flex: 1; min-width: 0; }
        .nb-item-meta {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 7px;
          flex-wrap: wrap;
        }
        .nb-priority-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid;
        }
        .nb-category-tag {
          font-size: 11px;
          font-weight: 600;
          color: var(--slate-500);
          background: var(--bg-subtle, #F1F5F9);
          border: 1px solid var(--border);
          padding: 2px 8px;
          border-radius: 999px;
        }
        .nb-item-text {
          font-size: 13.5px;
          color: var(--slate-700, #334155);
          line-height: 1.6;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .nb-item-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--slate-400);
        }
        .nb-author { font-weight: 600; color: var(--slate-500); }
        .nb-sep { width: 3px; height: 3px; background: var(--slate-300); border-radius: 50%; }

        .nb-delete-btn {
          background: none;
          border: none;
          padding: 6px;
          border-radius: var(--r-md, 8px);
          cursor: pointer;
          color: var(--slate-400);
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .nb-delete-btn:hover { background: var(--red-50, #FEF2F2); color: var(--red-600, #DC2626); }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .nb-form-row1 { grid-template-columns: 1fr; }
          .nb-card-header { padding: 14px 16px; }
          .nb-item { padding: 14px 16px; }
          .nb-filters { padding: 10px 16px; }
          .nb-form { padding: 14px 16px; }
        }
      `}</style>

      <div className="nb-page">
        {/* Page Header */}
        <div className="nb-page-header">
          <div>
            <h1 className="nb-page-title">Notice Board</h1>
            <p className="nb-page-sub">Company-wide announcements, alerts, and updates</p>
          </div>
          {isAdmin && (
            <button className="nb-add-btn" onClick={() => setShowForm(!showForm)}>
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Cancel" : "New Notice"}
            </button>
          )}
        </div>

        <div className="nb-card">
          {/* Card Header */}
          <div className="nb-card-header">
            <div className="nb-card-header-left">
              <div className="nb-bell-wrap">
                <Bell size={18} />
                <span className="nb-bell-ping" />
                <span className="nb-bell-ring" />
              </div>
              <div>
                <div className="nb-card-title">Notices & Announcements</div>
                <div className="nb-card-sub">{notices.length} active announcement{notices.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <span className="nb-count-badge">{notices.filter(n => n.priority === "Urgent").length} Urgent</span>
          </div>

          {/* Filters */}
          <div className="nb-filters">
            <span className="nb-filter-label">Filter:</span>
            {["All", "Urgent", "Important", "Normal"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`ff-tab ${f === "All" ? "" : `ff-${f.toLowerCase()}`} ${filter === f ? "ff-active" : ""}`}
              >
                {f}
                <span className="ff-count">
                  {f === "All" ? notices.length : notices.filter(n => n.priority === f).length}
                </span>
              </button>
            ))}
          </div>

          {/* New Notice Form */}
          {showForm && (
            <div className="nb-form">
              <div className="nb-form-title"><Plus size={14} /> Create New Notice</div>
              <div className="nb-form-row1">
                <input
                  className="nb-input"
                  placeholder="Write announcement text here…"
                  value={newNotice.text}
                  onChange={e => setNewNotice({ ...newNotice, text: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addNotice()}
                  autoFocus
                />
                <select
                  className="nb-select"
                  value={newNotice.priority}
                  onChange={e => setNewNotice({ ...newNotice, priority: e.target.value })}
                >
                  <option>Normal</option>
                  <option>Important</option>
                  <option>Urgent</option>
                </select>
                <select
                  className="nb-select"
                  value={newNotice.category}
                  onChange={e => setNewNotice({ ...newNotice, category: e.target.value })}
                >
                  <option>General</option>
                  <option>Payroll</option>
                  <option>Attendance</option>
                  <option>Compliance</option>
                  <option>HR</option>
                </select>
              </div>
              <div className="nb-form-actions">
                <button className="nb-submit-btn" onClick={addNotice}>Post Notice</button>
                <button className="nb-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Notice List */}
          <div className="nb-list">
            {filtered.length === 0 ? (
              <div className="nb-empty">
                <div className="nb-empty-icon">📭</div>
                <div className="nb-empty-text">No notices found</div>
                <div className="nb-empty-sub">There are no {filter !== "All" ? filter.toLowerCase() : ""} notices at this time</div>
              </div>
            ) : (
              filtered.map((notice, i) => {
                const p = priorities[notice.priority];
                return (
                  <div key={notice.id} className="nb-item" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="nb-item-bar" style={{ background: p.dot }} />
                    <div className="nb-item-content">
                      <div className="nb-item-meta">
                        <span
                          className="nb-priority-badge"
                          style={{ background: p.badgeBg, color: p.badgeColor, borderColor: p.badgeBorder }}
                        >
                          {p.icon} {notice.priority}
                        </span>
                        <span className="nb-category-tag">{notice.category}</span>
                      </div>
                      <p className="nb-item-text">{notice.text}</p>
                      <div className="nb-item-footer">
                        <span className="nb-author">{notice.author}</span>
                        <span className="nb-sep" />
                        <span>{timeAgo(notice.createdAt)}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        className="nb-delete-btn"
                        onClick={() => deleteNotice(notice.id)}
                        title="Delete notice"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
