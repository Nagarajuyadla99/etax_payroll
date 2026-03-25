import { useEffect, useState } from "react";
import {
  getComponents,
  addTemplateComponent
} from "./SalaryApi";
import { useParams } from "react-router-dom";

export default function TemplateBuilder() {
  const { templateId } = useParams();

  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState("");

  const [calcMode, setCalcMode] = useState("percentage");
  const [percentage, setPercentage] = useState("");
  const [formula, setFormula] = useState("");
  const [base, setBase] = useState("ctc");

  useEffect(() => {
    loadComponents();
  }, []);

  async function loadComponents() {
    try {
      const data = await getComponents();
      setComponents(data);

      if (data.length > 0) {
        setSelectedComponent(data[0].component_id);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load components");
    }
  }

async function handleAdd() {
  try {
    const payload = {
      template_id: templateId,
      
      component_id: selectedComponent,
    };
    console.log("TEMPLATE ID FROM URL:", templateId);
    if (calcMode === "percentage") {
      if (percentage === "" || isNaN(Number(percentage))) {
        alert("Enter valid percentage");
        return;
      }

      payload.percentage = Number(percentage);
      payload.percentage_of = base || "ctc";
    }

    if (calcMode === "formula") {
      if (!formula.trim()) {
        alert("Enter valid formula");
        return;
      }

      payload.formula = formula.trim().toLowerCase();
    }

    // 🔥 DEBUG (VERY IMPORTANT)
    console.log("SENDING PAYLOAD:", payload);

    await addTemplateComponent(payload);

    alert("Component added");

    setPercentage("");
    setFormula("");

  } catch (err) {
  console.error("FULL ERROR:", err);

  if (err.response) {
    console.error("STATUS:", err.response.status);
    console.error("DATA:", err.response.data);
    console.error("FULL ERROR DATA:", JSON.stringify(err.response.data, null, 2));
    console.log("🔥 templateId:", templateId);
    alert(JSON.stringify(err.response.data));
  } else {
    console.error("NO RESPONSE:", err);
  }
}
}
  return (
    <div className="p-6">

      <h2 className="text-lg font-semibold mb-4">Template Builder</h2>

      <div className="flex gap-2 mb-4 items-center">

        {/* COMPONENT SELECT */}
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

        {/* MODE */}
        <select
          className="border p-2 rounded"
          value={calcMode}
          onChange={(e) => setCalcMode(e.target.value)}
        >
          <option value="percentage">%</option>
          <option value="formula">Formula</option>
        </select>

        {/* INPUT */}
        {calcMode === "percentage" ? (
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
        ) : (
          <input
            type="text"
            placeholder="e.g. ctc * 0.1"
            className="border p-2 rounded w-64"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
          />
        )}

        {/* BUTTON */}
        <button
          onClick={handleAdd}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>

      </div>

      {/* INFO */}
      <p className="text-sm text-gray-500">
        Use variables: ctc, basic, hra
      </p>

    </div>
  );
}