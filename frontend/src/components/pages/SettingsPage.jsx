import { useContext, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  Cog,
  Globe,
  LockKeyhole,
  Palette,
  Shield,
  Timer,
  Wallet,
} from "lucide-react";

import { AuthContext } from "../../Moduels/Context/AuthContext";
import { InputWithIcon, SelectWithIcon } from "../ui/FieldWithIcon";
import { ToastStack, useToastStack } from "../ui/ToastStack";

const SETTINGS_KEY = "app_settings:v1";

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSettings(data) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

function getRole(me, fallbackRole) {
  return (me?.role || me?.user?.role || fallbackRole || "employee").toLowerCase();
}

const tabs = [
  { id: "general", label: "General", icon: Cog },
  { id: "payroll", label: "Payroll", icon: Wallet },
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "access", label: "Access control", icon: Shield },
];

export default function SettingsPage() {
  const { user: me, role: authRole } = useContext(AuthContext);
  const { toasts, addToast, removeToast } = useToastStack();

  const role = useMemo(() => getRole(me, authRole), [me, authRole]);
  const isAdmin = role === "admin";

  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);

  const [model, setModel] = useState(() => {
    const persisted = loadSettings();
    return (
      persisted || {
        general: {
          organisation_name: me?.organisation?.name || me?.user?.organisation?.name || "",
          timezone: "Asia/Kolkata",
          currency: "INR",
          date_format: "DD/MM/YYYY",
        },
        payroll: {
          default_structure: "Standard",
          payroll_cycle: "monthly",
          tax: { tds: true, pf: true, esi: false },
        },
        preferences: {
          theme_mode: "system",
          notifications: { email: true, in_app: true },
          language: "en",
        },
        access: {
          role,
          permissions: {
            employees: { view: true, create: role !== "employee", edit: role !== "employee", delete: role === "admin" },
            payroll: { view: role !== "employee", create: role === "admin", edit: role === "admin", delete: role === "admin" },
          },
        },
      }
    );
  });

  useEffect(() => {
    setModel((prev) => ({
      ...prev,
      access: { ...prev.access, role },
    }));
  }, [role]);

  const onSave = async () => {
    try {
      setSaving(true);

      // API-ready:
      // Replace with API call when settings endpoint exists.
      await new Promise((r) => setTimeout(r, 450));

      saveSettings(model);
      addToast("Settings saved", "success");
    } catch {
      addToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <ToastStack toasts={toasts} onRemove={removeToast} />

      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Organisation configuration, payroll defaults, and user preferences.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sections
            </p>
          </div>
          <nav className="p-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={[
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition duration-200",
                    active ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100" : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-left">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-4">
          {activeTab === "general" ? (
            <Card title="General settings" description="Organisation defaults used across the system.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Organisation name">
                  <InputWithIcon
                    icon={Globe}
                    value={model.general.organisation_name}
                    onChange={(e) =>
                      setModel((p) => ({ ...p, general: { ...p.general, organisation_name: e.target.value } }))
                    }
                    placeholder="Organisation name"
                  />
                </Field>
                <Field label="Timezone">
                  <SelectWithIcon
                    icon={Timer}
                    value={model.general.timezone}
                    onChange={(e) => setModel((p) => ({ ...p, general: { ...p.general, timezone: e.target.value } }))}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                  </SelectWithIcon>
                </Field>
                <Field label="Currency">
                  <SelectWithIcon
                    icon={Wallet}
                    value={model.general.currency}
                    onChange={(e) => setModel((p) => ({ ...p, general: { ...p.general, currency: e.target.value } }))}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </SelectWithIcon>
                </Field>
                <Field label="Date format">
                  <SelectWithIcon
                    icon={Calendar}
                    value={model.general.date_format}
                    onChange={(e) =>
                      setModel((p) => ({ ...p, general: { ...p.general, date_format: e.target.value } }))
                    }
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </SelectWithIcon>
                </Field>
              </div>
            </Card>
          ) : null}

          {activeTab === "payroll" ? (
            <Card title="Payroll settings" description="Defaults for payroll generation and tax calculations.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Default salary structure">
                  <InputWithIcon
                    icon={Wallet}
                    value={model.payroll.default_structure}
                    onChange={(e) =>
                      setModel((p) => ({ ...p, payroll: { ...p.payroll, default_structure: e.target.value } }))
                    }
                    placeholder="Structure name"
                  />
                </Field>
                <Field label="Payroll cycle">
                  <SelectWithIcon
                    icon={Timer}
                    value={model.payroll.payroll_cycle}
                    onChange={(e) =>
                      setModel((p) => ({ ...p, payroll: { ...p.payroll, payroll_cycle: e.target.value } }))
                    }
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </SelectWithIcon>
                </Field>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tax configurations
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Toggle
                    label="TDS"
                    checked={model.payroll.tax.tds}
                    onChange={(v) =>
                      setModel((p) => ({ ...p, payroll: { ...p.payroll, tax: { ...p.payroll.tax, tds: v } } }))
                    }
                  />
                  <Toggle
                    label="PF"
                    checked={model.payroll.tax.pf}
                    onChange={(v) =>
                      setModel((p) => ({ ...p, payroll: { ...p.payroll, tax: { ...p.payroll.tax, pf: v } } }))
                    }
                  />
                  <Toggle
                    label="ESI"
                    checked={model.payroll.tax.esi}
                    onChange={(v) =>
                      setModel((p) => ({ ...p, payroll: { ...p.payroll, tax: { ...p.payroll.tax, esi: v } } }))
                    }
                  />
                </div>
              </div>
            </Card>
          ) : null}

          {activeTab === "preferences" ? (
            <Card title="User preferences" description="Personal defaults for your account.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Theme mode">
                  <SelectWithIcon
                    icon={Palette}
                    value={model.preferences.theme_mode}
                    onChange={(e) =>
                      setModel((p) => ({ ...p, preferences: { ...p.preferences, theme_mode: e.target.value } }))
                    }
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </SelectWithIcon>
                  <p className="mt-1 text-xs text-slate-500">Theme switching is future-ready.</p>
                </Field>
                <Field label="Language">
                  <SelectWithIcon
                    icon={Globe}
                    value={model.preferences.language}
                    onChange={(e) =>
                      setModel((p) => ({ ...p, preferences: { ...p.preferences, language: e.target.value } }))
                    }
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </SelectWithIcon>
                </Field>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notifications
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Toggle
                    label="Email notifications"
                    icon={Bell}
                    checked={model.preferences.notifications.email}
                    onChange={(v) =>
                      setModel((p) => ({
                        ...p,
                        preferences: { ...p.preferences, notifications: { ...p.preferences.notifications, email: v } },
                      }))
                    }
                  />
                  <Toggle
                    label="In-app notifications"
                    icon={Bell}
                    checked={model.preferences.notifications.in_app}
                    onChange={(v) =>
                      setModel((p) => ({
                        ...p,
                        preferences: { ...p.preferences, notifications: { ...p.preferences.notifications, in_app: v } },
                      }))
                    }
                  />
                </div>
              </div>
            </Card>
          ) : null}

          {activeTab === "access" ? (
            <Card
              title="Access control (RBAC)"
              description="View role and permissions. Admins can manage enterprise policies."
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80">
                  <LockKeyhole className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  <span className="capitalize">Role: {role}</span>
                </div>
                {!isAdmin ? (
                  <p className="text-xs text-slate-500">
                    Permission management is available to admins.
                  </p>
                ) : null}
              </div>

              <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-[620px] w-full border-collapse">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Module</th>
                      <th className="px-4 py-3 text-center">View</th>
                      <th className="px-4 py-3 text-center">Create</th>
                      <th className="px-4 py-3 text-center">Edit</th>
                      <th className="px-4 py-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(model.access.permissions).map(([module, perms], idx) => (
                      <tr key={module} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 capitalize">{module}</td>
                        {["view", "create", "edit", "delete"].map((k) => (
                          <td key={k} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perms[k])}
                              disabled={!isAdmin}
                              onChange={(e) => {
                                const next = e.target.checked;
                                setModel((p) => ({
                                  ...p,
                                  access: {
                                    ...p.access,
                                    permissions: {
                                      ...p.access.permissions,
                                      [module]: { ...p.access.permissions[module], [k]: next },
                                    },
                                  },
                                }));
                              }}
                              className="h-4 w-4 accent-indigo-600"
                              aria-label={`${module} ${k}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-900/10 transition duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-[0.98] disabled:opacity-50"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
                <Cog className="h-4 w-4" aria-hidden />
              </span>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, icon: Icon, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition duration-200",
        checked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2 text-slate-700">
        {Icon ? <Icon className="h-4 w-4 text-slate-500" aria-hidden /> : null}
        {label}
      </span>
      <span
        className={[
          "relative inline-flex h-6 w-10 items-center rounded-full p-0.5 transition duration-200",
          checked ? "bg-emerald-600" : "bg-slate-300",
        ].join(" ")}
        aria-hidden
      >
        <span
          className={[
            "h-5 w-5 rounded-full bg-white shadow-sm transition duration-200",
            checked ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

