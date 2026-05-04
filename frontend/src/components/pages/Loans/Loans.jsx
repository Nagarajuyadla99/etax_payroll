import { useState, useMemo } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IconPlus      = () => <Icon d="M12 5v14M5 12h14" />;
const IconSearch    = () => <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />;
const IconDots      = () => <Icon d="M5 12h.01M12 12h.01M19 12h.01" size={18} />;
const IconClose     = () => <Icon d="M18 6L6 18M6 6l12 12" />;
const IconEdit      = () => <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={14} />;
const IconTrash     = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />;
const IconPause     = () => <Icon d="M10 4H6v16h4V4zM18 4h-4v16h4V4z" size={14} />;
const IconPlay      = () => <Icon d="M5 3l14 9-14 9V3z" size={14} />;
const IconCoin      = () => <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2" size={14} />;
const IconArrowLeft = () => <Icon d="M19 12H5M12 5l-7 7 7 7" />;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const uid  = () => Math.floor(Math.random() * 90000) + 10000;

const badgeCls = (s) => ({
  Running: "background:#d1fae5;color:#065f46;border:1px solid #6ee7b7",
  Closing:  "background:#fef3c7;color:#92400e;border:1px solid #fcd34d",
  Paused:   "background:#f1f5f9;color:#475569;border:1px solid #cbd5e1",
  Closed:   "background:#fee2e2;color:#991b1b;border:1px solid #fca5a5",
}[s] || "background:#f1f5f9;color:#475569");

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_TYPES = [
  { id: 1, name: "Personal Loan",  perquisiteRate: 0 },
  { id: 2, name: "Education Loan", perquisiteRate: 0 },
  { id: 3, name: "Advance Salary", perquisiteRate: 0 },
  { id: 4, name: "Vehicle Loan",   perquisiteRate: 8.5 },
];

const SEED_LOANS = [
  {
    id: 1, employeeName: "Ravi Kumar", employeeCode: "EMP001",
    loanTypeId: 1, loanType: "Personal Loan",
    amount: 120000, disbursementDate: "2024-01-15",
    openingBalance: 120000, perquisiteOpeningBalance: 0,
    reason: "Medical emergency", perquisiteExemption: true,
    repaymentStartDate: "2024-02-01", installmentAmount: 5200,
    emiPaid: 4, totalEmis: 23, status: "Running",
    repayments: [
      { id: 1, date: "2024-02-01", amount: 5200, mode: "Salary Deduction", ref: "AUTO-001" },
      { id: 2, date: "2024-03-01", amount: 5200, mode: "Salary Deduction", ref: "AUTO-002" },
      { id: 3, date: "2024-04-01", amount: 5200, mode: "Bank Transfer",    ref: "TXN-1234" },
      { id: 4, date: "2024-05-01", amount: 5200, mode: "Salary Deduction", ref: "AUTO-004" },
    ],
  },
  {
    id: 2, employeeName: "Sita Devi", employeeCode: "EMP002",
    loanTypeId: 2, loanType: "Education Loan",
    amount: 200000, disbursementDate: "2023-11-01",
    openingBalance: 200000, perquisiteOpeningBalance: 0,
    reason: "Higher education fees", perquisiteExemption: false,
    repaymentStartDate: "2023-12-01", installmentAmount: 6400,
    emiPaid: 6, totalEmis: 32, status: "Running",
    repayments: [
      { id: 1, date: "2023-12-01", amount: 6400, mode: "Salary Deduction", ref: "AUTO-010" },
      { id: 2, date: "2024-01-01", amount: 6400, mode: "Salary Deduction", ref: "AUTO-011" },
    ],
  },
  {
    id: 3, employeeName: "Arun Sharma", employeeCode: "EMP003",
    loanTypeId: 3, loanType: "Advance Salary",
    amount: 30000, disbursementDate: "2024-03-01",
    openingBalance: 30000, perquisiteOpeningBalance: 0,
    reason: "Relocation expenses", perquisiteExemption: true,
    repaymentStartDate: "2024-04-01", installmentAmount: 5000,
    emiPaid: 4, totalEmis: 6, status: "Closing",
    repayments: [
      { id: 1, date: "2024-04-01", amount: 5000, mode: "Salary Deduction", ref: "AUTO-020" },
      { id: 2, date: "2024-05-01", amount: 5000, mode: "Salary Deduction", ref: "AUTO-021" },
    ],
  },
];

