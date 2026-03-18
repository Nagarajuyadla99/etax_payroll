import { useEffect, useState } from "react";
import { getTemplates, createTemplate } from "./SalaryApi";
import { useNavigate } from "react-router-dom";

export default function SalaryTemplate() {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getTemplates();
    setTemplates(data);
  }

  async function handleCreate() {
    const tpl = await createTemplate({
      organisation_id: "23789067-370a-4a80-bc56-e0c1c54264aa",
      name
    });
    nav(`/salary/templates/${tpl.template_id}`);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Salary Templates</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="border p-2 rounded"
          placeholder="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={handleCreate}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>

        <tbody>
          {templates.map((t) => (
            <tr key={t.template_id}>
              <td className="p-2 border">{t.name}</td>

              <td className="p-2 border">
                <button
                  className="text-red-600"
                  onClick={() => nav(`/salary/templates/${t.template_id}`)}
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}