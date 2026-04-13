import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees, deleteEmployee, updateEmployee } from "./EmployeeApi";

// ─── Icons (inline SVG, no emoji) ────────────────────────────────────────────

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const IconLoader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);

const IconUser = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

// ─── Toast Component ──────────────────────────────────────────────────────────

function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, minWidth: 320, maxWidth: 420 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          style={{ animation: "slideInRight 0.3s ease" }}
        >
          <span className="toast-icon">
            {t.type === "success" ? <IconCheck /> : <IconAlertTriangle />}
          </span>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)}><IconClose /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({ employee, onConfirm, onCancel, loading }) {
  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-wrap">
          <IconAlertTriangle />
        </div>
        <h3 className="modal-title">Delete Employee</h3>
        <p className="modal-body">
          Are you sure you want to delete employee{" "}
          <strong>{fullName}</strong>? This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <><IconLoader /> Deleting…</> : "Delete Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

const EDITABLE_FIELDS = [
  { key: "first_name", label: "First Name", type: "text", required: true },
  { key: "middle_name", label: "Middle Name", type: "text" },
  { key: "last_name", label: "Last Name", type: "text" },
  { key: "display_name", label: "Display Name", type: "text" },
  { key: "email", label: "Personal Email", type: "email" },
  { key: "work_email", label: "Work Email", type: "email" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "mobile_phone", label: "Mobile Phone", type: "text" },
  { key: "gender", label: "Gender", type: "select", options: ["male", "female", "other", "prefer_not_to_say"] },
  { key: "date_of_birth", label: "Date of Birth", type: "date" },
  { key: "date_of_joining", label: "Date of Joining", type: "date" },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive", "on_leave", "terminated"] },
  { key: "business_unit", label: "Business Unit", type: "text" },
  { key: "pay_frequency", label: "Pay Frequency", type: "select", options: ["Monthly", "Weekly", "Bi-Weekly"] },
  { key: "annual_ctc", label: "Annual CTC", type: "number" },
];

function EditDrawer({ employee, onSave, onClose, loading }) {
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState({});

  useEffect(() => {
    if (employee) {
      const initial = {};
      EDITABLE_FIELDS.forEach(({ key }) => {
        initial[key] = employee[key] ?? "";
      });
      setForm(initial);
      setDirty({});
    }
  }, [employee]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = () => {
    const changed = {};
    Object.keys(dirty).forEach((k) => {
      if (dirty[k]) changed[k] = form[k] === "" ? null : form[k];
    });
    if (Object.keys(changed).length === 0) {
      onClose();
      return;
    }
    onSave(changed);
  };

  if (!employee) return null;
  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");
  const changedCount = Object.keys(dirty).length;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-avatar"><IconUser /></div>
          <div>
            <div className="drawer-title">{fullName}</div>
            <div className="drawer-subtitle">
              {employee.employee_code ? `#${employee.employee_code}` : "No Code"}{" "}
              {employee.designation?.title ? `· ${employee.designation.title}` : ""}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}><IconClose /></button>
        </div>

        {/* Form */}
        <div className="drawer-body">
          <div className="drawer-section-label">Employee Information</div>
          <div className="drawer-grid">
            {EDITABLE_FIELDS.map(({ key, label, type, required, options }) => (
              <div key={key} className={`field-group ${dirty[key] ? "field-dirty" : ""}`}>
                <label className="field-label">
                  {label} {required && <span className="required-star">*</span>}
                  {dirty[key] && <span className="field-changed-badge">Edited</span>}
                </label>
                {type === "select" ? (
                  <select
                    className="field-input"
                    value={form[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {options.map((o) => (
                      <option key={o} value={o}>{o.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    className="field-input"
                    value={form[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    required={required}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          {changedCount > 0 && (
            <span className="changes-badge">{changedCount} field{changedCount > 1 ? "s" : ""} modified</span>
          )}
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><IconLoader /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    active: "badge-active",
    inactive: "badge-inactive",
    on_leave: "badge-leave",
    terminated: "badge-terminated",
  };
  return (
    <span className={`badge ${map[status] || "badge-inactive"}`}>
      {status ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown"}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Edit state
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [updatedRowId, setUpdatedRowId] = useState(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Action loading (per row)
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastCounter = useRef(0);

  const navigate = useNavigate();

  const addToast = useCallback((message, type = "success") => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (err) {
      addToast("Failed to load employees. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = employees.filter((emp) =>
      `${emp.first_name} ${emp.middle_name || ""} ${emp.last_name} ${emp.employee_code || ""}`
        .toLowerCase()
        .includes(term)
    );
    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [searchTerm, employees]);

  const lastIndex = currentPage * rowsPerPage;
  const firstIndex = lastIndex - rowsPerPage;
  const currentEmployees = filteredEmployees.slice(firstIndex, lastIndex);
  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);

  const fullName = (emp) =>
    [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ");

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEditOpen = (emp) => {
    if (actionLoadingId) return;
    setEditingEmployee(emp);
  };

  const handleEditSave = async (changedFields) => {
    const emp = editingEmployee;
    try {
      setEditLoading(true);
      setActionLoadingId(emp.employee_id);

      const updated = await updateEmployee(emp.employee_id, changedFields);

      // Optimistic update — replace only this row
      const merge = updated || { ...emp, ...changedFields };
      setEmployees((prev) =>
        prev.map((e) => (e.employee_id === emp.employee_id ? { ...e, ...merge } : e))
      );

      setEditingEmployee(null);
      addToast(`Employee ${fullName(emp)} updated successfully`, "success");

      // Flash the updated row
      setUpdatedRowId(emp.employee_id);
      setTimeout(() => setUpdatedRowId(null), 2500);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "Employee not found") {
        addToast(`Employee ${fullName(emp)} not found. They may have been deleted.`, "error");
      } else if (typeof detail === "string") {
        addToast(`Update failed: ${detail}`, "error");
      } else {
        addToast(`Failed to update ${fullName(emp)}. Please try again.`, "error");
      }
    } finally {
      setEditLoading(false);
      setActionLoadingId(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    const emp = deleteTarget;
    try {
      setDeleteLoading(true);
      setActionLoadingId(emp.employee_id);

      await deleteEmployee(emp.employee_id);

      // Optimistic removal
      setEmployees((prev) => prev.filter((e) => e.employee_id !== emp.employee_id));
      setDeleteTarget(null);
      addToast(`Employee ${fullName(emp)} deleted successfully`, "success");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "Employee not found") {
        // Already gone — remove from UI anyway
        setEmployees((prev) => prev.filter((e) => e.employee_id !== emp.employee_id));
        setDeleteTarget(null);
        addToast(`Employee ${fullName(emp)} was not found and has been removed from the list.`, "error");
      } else {
        addToast(`Failed to delete employee ${fullName(emp)}. Please try again.`, "error");
        setDeleteTarget(null);
      }
    } finally {
      setDeleteLoading(false);
      setActionLoadingId(null);
    }
  };

  // ── Page numbers ──────────────────────────────────────────────────────────

  const getPageNumbers = () => {
    const delta = 2;
    const pages = [];
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #f4f5f7;
          --surface: #ffffff;
          --border: #e2e4e9;
          --border-strong: #c8cbd3;
          --text-primary: #0f1117;
          --text-secondary: #5a5f72;
          --text-muted: #9399a8;
          --accent: #2563eb;
          --accent-hover: #1d4ed8;
          --accent-light: #eff4ff;
          --danger: #dc2626;
          --danger-hover: #b91c1c;
          --danger-light: #fef2f2;
          --success: #16a34a;
          --success-light: #f0fdf4;
          --warning: #d97706;
          --update-flash: #ecfdf5;
          --row-hover: #f8f9fb;
          --font: 'IBM Plex Sans', sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;
          --radius: 8px;
          --radius-lg: 12px;
          --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05);
          --shadow-lg: 0 10px 40px rgba(0,0,0,.12);
          --shadow-xl: 0 20px 60px rgba(0,0,0,.18);
          --header-h: 56px;
        }

        body { font-family: var(--font); background: var(--bg); color: var(--text-primary); }

        /* ─── Page ─── */
        .el-page { width: 100%; min-width: 0; min-height: 100vh; padding: 28px 32px 80px; font-family: var(--font); background: var(--bg); }

        /* ─── Header ─── */
        .el-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px; }
        .el-header > div { min-width: 0; }
        .el-title { font-size: 1.35rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
        .el-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
        .el-header-actions { display: flex; gap: 10px; align-items: center; }

        /* ─── Search ─── */
        .search-wrap { position: relative; }
        .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input {
          border: 1.5px solid var(--border);
          background: var(--surface);
          padding: 8px 12px 8px 34px;
          border-radius: var(--radius);
          font-size: 0.85rem;
          font-family: var(--font);
          color: var(--text-primary);
          width: min(340px, 42vw);
          transition: border-color .15s, box-shadow .15s;
        }
        .search-input::placeholder { color: var(--text-muted); }
        .search-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

        /* ─── Buttons ─── */
        .btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--accent); color: #fff;
          border: none; border-radius: var(--radius); padding: 8px 16px;
          font-size: 0.85rem; font-weight: 500; font-family: var(--font);
          cursor: pointer; transition: background .15s, opacity .15s;
        }
        .btn-primary:hover { background: var(--accent-hover); }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; color: var(--text-secondary);
          border: 1.5px solid var(--border); border-radius: var(--radius); padding: 8px 16px;
          font-size: 0.85rem; font-weight: 500; font-family: var(--font);
          cursor: pointer; transition: border-color .15s, color .15s;
        }
        .btn-ghost:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .btn-ghost:disabled { opacity: .5; cursor: not-allowed; }

        .btn-danger {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--danger); color: #fff;
          border: none; border-radius: var(--radius); padding: 8px 16px;
          font-size: 0.85rem; font-weight: 500; font-family: var(--font);
          cursor: pointer; transition: background .15s;
        }
        .btn-danger:hover { background: var(--danger-hover); }
        .btn-danger:disabled { opacity: .6; cursor: not-allowed; }

        .btn-back {
          position: fixed; bottom: 24px; right: 24px; z-index: 100;
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--text-primary); color: #fff;
          border: none; border-radius: 50px; padding: 11px 20px;
          font-size: 0.85rem; font-weight: 500; font-family: var(--font);
          cursor: pointer; box-shadow: var(--shadow-lg); transition: transform .15s, background .15s;
        }
        .btn-back:hover { background: #1a1f2e; transform: translateY(-1px); }

        /* ─── Table container ─── */
        .table-wrap { border: 1.5px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); overflow: hidden; box-shadow: var(--shadow); }
        .table-scroll { overflow-x: auto; max-height: calc(100vh - 280px); overflow-y: auto; }

        /* ─── Table ─── */
        table { width: 100%; border-collapse: collapse; font-size: 0.845rem; }
        thead { position: sticky; top: 0; z-index: 10; }
        thead tr { background: #f8f9fb; border-bottom: 1.5px solid var(--border); }
        th { padding: 11px 14px; text-align: left; font-weight: 600; font-size: 0.775rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); white-space: nowrap; }
        tbody tr { border-bottom: 1px solid var(--border); transition: background .12s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: var(--row-hover); }
        tbody tr.row-updated { animation: rowFlash 2.5s ease forwards; }
        @keyframes rowFlash { 0%,100% { background: transparent; } 10%,40% { background: var(--update-flash); } }
        td { padding: 11px 14px; color: var(--text-primary); vertical-align: middle; }
        td.muted { color: var(--text-secondary); font-size: 0.82rem; }
        .mono { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary); }

        /* ─── Employee name cell ─── */
        .emp-name-cell { display: flex; flex-direction: column; }
        .emp-name { font-weight: 500; }
        .emp-meta { font-size: 0.77rem; color: var(--text-muted); margin-top: 1px; }

        /* ─── Status badge ─── */
        .badge { display: inline-block; padding: 2px 9px; border-radius: 50px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; }
        .badge-active { background: #dcfce7; color: #15803d; }
        .badge-inactive { background: #f1f5f9; color: #64748b; }
        .badge-leave { background: #fef9c3; color: #a16207; }
        .badge-terminated { background: #fee2e2; color: #991b1b; }

        /* ─── Updated badge (inline) ─── */
        .updated-badge { display: inline-block; margin-left: 8px; background: #bbf7d0; color: #166534; border-radius: 4px; font-size: 0.68rem; font-weight: 600; padding: 1px 6px; vertical-align: middle; }

        /* ─── Action buttons ─── */
        .action-cell { display: flex; gap: 6px; align-items: center; }
        .act-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 500;
          font-family: var(--font); cursor: pointer; border: 1.5px solid transparent;
          transition: background .12s, color .12s, border-color .12s, opacity .12s;
          white-space: nowrap;
        }
        .act-btn:disabled { opacity: .45; cursor: not-allowed; pointer-events: none; }
        .act-edit { background: var(--accent-light); color: var(--accent); border-color: #c7d9fc; }
        .act-edit:hover { background: #dae6fd; border-color: var(--accent); }
        .act-delete { background: var(--danger-light); color: var(--danger); border-color: #fecaca; }
        .act-delete:hover { background: #fee2e2; border-color: var(--danger); }

        /* ─── Empty state ─── */
        .empty-row td { padding: 48px; text-align: center; color: var(--text-muted); }

        /* ─── Footer ─── */
        .el-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; flex-wrap: wrap; gap: 12px; }
        .footer-info { font-size: 0.82rem; color: var(--text-secondary); }
        .rows-select { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-secondary); }
        .rows-select select { border: 1.5px solid var(--border); border-radius: 6px; padding: 4px 8px; font-size: 0.82rem; font-family: var(--font); background: var(--surface); cursor: pointer; }
        .pagination { display: flex; align-items: center; gap: 4px; }
        .pg-btn {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; padding: 0 8px;
          border: 1.5px solid var(--border); border-radius: 6px;
          background: var(--surface); color: var(--text-secondary);
          font-size: 0.82rem; font-family: var(--font); cursor: pointer;
          transition: background .12s, border-color .12s, color .12s;
        }
        .pg-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .pg-btn:disabled { opacity: .4; cursor: not-allowed; }
        .pg-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
        .pg-ellipsis { padding: 0 4px; color: var(--text-muted); font-size: 0.82rem; }

        /* ─── Toast ─── */
        .toast {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: var(--radius); box-shadow: var(--shadow-lg);
          font-size: 0.85rem; font-family: var(--font); font-weight: 450;
          border: 1.5px solid transparent;
        }
        .toast-success { background: var(--success-light); border-color: #86efac; color: #15803d; }
        .toast-error { background: var(--danger-light); border-color: #fca5a5; color: #991b1b; }
        .toast-icon { flex-shrink: 0; margin-top: 1px; }
        .toast-msg { flex: 1; line-height: 1.4; }
        .toast-close { background: none; border: none; cursor: pointer; color: inherit; opacity: .6; padding: 0; margin-left: 4px; display: flex; align-items: center; }
        .toast-close:hover { opacity: 1; }

        /* ─── Responsive ─── */
        @media (max-width: 1024px) {
          .el-page { padding: 20px 18px 84px; }
          .search-input { width: min(360px, 48vw); }
          .btn-back { right: 16px; bottom: 16px; padding: 10px 16px; }
        }

        @media (max-width: 768px) {
          .el-page { padding: 16px 14px 88px; }
          .el-header { flex-direction: column; align-items: stretch; }
          .el-header-actions { width: 100%; flex-wrap: wrap; }
          .search-wrap { flex: 1; min-width: 220px; }
          .search-input { width: 100%; }
          .btn-primary, .btn-ghost, .btn-danger { min-height: 44px; }
          .table-scroll { max-height: none; }
          .drawer-grid { grid-template-columns: 1fr; }
          .modal-box { padding: 22px; }
        }

        @media (max-width: 420px) {
          .btn-back { width: calc(100% - 28px); left: 14px; right: 14px; justify-content: center; }
        }
        /* ─── Modal ─── */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(15,17,23,.45); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn .15s ease;
        }
        .modal-box {
          background: var(--surface); border-radius: var(--radius-lg);
          padding: 32px; max-width: 420px; width: 90%; box-shadow: var(--shadow-xl);
          animation: scaleIn .15s ease;
        }
        .modal-icon-wrap { width: 48px; height: 48px; border-radius: 50%; background: var(--danger-light); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: var(--danger); }
        .modal-title { font-size: 1.05rem; font-weight: 600; margin-bottom: 10px; }
        .modal-body { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.55; margin-bottom: 24px; }
        .modal-body strong { color: var(--text-primary); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

        /* ─── Drawer ─── */
        .drawer-overlay {
          position: fixed; inset: 0; z-index: 800;
          background: rgba(15,17,23,.35); backdrop-filter: blur(2px);
          animation: fadeIn .2s ease;
        }
        .drawer {
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 900;
          width: 480px; max-width: 95vw;
          background: var(--surface); box-shadow: var(--shadow-xl);
          display: flex; flex-direction: column;
          animation: slideInRight .22s cubic-bezier(.25,.46,.45,.94);
        }
        .drawer-header {
          display: flex; align-items: center; gap: 14px;
          padding: 20px 24px; border-bottom: 1.5px solid var(--border);
          background: #f8f9fb; flex-shrink: 0;
        }
        .drawer-avatar {
          width: 48px; height: 48px; border-radius: 50%; background: var(--accent-light);
          color: var(--accent); display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .drawer-title { font-size: 1rem; font-weight: 600; }
        .drawer-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono); }
        .drawer-close {
          margin-left: auto; background: none; border: none; cursor: pointer;
          color: var(--text-muted); padding: 6px; border-radius: 6px;
          display: flex; align-items: center; transition: color .12s, background .12s;
        }
        .drawer-close:hover { color: var(--text-primary); background: var(--border); }

        .drawer-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .drawer-section-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); margin-bottom: 16px; }
        .drawer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .field-group { display: flex; flex-direction: column; gap: 5px; }
        .field-group.field-dirty .field-input { border-color: var(--accent); background: var(--accent-light); }
        .field-label { font-size: 0.78rem; font-weight: 500; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
        .required-star { color: var(--danger); }
        .field-changed-badge { background: var(--accent); color: #fff; border-radius: 4px; font-size: 0.65rem; font-weight: 600; padding: 1px 5px; }
        .field-input {
          border: 1.5px solid var(--border); border-radius: 6px; padding: 8px 10px;
          font-size: 0.84rem; font-family: var(--font); color: var(--text-primary);
          background: var(--surface); transition: border-color .12s, background .12s, box-shadow .12s;
          width: 100%;
        }
        .field-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }

        .drawer-footer {
          display: flex; align-items: center; gap: 10px; justify-content: flex-end;
          padding: 16px 24px; border-top: 1.5px solid var(--border); flex-shrink: 0;
          background: #f8f9fb;
        }
        .changes-badge { font-size: 0.78rem; color: var(--accent); font-weight: 500; margin-right: auto; }

        /* ─── Spin ─── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-icon { animation: spin .8s linear infinite; }

        /* ─── Animations ─── */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      <div className="el-page">
        {/* Toasts */}
        <Toast toasts={toasts} removeToast={removeToast} />

        {/* Header */}
        <div className="el-header">
          <div>
            <div className="el-title">Employee List</div>
            <div className="el-subtitle">
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
              {searchTerm ? ` matching "${searchTerm}"` : ""}
            </div>
          </div>
          <div className="el-header-actions">
            <div className="search-wrap">
              <span className="search-icon"><IconSearch /></span>
              <input
                className="search-input"
                type="text"
                placeholder="Search by name or code…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={() => navigate("/employeeCreate")}>
              <IconPlus /> Add Employee
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Work Email</th>
                  <th>Phone</th>
                  <th>Joining Date</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="empty-row">
                    <td colSpan="10">Loading employees…</td>
                  </tr>
                )}

                {!loading && currentEmployees.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan="10">No employees found.</td>
                  </tr>
                )}

                {!loading &&
                  currentEmployees.map((emp) => {
                    const name = fullName(emp);
                    const isUpdated = updatedRowId === emp.employee_id;
                    const isLoading = actionLoadingId === emp.employee_id;

                    return (
                      <tr key={emp.employee_id} className={isUpdated ? "row-updated" : ""}>
                        <td>
                          <div className="emp-name-cell">
                            <span className="emp-name">
                              {name}
                              {isUpdated && <span className="updated-badge">Updated</span>}
                            </span>
                            {emp.business_unit && <span className="emp-meta">{emp.business_unit}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="mono">{emp.employee_code || "—"}</span>
                        </td>
                        <td className="muted">{emp.department?.name || "—"}</td>
                        <td className="muted">{emp.designation?.title || "—"}</td>
                        <td className="muted">{emp.work_email || emp.email || "—"}</td>
                        <td className="muted">{emp.phone || emp.mobile_phone || "—"}</td>
                        <td className="muted">
                          {emp.date_of_joining
                            ? new Date(emp.date_of_joining).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="muted">
                          {emp.updated_at
                            ? new Date(emp.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td>
                          <StatusBadge status={emp.status} />
                        </td>
                        <td>
                          <div className="action-cell">
                            <button
                              className="act-btn act-edit"
                              onClick={() => handleEditOpen(emp)}
                              disabled={isLoading || !!actionLoadingId}
                              title={`Edit ${name}`}
                            >
                              {isLoading ? <IconLoader /> : <IconEdit />}
                              Edit
                            </button>
                            <button
                              className="act-btn act-delete"
                              onClick={() => setDeleteTarget(emp)}
                              disabled={isLoading || !!actionLoadingId}
                              title={`Delete ${name}`}
                            >
                              <IconTrash /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="el-footer">
          <div className="footer-info">
            {filteredEmployees.length > 0
              ? `Showing ${firstIndex + 1}–${Math.min(lastIndex, filteredEmployees.length)} of ${filteredEmployees.length} employees`
              : "No results"}
          </div>

          <div className="rows-select">
            Rows per page:
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              {[10, 15, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="pg-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                <IconChevronLeft /><IconChevronLeft />
              </button>
              <button className="pg-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                <IconChevronLeft />
              </button>
              {currentPage > 3 && <span className="pg-ellipsis">…</span>}
              {getPageNumbers().map((n) => (
                <button key={n} className={`pg-btn ${currentPage === n ? "active" : ""}`} onClick={() => setCurrentPage(n)}>
                  {n}
                </button>
              ))}
              {currentPage < totalPages - 2 && <span className="pg-ellipsis">…</span>}
              <button className="pg-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                <IconChevronRight />
              </button>
              <button className="pg-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                <IconChevronRight /><IconChevronRight />
              </button>
            </div>
          )}
        </div>

        {/* Back button */}
        <button className="btn-back" onClick={() => navigate(-1)}>
          <IconArrowLeft /> Back
        </button>
      </div>

      {/* Edit Drawer */}
      {editingEmployee && (
        <EditDrawer
          employee={editingEmployee}
          onSave={handleEditSave}
          onClose={() => { if (!editLoading) setEditingEmployee(null); }}
          loading={editLoading}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          employee={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { if (!deleteLoading) setDeleteTarget(null); }}
          loading={deleteLoading}
        />
      )}
    </>
  );
}
