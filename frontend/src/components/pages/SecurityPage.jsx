import { useContext, useMemo, useState } from "react";
import { KeyRound, Shield, ShieldCheck } from "lucide-react";

import { AuthContext } from "../../Moduels/Context/AuthContext";
import { InputWithIcon } from "../ui/FieldWithIcon";
import { ToastStack, useToastStack } from "../ui/ToastStack";

function passwordScore(pw) {
  const s = String(pw || "");
  let score = 0;
  if (s.length >= 8) score += 1;
  if (/[A-Z]/.test(s)) score += 1;
  if (/[a-z]/.test(s)) score += 1;
  if (/\d/.test(s)) score += 1;
  if (/[^A-Za-z0-9]/.test(s)) score += 1;
  return Math.min(score, 5);
}

function scoreLabel(score) {
  if (score <= 1) return { label: "Weak", cls: "bg-red-500" };
  if (score === 2) return { label: "Fair", cls: "bg-amber-500" };
  if (score === 3) return { label: "Good", cls: "bg-yellow-500" };
  if (score === 4) return { label: "Strong", cls: "bg-emerald-500" };
  return { label: "Very strong", cls: "bg-emerald-600" };
}

export default function SecurityPage() {
  const { user: me } = useContext(AuthContext);
  const { toasts, addToast, removeToast } = useToastStack();

  const lastLogin = useMemo(() => me?.user?.last_login || me?.last_login || null, [me]);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });

  const score = passwordScore(form.next);
  const sMeta = scoreLabel(score);

  const submit = async () => {
    if (!form.current || !form.next) {
      addToast("Please fill in all required fields", "error");
      return;
    }
    if (form.next !== form.confirm) {
      addToast("New passwords do not match", "error");
      return;
    }
    if (score < 3) {
      addToast("Password is too weak", "error");
      return;
    }

    try {
      setSaving(true);

      // API-ready:
      // Replace with API call when backend supports password change.
      await new Promise((r) => setTimeout(r, 600));

      setForm({ current: "", next: "", confirm: "" });
      addToast("Password updated", "success");
    } catch {
      addToast("Failed to update password", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <ToastStack toasts={toasts} onRemove={removeToast} />

      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Security
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Password and session controls.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <KeyRound className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
              <p className="text-xs text-slate-500">Use a strong password to protect your account.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Current password</label>
              <InputWithIcon
                icon={Shield}
                type="password"
                value={form.current}
                onChange={(e) => setForm((p) => ({ ...p, current: e.target.value }))}
                placeholder="Current password"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">New password</label>
              <InputWithIcon
                icon={ShieldCheck}
                type="password"
                value={form.next}
                onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))}
                placeholder="New password"
                autoComplete="new-password"
              />
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-600">Strength</p>
                  <p className="text-xs font-medium text-slate-700">{sMeta.label}</p>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
                  <div
                    className={`h-full ${sMeta.cls} transition-all duration-200`}
                    style={{ width: `${(score / 5) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Use at least 8 characters, with mixed case, numbers, and symbols.
                </p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Confirm new password</label>
              <InputWithIcon
                icon={ShieldCheck}
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-900/10 transition duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Updating…" : "Update password"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              <Shield className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Session</h2>
              <p className="text-xs text-slate-500">Visibility for enterprise session management.</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">Last login</p>
              <p className="text-sm text-slate-600">{lastLogin ? String(lastLogin) : "—"}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">Current session</p>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
                Active
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Session management UI can be enabled when the backend provides session listing/revocation.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

