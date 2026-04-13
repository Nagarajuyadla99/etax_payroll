import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Hash,
  Layers,
  Lock,
  Package,
  Pencil,
  Percent,
  Plus,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { AuthContext } from "../Context/AuthContext";
import { normalizeApiError } from "../../utils/normalizeApiError";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { InputWithIcon, SelectWithIcon } from "../../components/ui/FieldWithIcon";
import { ToastStack, useToastStack } from "../../components/ui/ToastStack";
import { createComponent, getComponents, updateComponent } from "./SalaryApi";

function emptyForm() {
  return {
    name: "",
    code: "",
    component_type: "earning",
    calc_type: "fixed",
  };
}

function calcIcon(calcType) {
  switch (calcType) {
    case "percentage":
      return Percent;
    case "formula":
      return Calculator;
    case "fixed":
    default:
      return Lock;
  }
}

function TypeBadge({ componentType }) {
  const isDeduction = componentType === "deduction";
  const Icon = isDeduction ? TrendingDown : TrendingUp;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors duration-200",
        isDeduction
          ? "bg-rose-50 text-rose-800 ring-rose-100"
          : "bg-emerald-50 text-emerald-800 ring-emerald-100",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      <span className="capitalize">{componentType || "—"}</span>
    </span>
  );
}

function CalculationCell({ calcType }) {
  const Icon = calcIcon(calcType);
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-700">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </span>
      <span className="capitalize">{calcType || "—"}</span>
    </span>
  );
}

function TableSkeleton({ colSpan }) {
  return (
    <tbody className="divide-y divide-slate-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3">
            <div className="h-4 max-w-[12rem] rounded bg-slate-200" style={{ width: "75%" }} />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-16 rounded bg-slate-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-7 w-24 rounded-full bg-slate-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-7 w-28 rounded bg-slate-200" />
          </td>
          {colSpan > 4 ? (
            <td className="px-4 py-3">
              <div className="ml-auto h-9 w-20 rounded-lg bg-slate-200" />
            </td>
          ) : null}
        </tr>
      ))}
    </tbody>
  );
}