const EMPLOYEES   = [
  { id: "EMP001", name: "Ravi Kumar" }, { id: "EMP002", name: "Sita Devi" },
  { id: "EMP003", name: "Arun Sharma" }, { id: "EMP004", name: "Priya Nair" },
  { id: "EMP005", name: "Karthik Raj" },
];
const PAY_MODES = ["Salary Deduction", "Bank Transfer", "Cash", "Cheque", "UPI"];

// ─── Inline styles ────────────────────────────────────────────────────────────
const S = {
  page:       { minHeight: "100vh", background: "#f8fafc", padding: "28px 24px", fontFamily: "'DM Sans', system-ui, sans-serif" },
  card:       { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 20 },
  input:      { width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#1e293b", outline: "none", background: "#fff", boxSizing: "border-box" },
  btnPrimary: { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "#4f46e5", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGhost:   { padding: "9px 16px", borderRadius: 10, background: "#fff", color: "#475569", border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  label:      { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" },
  th:         { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  td:         { padding: "12px 14px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9" },
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 620 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", maxWidth: width, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, borderRadius: 8 }}><IconClose /></button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={S.label}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>
      {children}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color, iconD, iconColor, bg }) {
  return (
    <div style={{ ...S.card, display: "flex", alignItems: "flex-start", gap: 14, padding: 18 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon d={iconD} size={20} color={iconColor} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Action Menu ──────────────────────────────────────────────────────────────
function ActionMenu({ loan, onPause, onResume, onDelete, onRepayment }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#94a3b8" }}>
        <IconDots />
      </button>
      {open && (
        <div onMouseLeave={() => setOpen(false)}
          style={{ position: "absolute", right: 0, top: 32, zIndex: 30, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", width: 200, padding: "4px 0" }}>
          {[
            { label: "Record Repayment", icon: <IconCoin />, color: "#334155", action: () => { onRepayment(loan); setOpen(false); } },
            loan.status === "Running" && { label: "Pause Deductions", icon: <IconPause />, color: "#d97706", action: () => { onPause(loan.id); setOpen(false); } },
            loan.status === "Paused"  && { label: "Resume Deductions", icon: <IconPlay />,  color: "#059669", action: () => { onResume(loan.id); setOpen(false); } },
          ].filter(Boolean).map((item, i) => (
            <button key={i} onClick={item.action}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: item.color, textAlign: "left" }}>
              {item.icon} {item.label}
            </button>
          ))}
          <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
          <button onClick={() => { onDelete(loan.id); setOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444" }}>
            <IconTrash /> Delete Loan
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Record Loan Modal ────────────────────────────────────────────────────────
function RecordLoanModal({ open, onClose, loanTypes, onSave }) {
  const empty = { employeeId: "", loanTypeId: "", amount: "", disbursementDate: "", openingBalance: "", perquisiteOpeningBalance: "0", reason: "", perquisiteExemption: false, repaymentStartDate: "", installmentAmount: "" };
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.employeeId && form.loanTypeId && form.amount && form.disbursementDate;

  const handleSave = () => {
    if (!valid) return;
    const emp = EMPLOYEES.find(e => e.id === form.employeeId);
    const lt  = loanTypes.find(l => l.id === parseInt(form.loanTypeId));
    onSave({ id: uid(), employeeCode: emp.id, employeeName: emp.name, loanTypeId: lt.id, loanType: lt.name, amount: parseFloat(form.amount), disbursementDate: form.disbursementDate, openingBalance: parseFloat(form.openingBalance || form.amount), perquisiteOpeningBalance: parseFloat(form.perquisiteOpeningBalance || 0), reason: form.reason, perquisiteExemption: form.perquisiteExemption, repaymentStartDate: form.repaymentStartDate, installmentAmount: parseFloat(form.installmentAmount || 0), emiPaid: 0, totalEmis: form.installmentAmount ? Math.ceil(parseFloat(form.amount) / parseFloat(form.installmentAmount)) : 0, status: "Running", repayments: [] });
    setForm(empty); onClose();
  };

  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

  return (
    <Modal open={open} onClose={onClose} title="Record Loan">
      <div style={grid2}>
        <Field label="Employee" required>
          <select style={S.input} value={form.employeeId} onChange={e => set("employeeId", e.target.value)}>
            <option value="">Select Employee</option>
            {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
          </select>
        </Field>
        <Field label="Loan Type" required>
          <select style={S.input} value={form.loanTypeId} onChange={e => set("loanTypeId", e.target.value)}>
            <option value="">Select Type</option>
            {loanTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
          </select>
        </Field>
        <Field label="Loan Amount" required>
          <input type="number" style={S.input} placeholder="0.00" value={form.amount}
            onChange={e => { set("amount", e.target.value); set("openingBalance", e.target.value); }} />
        </Field>
        <Field label="Disbursement Date" required>
          <input type="date" style={S.input} value={form.disbursementDate} onChange={e => set("disbursementDate", e.target.value)} />
        </Field>
        <Field label="Opening Balance">
          <input type="number" style={S.input} value={form.openingBalance} onChange={e => set("openingBalance", e.target.value)} />
        </Field>
        <Field label="Perquisite Opening Balance">
          <input type="number" style={S.input} value={form.perquisiteOpeningBalance} onChange={e => set("perquisiteOpeningBalance", e.target.value)} />
        </Field>
        <Field label="Repayment Start Date">
          <input type="date" style={S.input} value={form.repaymentStartDate} onChange={e => set("repaymentStartDate", e.target.value)} />
        </Field>
        <Field label="Installment Amount (EMI)">
          <input type="number" style={S.input} placeholder="0.00" value={form.installmentAmount} onChange={e => set("installmentAmount", e.target.value)} />
        </Field>
        <Field label="Reason">
          <input type="text" style={S.input} placeholder="Reason for loan" value={form.reason} onChange={e => set("reason", e.target.value)} />
        </Field>
        <Field label="Perquisite Exemption">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <div onClick={() => set("perquisiteExemption", !form.perquisiteExemption)}
              style={{ width: 40, height: 22, borderRadius: 999, background: form.perquisiteExemption ? "#4f46e5" : "#e2e8f0", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: form.perquisiteExemption ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 13, color: "#64748b" }}>{form.perquisiteExemption ? "Enabled" : "Disabled"}</span>
          </div>
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
        <button onClick={onClose} style={S.btnGhost}>Cancel</button>
        <button onClick={handleSave} disabled={!valid}
          style={{ ...S.btnPrimary, opacity: valid ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}>
          Save Loan
        </button>
      </div>
    </Modal>
  );
}

// ─── Manage Loan Types Modal ──────────────────────────────────────────────────
function ManageLoanTypesModal({ open, onClose, loanTypes, setLoanTypes }) {
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [editId, setEditId]   = useState(null);

  return (
    <Modal open={open} onClose={onClose} title="Manage Loan Types" width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {loanTypes.map(lt => {
          const editing = editId === lt.id;
          const [eName, setEName] = [lt.name, (v) => setLoanTypes(p => p.map(x => x.id === lt.id ? { ...x, name: v } : x))];
          const [eRate, setERate] = [lt.perquisiteRate, (v) => setLoanTypes(p => p.map(x => x.id === lt.id ? { ...x, perquisiteRate: parseFloat(v || 0) } : x))];
          return (
            <div key={lt.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              {editing ? (
                <>
                  <input style={{ ...S.input, flex: 1 }} value={lt.name} onChange={e => setEName(e.target.value)} />
                  <input style={{ ...S.input, width: 80 }} type="number" value={lt.perquisiteRate} onChange={e => setERate(e.target.value)} placeholder="Rate %" />
                  <button onClick={() => setEditId(null)} style={{ ...S.btnPrimary, padding: "6px 12px", fontSize: 12 }}>Save</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#334155" }}>{lt.name}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", width: 70 }}>{lt.perquisiteRate}% perq.</span>
                  <button onClick={() => setEditId(lt.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}><IconEdit /></button>
                  <button onClick={() => setLoanTypes(p => p.filter(x => x.id !== lt.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}><IconTrash /></button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
        <label style={S.label}>Add New Type</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...S.input, flex: 1 }} placeholder="Loan type name" value={newName} onChange={e => setNewName(e.target.value)} />
          <input style={{ ...S.input, width: 90 }} type="number" placeholder="Rate %" value={newRate} onChange={e => setNewRate(e.target.value)} />
          <button onClick={() => { if (!newName.trim()) return; setLoanTypes(p => [...p, { id: uid(), name: newName.trim(), perquisiteRate: parseFloat(newRate || 0) }]); setNewName(""); setNewRate(""); }}
            style={{ ...S.btnPrimary, whiteSpace: "nowrap", padding: "8px 14px" }}>
            <IconPlus /> Add
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Repayment Modal ──────────────────────────────────────────────────────────
function RepaymentModal({ open, onClose, loan, onSave }) {
  const [form, setForm] = useState({ amount: "", date: "", mode: "Salary Deduction", ref: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.amount && form.date;

  const handleSave = () => {
    if (!valid) return;
    onSave(loan.id, { id: uid(), amount: parseFloat(form.amount), date: form.date, mode: form.mode, ref: form.ref || `REF-${uid()}` });
    setForm({ amount: "", date: "", mode: "Salary Deduction", ref: "" });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Record Repayment — ${loan?.employeeName || ""}`} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Amount" required><input type="number" style={S.input} placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} /></Field>
        <Field label="Date" required><input type="date" style={S.input} value={form.date} onChange={e => set("date", e.target.value)} /></Field>
        <Field label="Payment Mode">
          <select style={S.input} value={form.mode} onChange={e => set("mode", e.target.value)}>
            {PAY_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Reference Number"><input type="text" style={S.input} placeholder="e.g. TXN-12345" value={form.ref} onChange={e => set("ref", e.target.value)} /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
        <button onClick={onClose} style={S.btnGhost}>Cancel</button>
        <button onClick={handleSave} disabled={!valid} style={{ ...S.btnPrimary, opacity: valid ? 1 : 0.5 }}>Record Repayment</button>
      </div>
    </Modal>
  );
}

// ─── Loan Detail ──────────────────────────────────────────────────────────────
function LoanDetail({ loan, onBack, onRepayment, onDeleteRepayment }) {
  const paid     = loan.repayments.reduce((s, r) => s + r.amount, 0);
  const balance  = loan.amount - paid;
  const progress = Math.min(100, Math.round((paid / loan.amount) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4f46e5", width: "fit-content" }}>
        <IconArrowLeft /> Back to Loans
      </button>

      {/* Header */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{loan.employeeName}</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{loan.employeeCode} · {loan.loanType}</div>
            <span style={{ display: "inline-block", marginTop: 8, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, ...Object.fromEntries(badgeCls(loan.status).split(";").map(s => s.split(":").map(x => x.trim()))) }}>
              {loan.status}
            </span>
          </div>
          <button onClick={() => onRepayment(loan)} style={S.btnPrimary}><IconPlus /> Record Repayment</button>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
            <span>Repaid: {fmt(paid)}</span><span>{progress}%</span><span>Balance: {fmt(balance)}</span>
          </div>
          <div style={{ height: 10, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #4f46e5, #10b981)", borderRadius: 999, transition: "width 0.6s ease" }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
          {[["Loan Amount", fmt(loan.amount)], ["EMI", fmt(loan.installmentAmount)], ["Disbursed On", fmtD(loan.disbursementDate)], ["Repayment Start", fmtD(loan.repaymentStartDate)]].map(([l, v]) => (
            <div key={l} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Repayment History */}
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Repayment History</span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{loan.repayments.length} entries</span>
        </div>
        {loan.repayments.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No repayments recorded yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Date", "Amount", "Mode", "Reference", ""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loan.repayments.map(r => (
                <tr key={r.id} style={{ background: "#fff" }}>
                  <td style={S.td}>{fmtD(r.date)}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{fmt(r.amount)}</td>
                  <td style={{ ...S.td, color: "#64748b" }}>{r.mode}</td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>{r.ref}</td>
                  <td style={S.td}>
                    <button onClick={() => onDeleteRepayment(loan.id, r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", padding: 4 }}><IconTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LoansPreview() {
  const [loans, setLoans]         = useState(SEED_LOANS);
  const [loanTypes, setLoanTypes] = useState(SEED_TYPES);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [showRecord, setShowRecord]   = useState(false);
  const [showManage, setShowManage]   = useState(false);
  const [showRepay,  setShowRepay]    = useState(false);
  const [selLoan,    setSelLoan]      = useState(null);
  const [detailLoan, setDetailLoan]   = useState(null);

  const filtered = useMemo(() => loans.filter(l => {
    const q = search.toLowerCase();
    return (l.employeeName.toLowerCase().includes(q) || l.loanType.toLowerCase().includes(q) || l.employeeCode.toLowerCase().includes(q))
      && (statusFilter === "All" || l.status === statusFilter);
  }), [loans, search, statusFilter]);

  const totalLoan  = filtered.reduce((s, l) => s + l.amount, 0);
  const totalEMI   = filtered.reduce((s, l) => s + l.installmentAmount, 0);
  const activeCount= filtered.filter(l => l.status === "Running").length;
  const totalPaid  = loans.flatMap(l => l.repayments).reduce((s, r) => s + r.amount, 0);

  const handlePause  = (id) => setLoans(p => p.map(l => l.id === id ? { ...l, status: "Paused"   } : l));
  const handleResume = (id) => setLoans(p => p.map(l => l.id === id ? { ...l, status: "Running"  } : l));
  const handleDelete = (id) => { setLoans(p => p.filter(l => l.id !== id)); if (detailLoan?.id === id) setDetailLoan(null); };

  const handleSaveLoan = (loan) => setLoans(p => [loan, ...p]);

  const handleSaveRepay = (loanId, rep) => {
    setLoans(p => p.map(l => l.id === loanId ? { ...l, repayments: [...l.repayments, rep], emiPaid: l.emiPaid + 1 } : l));
    if (detailLoan?.id === loanId) setDetailLoan(prev => ({ ...prev, repayments: [...prev.repayments, rep] }));
  };

  const handleDelRepay = (loanId, repId) => {
    setLoans(p => p.map(l => l.id === loanId ? { ...l, repayments: l.repayments.filter(r => r.id !== repId) } : l));
    if (detailLoan?.id === loanId) setDetailLoan(prev => ({ ...prev, repayments: prev.repayments.filter(r => r.id !== repId) }));
  };

  const openRepay  = (loan) => { setSelLoan(loan); setShowRepay(true); };
  const openDetail = (loan) => setDetailLoan(loans.find(l => l.id === loan.id) || loan);

  // sync detail with updated loans
  const currentDetail = detailLoan ? loans.find(l => l.id === detailLoan.id) : null;

  return (
    <div style={S.page}>
      <RecordLoanModal open={showRecord} onClose={() => setShowRecord(false)} loanTypes={loanTypes} onSave={handleSaveLoan} />
      <ManageLoanTypesModal open={showManage} onClose={() => setShowManage(false)} loanTypes={loanTypes} setLoanTypes={setLoanTypes} />
      {selLoan && <RepaymentModal open={showRepay} onClose={() => setShowRepay(false)} loan={selLoan} onSave={handleSaveRepay} />}

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>Employee Loans</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>Manage, track and record loan repayments</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setShowManage(true)} style={S.btnGhost}>Manage Loan Types</button>
            <button onClick={() => setShowRecord(true)} style={S.btnPrimary}><IconPlus /> Record Loan</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <SummaryCard label="Total Disbursed"  value={fmt(totalLoan)}  color="#4f46e5" bg="#eef2ff" iconD="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" iconColor="#4f46e5" />
          <SummaryCard label="Monthly EMI Load" value={fmt(totalEMI)}   color="#7c3aed" bg="#f5f3ff" iconD="M3 6h18M3 12h18M3 18h18"               iconColor="#7c3aed" />
          <SummaryCard label="Active Loans"     value={activeCount}     color="#059669" bg="#ecfdf5" iconD="M5 13l4 4L19 7"                         iconColor="#059669" />
          <SummaryCard label="Total Repaid"     value={fmt(totalPaid)}  color="#0284c7" bg="#e0f2fe" iconD="M12 22V12m0 0l-3-3m3 3l3-3"            iconColor="#0284c7" />
        </div>

        {/* Detail or List */}
        {currentDetail ? (
          <LoanDetail loan={currentDetail} onBack={() => setDetailLoan(null)} onRepayment={openRepay} onDeleteRepayment={handleDelRepay} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><IconSearch /></span>
                <input style={{ ...S.input, paddingLeft: 36, borderRadius: 12 }} placeholder="Search by name, code or loan type…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select style={{ ...S.input, width: 160, borderRadius: 12 }} value={statusFilter} onChange={e => setStatus(e.target.value)}>
                {["All", "Running", "Closing", "Paused", "Closed"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Table */}
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                  <thead>
                    <tr>{["Employee", "Loan Type", "Amount", "EMI", "Progress", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", padding: 48, color: "#94a3b8" }}>No loans found.</td></tr>
                    ) : filtered.map(l => {
                      const paid     = l.repayments.reduce((s, r) => s + r.amount, 0);
                      const progress = Math.min(100, Math.round((paid / l.amount) * 100));
                      return (
                        <tr key={l.id} onClick={() => openDetail(l)}
                          style={{ cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                          onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                          <td style={S.td}>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>{l.employeeName}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{l.employeeCode}</div>
                          </td>
                          <td style={{ ...S.td, color: "#64748b" }}>{l.loanType}</td>
                          <td style={{ ...S.td, fontWeight: 700 }}>{fmt(l.amount)}</td>
                          <td style={{ ...S.td, color: "#64748b" }}>{fmt(l.installmentAmount)}</td>
                          <td style={{ ...S.td, minWidth: 120 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${progress}%`, background: "#4f46e5", borderRadius: 999 }} />
                              </div>
                              <span style={{ fontSize: 11, color: "#94a3b8", width: 30, textAlign: "right" }}>{progress}%</span>
                            </div>
                          </td>
                          <td style={S.td}>
                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, ...Object.fromEntries(badgeCls(l.status).split(";").filter(Boolean).map(s => s.split(":").map(x => x.trim()))) }}>
                              {l.status}
                            </span>
                          </td>
                          <td style={{ ...S.td }} onClick={e => e.stopPropagation()}>
                            <ActionMenu loan={l} onPause={handlePause} onResume={handleResume} onDelete={handleDelete} onRepayment={openRepay} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "10px 18px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
                Showing {filtered.length} of {loans.length} loans
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
