import { useEffect, useMemo, useState } from "react";
import { v2AddGroupItem, v2CreateGroup, v2GetGroup, v2ListComponents, v2ListGroupItems, v2ListGroups } from "./SalaryApiV2";
import { useToast } from "../../Context/ToastContext";

function toErr(e, fallback) {
  return e?.detail || e?.message || fallback;
}

export default function SalaryV2Groups() {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedCreate, setSubmittedCreate] = useState(false);

  const [createForm, setCreateForm] = useState({ code: "", name: "", description: "" });
  const [creating, setCreating] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [itemForm, setItemForm] = useState({ component_id: "", sequence: 1 });
  const [addingItem, setAddingItem] = useState(false);
  const [submittedItem, setSubmittedItem] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [g, c] = await Promise.all([v2ListGroups(), v2ListComponents()]);
      setGroups(Array.isArray(g) ? g : []);
      setComponents(Array.isArray(c) ? c : []);
    } catch (e) {
      setError(toErr(e, "Failed to load groups/components"));
    } finally {
      setLoading(false);
    }
  }

  async function loadGroup(groupId) {
    if (!groupId) {
      setSelectedGroup(null);
      return;
    }
    try {
      setError("");
      const [g, items] = await Promise.all([v2GetGroup(groupId), v2ListGroupItems(groupId)]);

      const itemsArr = Array.isArray(items) ? items : [];
      const compMap = new Map((components || []).map((c) => [c.component_id, c]));
      const hydrated = itemsArr.map((it) => ({
        ...it,
        component: compMap.get(it.component_id) || null,
      }));

      setSelectedGroup({ ...g, items: hydrated });
    } catch (e) {
      setError(toErr(e, "Failed to load group"));
      setSelectedGroup(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadGroup(selectedGroupId);
  }, [selectedGroupId]);

  const canCreate = createForm.code.trim() && createForm.name.trim();
  const canAddItem = selectedGroupId && itemForm.component_id;

  const componentOptions = useMemo(() => {
    return components
      .slice()
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""))
      .map((c) => ({ value: c.component_id, label: `${c.code} — ${c.name}` }));
  }, [components]);

  async function onCreateGroup() {
    if (!canCreate) return;
    try {
      setCreating(true);
      setSubmittedCreate(true);
      setError("");
      await v2CreateGroup({
        code: createForm.code.trim().toUpperCase(),
        name: createForm.name.trim(),
        description: createForm.description?.trim() || null,
      });
      setCreateForm({ code: "", name: "", description: "" });
      setSubmittedCreate(false);
      toast.success("Group created.");
      await load();
    } catch (e) {
      setError(toErr(e, "Failed to create group"));
      toast.error(toErr(e, "Failed to create group"));
    } finally {
      setCreating(false);
    }
  }

  async function onAddItem() {
    if (!canAddItem) return;
    try {
      setAddingItem(true);
      setSubmittedItem(true);
      setError("");
      await v2AddGroupItem(selectedGroupId, {
        component_id: itemForm.component_id,
        sequence: Number(itemForm.sequence || 1),
      });
      setItemForm({ component_id: "", sequence: (Number(itemForm.sequence || 1) || 1) + 1 });
      setSubmittedItem(false);
      toast.success("Item added.");
      await loadGroup(selectedGroupId);
    } catch (e) {
      setError(toErr(e, "Failed to add item"));
      toast.error(toErr(e, "Failed to add item"));
    } finally {
      setAddingItem(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <div className="min-w-0 flex-1 break-words">{String(error)}</div>
          <button
            type="button"
            onClick={load}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 p-3">
          <h2 className="text-sm font-semibold text-slate-900">Create group</h2>
          <p className="mt-1 text-xs text-slate-500">
            Example PF group code: <span className="font-semibold">PF_GROUP</span>
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Code</label>
              <input
                className={[
                  "w-full rounded-lg border px-3 py-2 text-sm",
                  submittedCreate && !createForm.code.trim() ? "border-red-300" : "border-slate-200",
                ].join(" ")}
                value={createForm.code}
                onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="PF_GROUP"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
              <input
                className={[
                  "w-full rounded-lg border px-3 py-2 text-sm",
                  submittedCreate && !createForm.name.trim() ? "border-red-300" : "border-slate-200",
                ].join(" ")}
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Provident Fund"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onCreateGroup}
              disabled={!canCreate || creating}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Groups</h2>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Select group</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">—</option>
              {groups
                .slice()
                .sort((a, b) => (a.code || "").localeCompare(b.code || ""))
                .map((g) => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.code} — {g.name}
                  </option>
                ))}
            </select>
          </div>

          {selectedGroup ? (
            <>
              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <div>
                  <span className="font-semibold">Code:</span> {selectedGroup.code}
                </div>
                <div>
                  <span className="font-semibold">Group ID:</span>{" "}
                  <span className="font-mono">{selectedGroup.group_id}</span>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-900">Add item</h3>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">Component</label>
                    <select
                      className={[
                        "w-full rounded-lg border px-3 py-2 text-sm",
                        submittedItem && !itemForm.component_id ? "border-red-300" : "border-slate-200",
                      ].join(" ")}
                      value={itemForm.component_id}
                      onChange={(e) => setItemForm((p) => ({ ...p, component_id: e.target.value }))}
                    >
                      <option value="">Select component…</option>
                      {componentOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Sequence</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={itemForm.sequence}
                      onChange={(e) => setItemForm((p) => ({ ...p, sequence: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={onAddItem}
                    disabled={!canAddItem || addingItem}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {addingItem ? "Adding..." : "Add item"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-900">Group items</h3>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-[680px] w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Sequence</th>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Component ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedGroup.items || [])
                        .slice()
                        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                        .map((it) => (
                          <tr key={it.id}>
                            <td className="px-3 py-2 text-slate-700">{it.sequence}</td>
                            <td className="px-3 py-2 font-medium text-slate-900">{it.component?.code}</td>
                            <td className="px-3 py-2 text-slate-700">{it.component?.name}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-600">{it.component_id}</td>
                          </tr>
                        ))}
                      {(selectedGroup.items || []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                            <div className="space-y-1">
                              <div>No items in this group yet.</div>
                              <div className="text-xs text-slate-400">
                                Tip: for <span className="font-semibold">PF_GROUP</span>, add{" "}
                                <span className="font-semibold">EMP_PF</span> as sequence 1.
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 text-xs text-slate-500">
              No group selected. Create a group (e.g. <span className="font-semibold">PF_GROUP</span>) and then select it to add items.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

