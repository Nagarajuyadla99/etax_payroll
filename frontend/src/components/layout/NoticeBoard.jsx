import React, { useState } from "react";
import { Bell, Trash2, Plus, Megaphone, AlertCircle, Info, X } from "lucide-react";

export default function NoticeBoard({ isAdmin = true }) {
  const [showForm, setShowForm] = useState(false);
  const [newNotice, setNewNotice] = useState({ text: "", priority: "Normal", category: "General" });
  const [notices, setNotices] = useState([
    { id: 1, text: "Payroll processing scheduled for 30th. All employee data must be finalized before the deadline.", priority: "Important", category: "Payroll", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), author: "HR Admin" },
    { id: 2, text: "Submit attendance records before Friday 5 PM. Late submissions will not be accepted this cycle.", priority: "Urgent", category: "Attendance", createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), author: "Operations" },
    { id: 3, text: "Office will remain closed on 26th January on account of Republic Day.", priority: "Normal", category: "General", createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), author: "Admin" },
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
    Urgent: { bg: "#fff0f0", border: "#fca5a5", badge: "#fee2e2", text: "#b91c1c", dot: "#ef4444", icon: <AlertCircle size={13} /> },
    Important: { bg: "#fffbeb", border: "#fcd34d", badge: "#fef3c7", text: "#b45309", dot: "#f59e0b", icon: <Megaphone size={13} /> },
    Normal: { bg: "#f0f9ff", border: "#7dd3fc", badge: "#e0f2fe", text: "#0369a1", dot: "#38bdf8", icon: <Info size={13} /> },
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
  };

  const filtered = filter === "All" ? notices : notices.filter(n => n.priority === filter);

  return (
    <>
      <style>{`
        .nb-page { padding: 0; }
        .nb-page-header {
          margin-bottom: 24px;
        }
        .nb-page-title {
          font-family: var(--font-display, 'Syne');
          font-size: 26px;
          font-weight: 800;
          color: var(--text-primary, #0f172a);
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .nb-page-sub {
          font-size: 14px;
          color: var(--text-muted, #94a3b8);
          margin-top: 4px;
          font-weight: 500;
        }

        .nb-card {
          background: white;
          border-radius: var(--radius-xl, 24px);
          border: 1px solid var(--border, rgba(226,232,240,0.8));
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(15,23,42,0.06));
          overflow: hidden;
        }

        /* HEADER */
        .nb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 12px;
        }
        .nb-header-left { display: flex; align-items: center; gap: 14px; }
        .nb-bell-wrap {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--accent-primary-light, #eef2ff), rgba(79,70,229,0.06));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
        }
        .nb-bell-ping {
          position: absolute;
          top: 6px; right: 6px;
          width: 8px; height: 8px;
          background: #ef4444;
          border-radius: 99px;
          animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .nb-bell-dot {
          position: absolute;
          top: 6px; right: 6px;
          width: 8px; height: 8px;
          background: #ef4444;
          border-radius: 99px;
        }
        .nb-title { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.03em; }
        .nb-sub { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
        .nb-add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          background: var(--accent-primary, #4f46e5);
          color: white;
          border: none;
          border-radius: var(--radius-md, 12px);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 180ms ease;
          font-family: var(--font-body);
          box-shadow: 0 4px 12px rgba(79,70,229,0.3);
        }
        .nb-add-btn:hover {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(79,70,229,0.35);
        }

        /* FILTER TABS */
        .nb-filters {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .filter-tab {
          padding: 5px 14px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms ease;
          border: 1.5px solid transparent;
        }
        .filter-tab.all { background: var(--bg-base); color: var(--text-secondary); border-color: var(--border); }
        .filter-tab.all.active, .filter-tab.all:hover { background: var(--accent-primary); color: white; border-color: var(--accent-primary); }
        .filter-urgent { background: #fee2e2; color: #b91c1c; }
        .filter-urgent.active, .filter-urgent:hover { background: #ef4444; color: white; }
        .filter-important { background: #fef3c7; color: #b45309; }
        .filter-important.active, .filter-important:hover { background: #f59e0b; color: white; }
        .filter-normal { background: #e0f2fe; color: #0369a1; }
        .filter-normal.active, .filter-normal:hover { background: #38bdf8; color: white; }

        /* FORM */
        .nb-form {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-base, #f0f2f8);
          animation: slideDown 200ms ease both;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .nb-form-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        .nb-form-grid { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; }
        .nb-input, .nb-select {
          padding: 10px 14px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 13px;
          font-family: var(--font-body);
          color: var(--text-primary);
          background: white;
          outline: none;
          transition: border 180ms ease, box-shadow 180ms ease;
        }
        .nb-input:focus, .nb-select:focus {
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-glow);
        }
        .nb-submit-btn {
          padding: 10px 18px;
          background: #059669;
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-body);
          transition: all 150ms ease;
          white-space: nowrap;
        }
        .nb-submit-btn:hover { background: #047857; }
        .nb-form-row2 { display: flex; align-items: center; gap: 10px; margin-top: 10px; }

        /* NOTICE LIST */
        .nb-list { max-height: 520px; overflow-y: auto; }
        .nb-empty {
          padding: 48px 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        .nb-empty-icon { font-size: 36px; margin-bottom: 8px; }

        /* NOTICE ITEM */
        .nb-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(226,232,240,0.5);
          transition: background 150ms ease;
          position: relative;
          animation: fadeItem 300ms ease both;
        }
        @keyframes fadeItem {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .nb-item:last-child { border-bottom: none; }
        .nb-item:hover { background: var(--bg-base); }

        .nb-priority-indicator {
          width: 4px;
          align-self: stretch;
          border-radius: 99px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .nb-item-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
          white-space: nowrap;
          border: 1px solid;
        }
        .nb-item-body { flex: 1; min-width: 0; }
        .nb-item-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .nb-category-tag {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: var(--bg-base);
          padding: 2px 8px;
          border-radius: 99px;
        }
        .nb-item-text { font-size: 14px; color: var(--text-primary); line-height: 1.55; font-weight: 500; }
        .nb-item-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .nb-author { font-weight: 600; color: var(--text-secondary); }

        .nb-delete-btn {
          background: none;
          border: none;
          padding: 6px;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 150ms ease;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .nb-delete-btn:hover { background: #fee2e2; color: #e11d48; }

        @media (max-width: 640px) {
          .nb-form-grid { grid-template-columns: 1fr; }
          .nb-header { padding: 16px 16px; }
          .nb-form { padding: 16px 16px; }
          .nb-item { padding: 14px 16px; }
        }
      `}</style>

      <div className="nb-page">
        <div className="nb-page-header">
          <div className="nb-page-title">Notice Board</div>
          <div className="nb-page-sub">Company-wide announcements and alerts</div>
        </div>

        <div className="nb-card">
          {/* Header */}
          <div className="nb-header">
            <div className="nb-header-left">
              <div className="nb-bell-wrap">
                <Bell size={20} color="var(--accent-primary, #4f46e5)" />
                <span className="nb-bell-ping" />
                <span className="nb-bell-dot" />
              </div>
              <div>
                <div className="nb-title">Notices</div>
                <div className="nb-sub">{notices.length} announcement{notices.length !== 1 ? "s" : ""} active</div>
              </div>
            </div>
            {isAdmin && (
              <button className="nb-add-btn" onClick={() => setShowForm(!showForm)}>
                {showForm ? <X size={15} /> : <Plus size={15} />}
                {showForm ? "Cancel" : "New Notice"}
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="nb-filters">
            {["All", "Urgent", "Important", "Normal"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`filter-tab filter-${f.toLowerCase()}${filter === f ? " active" : ""}`}
              >
                {f}
                {f !== "All" && (
                  <span style={{ marginLeft: 4 }}>
                    ({notices.filter(n => n.priority === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Form */}
          {showForm && (
            <div className="nb-form">
              <div className="nb-form-title"><Plus size={15} /> Create New Notice</div>
              <div className="nb-form-grid">
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
              <div className="nb-form-row2">
                <button className="nb-submit-btn" onClick={addNotice}>Post Notice</button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="nb-list">
            {filtered.length === 0 ? (
              <div className="nb-empty">
                <div className="nb-empty-icon">📭</div>
                <div>No notices found</div>
              </div>
            ) : filtered.map((notice, i) => {
              const p = priorities[notice.priority];
              return (
                <div key={notice.id} className="nb-item" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="nb-priority-indicator" style={{ background: p.dot }} />
                  <div className="nb-item-body">
                    <div className="nb-item-meta">
                      <span
                        className="nb-item-badge"
                        style={{ background: p.badge, color: p.text, borderColor: p.border }}
                      >
                        {p.icon} {notice.priority}
                      </span>
                      <span className="nb-category-tag">{notice.category}</span>
                    </div>
                    <p className="nb-item-text">{notice.text}</p>
                    <div className="nb-item-footer">
                      <span className="nb-author">{notice.author}</span>
                      <span>·</span>
                      <span>{timeAgo(notice.createdAt)}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button className="nb-delete-btn" onClick={() => deleteNotice(notice.id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
