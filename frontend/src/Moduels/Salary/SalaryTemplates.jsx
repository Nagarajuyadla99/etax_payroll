import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTemplates } from "./SalaryApi";

export default function SalaryTemplates() {
  const [templates, setTemplates] = useState([]);
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

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Salary Templates</h2>

      {templates.map((t) => (
        <div
          key={t.template_id}
          onClick={() => navigate(`/salary/templates/${t.template_id}`)}
          className="p-3 border mb-2 cursor-pointer hover:bg-gray-100"
        >
          {t.name}
        </div>
      ))}
    </div>
  );
}