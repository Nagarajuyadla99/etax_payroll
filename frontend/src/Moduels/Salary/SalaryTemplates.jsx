import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTemplate, getTemplates } from "./SalaryApi";

export default function SalaryTemplates() {
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreate() {
    if (!templateName.trim()) {
      setError("Template name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await createTemplate({
        name: templateName.trim(),
        description: templateDesc.trim(),
      });

      await loadTemplates();

      setShowModal(false);
      setTemplateName("");
      setTemplateDesc("");

      navigate(`/salary/templates/${data.template_id}`);
    } catch (err) {
      setError(err?.detail || "Failed to create template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Salary Templates</h2>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create Template
        </button>
      </div>

      {templates.map((t) => (
        <div
          key={t.template_id}
          onClick={() => navigate(`/salary/templates/${t.template_id}`)}
          className="p-3 border mb-2 cursor-pointer hover:bg-gray-100"
        >
          {t.name}
        </div>
      ))}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Create Template</h3>

            <input
              className="border p-2 w-full mb-3 rounded"
              placeholder="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />

            <input
              className="border p-2 w-full mb-3 rounded"
              placeholder="Description (optional)"
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
            />

            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-1 rounded"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}