import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  createTemplate,
  getComponents,
  getTemplateComponents,
  addTemplateComponent,
  updateTemplateComponent,   // BUG FIX: was never imported; needed for duplicate update path
} from "./SalaryApi";

export default function TemplateBuilder() {
  const { id: templateId } = useParams();

  const navigate = useNavigate();
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState("");
  const [templateComponents, setTemplateComponents] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // BUG FIX: added "fixed" as a valid calcMode.
  // Without it, components whose master calc_type is "fixed" could never be
  // added via this UI — the payload would have no amount/percentage/formula
  // and hit the schema's 422 validator.
  const [calcMode, setCalcMode] = useState("percentage");
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState("");
  const [formula, setFormula] = useState("");
  const [base, setBase] = useState("ctc");

  useEffect(() => {
    loadComponents();
    // BUG FIX: templateComponents were never loaded from the server on mount.
    // Revisiting the page or refreshing always showed an empty table even when
    // components had been previously saved.
    if (templateId) loadTemplateComponents();
  }, [templateId]); // BUG FIX: templateId added to dep array (was [])

  async function loadComponents() {
    try {
      const data = await getComponents();
      setComponents(data);
      if (data.length > 0) setSelectedComponent(data[0].component_id);
    } catch (err) {
      console.error(err);
      alert("Failed to load components");
    }
  }

  async function loadTemplateComponents() {
    try {
      const data = await getTemplateComponents(templateId);
      setTemplateComponents(data);
    } catch (err) {
      console.error("Failed to load template components:", err);
    }
  }

  async function handleCreateTemplate() {
    if (!templateName.trim()) {
      setCreateError("Template name is required");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const data = await createTemplate({
        name: templateName.trim(),
        description: templateDesc.trim(),
      });

      // redirect to new template
      navigate(`/templates/${data.template_id}`);

      // reset modal
      setShowCreateModal(false);
      setTemplateName("");
      setTemplateDesc("");
    } catch (err) {
      setCreateError(err?.detail || "Failed to create template");
    } finally {
      setCreating(false);
    }
  }

  function getComponentName(id) {
    const comp = components.find((c) => c.component_id === id);
    return comp ? comp.name : id;
  }

  async function handleAdd() {
    try {
      if (!templateId) {
        alert("Invalid template ID");
        return;
      }
      if (!selectedComponent) {
        alert("Select a component");
        return;
      }

      const payload = {
        template_id: templateId,
        component_id: selectedComponent,
      };

      if (calcMode === "fixed") {
        const amt = Number(amount);
        if (!amount || isNaN(amt) || amt <= 0) {
          alert("Enter a valid fixed amount");
          return;
        }
        payload.amount = amt;
      } else if (calcMode === "percentage") {
        const pct = Number(percentage);
        if (!percentage || isNaN(pct) || pct <= 0) {
          alert("Enter a valid percentage");
          return;
        }
        payload.percentage = pct;
        payload.percentage_of = base || "ctc";
      } else if (calcMode === "formula") {
        if (!formula.trim()) {
          alert("Enter a valid formula");
          return;
        }
        payload.formula = formula.trim().toLowerCase();
      }

      const existing = templateComponents.find(
        (c) => c.component_id === selectedComponent
      );

      if (existing) {
        // BUG FIX: previously showed an alert and returned without doing
        // anything ("you currently DON'T have stc_id, so update won't work").
        // Now we call the PUT endpoint properly using the stc_id from the
        // server-loaded templateComponents list.
        const updatePayload = {
          amount: payload.amount ?? null,
          percentage: payload.percentage ?? null,
          percentage_of: payload.percentage_of ?? null,
          formula: payload.formula ?? null,
        };
        const updated = await updateTemplateComponent(existing.stc_id, updatePayload);
        setTemplateComponents((prev) =>
          prev.map((c) => (c.stc_id === existing.stc_id ? updated : c))
        );
        alert("Component updated");
      } else {
        const added = await addTemplateComponent(payload);
        // BUG FIX: was pushing the local payload object (no stc_id) into state.
        // Now we push the server response which contains stc_id — required for
        // future updates and as a stable React key.
        setTemplateComponents((prev) => [...prev, added]);
        alert("Component added");
      }

      // Reset inputs
      setAmount("");
      setPercentage("");
      setFormula("");
    } catch (err) {
      console.error("ERROR:", err.response?.data || err);
      alert(JSON.stringify(err.response?.data?.detail || err.message));
    }
  }

  if (!templateId) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Template Builder</h2>
          <button
            onClick={() => {
              setCreateError("");
              setShowCreateModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + Create Template
          </button>
        </div>

        <p className="text-gray-500 mt-4">
          No template selected. Please create a template first.
        </p>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded w-96">
              <h3 className="text-lg font-semibold mb-4">Create Template</h3>

              <input
                className="border p-2 w-full mb-3"
                placeholder="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />

              <input
                className="border p-2 w-full mb-3"
                placeholder="Description (optional)"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
              />

              {createError && (
                <p className="text-red-500 text-sm mb-2">{createError}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCreateTemplate}
                  disabled={creating}
                  className="bg-blue-600 text-white px-4 py-1 rounded"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Template Builder</h2>
        <button
          onClick={() => {
            setCreateError("");
            setShowCreateModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Create Template
        </button>
      </div>

      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <select
          className="border p-2 rounded"
          value={selectedComponent}
          onChange={(e) => setSelectedComponent(e.target.value)}
        >
          {components.map((c) => (
            <option key={c.component_id} value={c.component_id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* BUG FIX: added "Fixed ₹" option */}
        <select
          className="border p-2 rounded"
          value={calcMode}
          onChange={(e) => setCalcMode(e.target.value)}
        >
          <option value="fixed">Fixed ₹</option>
          <option value="percentage">%</option>
          <option value="formula">Formula</option>
        </select>

        {calcMode === "fixed" && (
          <input
            type="number"
            placeholder="Amount ₹"
            className="border p-2 rounded w-36"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}

        {calcMode === "percentage" && (
          <>
            <input
              type="number"
              placeholder="Enter %"
              className="border p-2 rounded w-28"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />
            <select
              className="border p-2 rounded"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            >
              <option value="ctc">CTC</option>
              <option value="basic">Basic</option>
            </select>
          </>
        )}

        {calcMode === "formula" && (
          <input
            type="text"
            placeholder="e.g. ctc * 0.1"
            className="border p-2 rounded w-64"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
          />
        )}

        <button
          onClick={handleAdd}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      <table className="w-full border mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Component</th>
            <th className="p-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          {templateComponents.length === 0 ? (
            <tr>
              <td colSpan="2" className="p-4 text-center text-gray-400">
                No components added yet
              </td>
            </tr>
          ) : (
            templateComponents.map((item) => (
              // BUG FIX: was key={index} — an unstable key that breaks React's
              // reconciliation when items are reordered or removed.
              // stc_id is the correct stable unique key from the server.
              <tr key={item.stc_id} className="border-t">
                <td className="p-2">{getComponentName(item.component_id)}</td>
                <td className="p-2">
                  {item.amount != null && `₹ ${item.amount}`}
                  {item.percentage != null &&
                    `${item.percentage}% of ${item.percentage_of}`}
                  {item.formula && item.formula}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="text-lg font-semibold mb-4">Create Template</h3>

            <input
              className="border p-2 w-full mb-3"
              placeholder="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />

            <input
              className="border p-2 w-full mb-3"
              placeholder="Description (optional)"
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
            />

            {createError && (
              <p className="text-red-500 text-sm mb-2">{createError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateTemplate}
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-1 rounded"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
