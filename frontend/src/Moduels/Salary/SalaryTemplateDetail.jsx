import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { addTemplateComponent, getComponents, getTemplateComponents } from "./SalaryApi";

export default function SalaryTemplateDetail() {
  const { id } = useParams();

  const [components, setComponents] = useState([]);
  const [componentId, setComponentId] = useState("");
  const [amount, setAmount] = useState("");
  const [templateComponents, setTemplateComponents] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // BUG FIX: guard on id — without this, both calls fire with id=undefined
    // on the initial render before the router has resolved the param, causing
    // immediate 422/404 errors in the network tab.
    if (!id) return;
    loadComponents();
    loadTemplateComponents();
  }, [id]);

  async function loadComponents() {
    try {
      const data = await getComponents();
      setComponents(data);
    } catch (err) {
      console.error("Failed to load components:", err);
    }
  }

  async function loadTemplateComponents() {
    try {
      const data = await getTemplateComponents(id);
      setTemplateComponents(data);
    } catch (err) {
      console.error("Failed to load template components:", err);
    }
  }

  async function handleAdd() {
    if (!componentId) {
      alert("Select a component");
      return;
    }

    // BUG FIX: was `amount ? Number(amount) : 0`.
    // Decimal("0") / Number(0) is not None in Python, so it passed the Pydantic
    // `has_amount = self.amount is not None` check and created a broken ₹0
    // component. Now we reject empty/zero input before the API call.
    const parsedAmount = amount !== "" ? Number(amount) : null;
    if (parsedAmount === null || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Enter a valid positive amount");
      return;
    }

    const payload = {
      template_id: id,
      component_id: componentId,
      amount: parsedAmount,
      sequence: 1,
    };

    // BUG FIX: no try/catch — any API error (422, 400, network) resulted in an
    // unhandled promise rejection with no user feedback.
    try {
      setSubmitting(true);
      await addTemplateComponent(payload);
      alert("Component added");
      setAmount("");
      setComponentId("");
      // Refresh from server so the table reflects the actual saved state
      await loadTemplateComponents();
    } catch (err) {
      console.error("Failed to add component:", err);
      alert(err?.response?.data?.detail || "Failed to add component");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Template Builder</h1>

      <div className="flex gap-2 mb-6">
        <select
          className="border p-2 rounded"
          value={componentId}
          onChange={(e) => setComponentId(e.target.value)}
        >
          <option value="">Select Component</option>
          {components.map((c) => (
            <option key={c.component_id} value={c.component_id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* BUG FIX: added type="number" so non-numeric input is rejected at
            the browser level before it reaches Number() parsing. */}
        <input
          className="border p-2 rounded"
          placeholder="Amount"
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          onClick={handleAdd}
          disabled={submitting}
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Component</th>
            <th className="border p-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {templateComponents.map((c) => {
            const comp = components.find((x) => x.component_id === c.component_id);
            return (
              <tr key={c.stc_id}>
                {/* BUG FIX: fall back to c.component_id if comp not yet loaded */}
                <td className="border p-2">{comp?.name ?? c.component_id}</td>
                <td className="border p-2">{c.amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