export default function SalaryComponents() {
  const { role: authRole } = useContext(AuthContext);
  const role = (authRole || "").toLowerCase();
  const isAdmin = role === "admin";
  const isHr = role === "hr";
  const canCreate = isAdmin;
  const canEditDelete = isAdmin || isHr;

  const { toasts, addToast, removeToast } = useToastStack();

  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);

  const [form, setForm] = useState(() => emptyForm());
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setListError(null);
      const data = await getComponents();
      setComponents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load components:", err);
      setListError(normalizeApiError(err));
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeComponents = useMemo(
    () => components.filter((c) => c.is_active !== false),
    [components]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = activeComponents;
    if (q) {
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.code || "").toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((c) => c.component_type === typeFilter);
    }
    return list;
  }, [activeComponents, search, typeFilter]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      addToast("Component name is required", "error");
      return;
    }
    try {
      setSaving(true);
      await createComponent({ ...form });
      setForm(emptyForm());
      await load();
      addToast("Salary component created successfully", "success");
    } catch (err) {
      addToast(normalizeApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    setEditing(row);
    setEditForm({
      name: row.name || "",
      code: row.code || "",
      component_type: row.component_type || "earning",
      calc_type: row.calc_type || "fixed",
    });
  };

  const handleEditSave = async () => {
    if (!editing) return;
    if (!editForm.name.trim()) {
      addToast("Component name is required", "error");
      return;
    }
    try {
      setEditSaving(true);
      await updateComponent(editing.component_id, { ...editForm });
      setEditing(null);
      await load();
      addToast("Salary component updated successfully", "success");
    } catch (err) {
      addToast(normalizeApiError(err), "error");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await updateComponent(deleteTarget.component_id, { is_active: false });
      setDeleteTarget(null);
      await load();
      addToast("Salary component removed", "success");
    } catch (err) {
      addToast(normalizeApiError(err), "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const colSpan = canEditDelete ? 5 : 4;

  const showEmpty = !loading && filteredRows.length === 0 && activeComponents.length === 0;
  const showNoMatches =
    !loading && filteredRows.length === 0 && activeComponents.length > 0;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <ToastStack toasts={toasts} onRemove={removeToast} />

      <header className="mb-6 flex flex-col gap-2 sm:mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Salary components
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Define earnings and deductions used in salary templates.{" "}
              {isHr && !isAdmin ? (
                <span className="text-slate-500">You can edit or archive components.</span>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      {listError ? (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      {/* Toolbar: search + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <InputWithIcon
          icon={Search}
          type="search"
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code…"
          aria-label="Search salary components"
          className="w-full sm:max-w-xs"
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <SelectWithIcon
            icon={Layers}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by component type"
            className="w-full sm:w-44"
          >
            <option value="all">All types</option>
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
          </SelectWithIcon>
        </div>
      </div>

      {/* Create form — admin only */}
      {canCreate ? (
        <section className="mb-6 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition-shadow duration-200 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Package className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Add component</h2>
              <p className="text-xs text-slate-500">Creates a new reusable salary line item.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <InputWithIcon
              icon={Tag}
              name="name"
              value={form.name}
              placeholder="Component name"
              onChange={handleChange}
              autoComplete="off"
            />
            <InputWithIcon
              icon={Hash}
              name="code"
              value={form.code}
              placeholder="Code (optional)"
              onChange={handleChange}
              autoComplete="off"
            />
            <SelectWithIcon
              icon={TrendingUp}
              name="component_type"
              value={form.component_type}
              onChange={handleChange}
            >
              <option value="earning">Earning</option>
              <option value="deduction">Deduction</option>
            </SelectWithIcon>
            <SelectWithIcon
              icon={Lock}
              name="calc_type"
              value={form.calc_type}
              onChange={handleChange}
            >
              <option value="fixed">Fixed</option>
              <option value="percentage">Percentage</option>
              <option value="formula">Formula</option>
            </SelectWithIcon>
          </div>

          <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || saving}
              className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-900/10 transition duration-200 ease-out hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
            >
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Add component
            </button>
          </div>
        </section>
      ) : null}

      {/* Table card */}
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Calculation</th>
                {canEditDelete ? (
                  <th className="px-4 py-3 text-right">Actions</th>
                ) : null}
              </tr>
            </thead>

            {loading ? (
              <TableSkeleton colSpan={colSpan} />
            ) : showEmpty ? (
              <tbody>
                <tr>
                  <td colSpan={colSpan} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200/80">
                        <Package className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                      </span>
                      <p className="text-base font-medium text-slate-800">No salary components found</p>
                      <p className="text-sm text-slate-500">
                        {canCreate
                          ? "Create your first component using the form above."
                          : "Components will appear here once an administrator adds them."}
                      </p>
                      {canCreate ? (
                        <button
                          type="button"
                          onClick={() => {
                            document.querySelector('input[name="name"]')?.focus?.();
                          }}
                          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]"
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                          Add component
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : showNoMatches ? (
              <tbody>
                <tr>
                  <td colSpan={colSpan} className="px-6 py-12 text-center text-sm text-slate-600">
                    No components match your search or filters.
                    <button
                      type="button"
                      className="ml-2 font-medium text-indigo-600 underline-offset-2 hover:underline"
                      onClick={() => {
                        setSearch("");
                        setTypeFilter("all");
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((c, index) => (
                  <tr
                    key={c.component_id}
                    className={[
                      "transition-colors duration-200 ease-out",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                      "hover:bg-indigo-50/50",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.code || "—"}</td>
                    <td className="px-4 py-3">
                      <TypeBadge componentType={c.component_type} />
                    </td>
                    <td className="px-4 py-3">
                      <CalculationCell calcType={c.calc_type} />
                    </td>
                    {canEditDelete ? (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition duration-200 hover:scale-105 hover:bg-white hover:text-indigo-700 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35"
                            title="Edit"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition duration-200 hover:scale-105 hover:bg-red-50 hover:text-red-700 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                            title="Remove"
                            aria-label={`Remove ${c.name}`}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </section>

      {/* Edit modal */}
      {editing ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-component-title"
          onClick={() => !editSaving && setEditing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-5 shadow-xl transition duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-component-title" className="text-lg font-semibold text-slate-900">
              Edit component
            </h2>
            <p className="mt-1 text-sm text-slate-500">Update fields and save changes.</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                <InputWithIcon
                  icon={Tag}
                  name="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Code</label>
                <InputWithIcon
                  icon={Hash}
                  name="edit-code"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                <SelectWithIcon
                  icon={TrendingUp}
                  value={editForm.component_type}
                  onChange={(e) => setEditForm({ ...editForm, component_type: e.target.value })}
                >
                  <option value="earning">Earning</option>
                  <option value="deduction">Deduction</option>
                </SelectWithIcon>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Calculation</label>
                <SelectWithIcon
                  icon={Lock}
                  value={editForm.calc_type}
                  onChange={(e) => setEditForm({ ...editForm, calc_type: e.target.value })}
                >
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percentage</option>
                  <option value="formula">Formula</option>
                </SelectWithIcon>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:opacity-50"
                onClick={() => setEditing(null)}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
                onClick={handleEditSave}
                disabled={editSaving}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this component?"
        message={
          deleteTarget
            ? `“${deleteTarget.name}” will be hidden from new assignments. Existing templates may still reference it.`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        danger
        loading={deleteLoading}
        onCancel={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
