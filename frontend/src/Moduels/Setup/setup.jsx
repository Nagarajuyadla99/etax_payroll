import { useEffect, useState } from "react";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function Setup() {
  const navigate = useNavigate();
  const [checkingSetup, setCheckingSetup] = useState(true);

  const [saved, setSaved] = useState({
    departments: [],
    designations: [],
    locations: [],
  });

  const [drafts, setDrafts] = useState({
    departments: "",
    designations: "",
    locations: "",
  });

  const [inputVisible, setInputVisible] = useState({
    departments: true,
    designations: true,
    locations: true,
  });

  const [manager, setManager] = useState({ name: "", email: "" });

  const [errors, setErrors] = useState({
    departments: "",
    designations: "",
    locations: "",
    manager_name: "",
    manager_email: "",
  });

  const clearError = (field) =>
    setErrors((prev) => ({ ...prev, [field]: "" }));

  const handleSave = (field) => {
    const val = drafts[field].trim();
    if (!val) return;
    setSaved((prev) => ({ ...prev, [field]: [...prev[field], val] }));
    setDrafts((prev) => ({ ...prev, [field]: "" }));
    setInputVisible((prev) => ({ ...prev, [field]: false }));
    clearError(field);
  };

  const handleCancel = (field) => {
    setDrafts((prev) => ({ ...prev, [field]: "" }));
    if (saved[field].length > 0) {
      setInputVisible((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleRemove = (field, index) => {
    setSaved((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const showInput = (field) => {
    setInputVisible((prev) => ({ ...prev, [field]: true }));
    setTimeout(() => {
      const el = document.getElementById(`input-${field}`);
      if (el) el.focus();
    }, 50);
  };

  /** Merge typed-but-not-committed draft lines into lists (Enter is optional). */
  const mergedLists = () => {
    const mergeField = (field) => {
      const extra = drafts[field].trim();
      return extra ? [...saved[field], extra] : [...saved[field]];
    };
    return {
      departments: mergeField("departments"),
      designations: mergeField("designations"),
      locations: mergeField("locations"),
    };
  };

  const validate = (lists) => {
    const newErrors = {
      departments: "",
      designations: "",
      locations: "",
      manager_name: "",
      manager_email: "",
    };
    let isValid = true;

    if (lists.departments.length === 0) {
      newErrors.departments = "Please add at least one department.";
      isValid = false;
    }
    if (lists.designations.length === 0) {
      newErrors.designations = "Please add at least one designation.";
      isValid = false;
    }
    if (lists.locations.length === 0) {
      newErrors.locations = "Please add at least one location.";
      isValid = false;
    }
    if (!manager.name.trim()) {
      newErrors.manager_name = "Full name is required.";
      isValid = false;
    }
    if (!manager.email.trim()) {
      newErrors.manager_email = "Work email is required.";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manager.email.trim())) {
      newErrors.manager_email = "Please enter a valid email address.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get("/users/me");
        const isSetupComplete = !!res?.data?.organisation?.is_setup_complete;
        if (!cancelled && isSetupComplete) {
          alert("Setup already completed");
          navigate("/employeeCreate", { replace: true });
        }
      } catch {}
      finally {
        if (!cancelled) setCheckingSetup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async () => {
    const lists = mergedLists();
    if (!validate(lists)) return;

    const payload = {
      departments: lists.departments,
      designations: lists.designations,
      locations: lists.locations,
      manager: { name: manager.name.trim(), email: manager.email.trim() },
    };

    try {
      await API.post("/setup/", payload);
      alert("Setup Completed");
      navigate("/employeeCreate");
    } catch (err) {
      console.error(err);
      const detail = err?.response?.data?.detail;
      if (detail === "Already setup completed") {
        alert("Setup already completed");
        navigate("/employeeCreate", { replace: true });
        return;
      }
      alert(detail || "Setup failed");
    }
  };

  const inputClass =
    "w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400";

  const inputErrorClass =
    "w-full px-4 py-3 text-sm border border-red-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300";

  const sectionCard = "bg-white border border-gray-100 rounded-xl shadow-sm p-6 mb-4";
  const sectionLabel = "text-sm font-semibold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2";

  const Star = () => <span className="text-red-500 ml-0.5">*</span>;

  const ErrorMsg = ({ msg }) =>
    msg ? <p className="text-xs text-red-500 mt-1.5">⚠ {msg}</p> : null;

  const renderArraySection = (field, placeholder, singularLabel) => {
    const hasSaved = saved[field].length > 0;
    const showInputRow = inputVisible[field];
    const hasError = !!errors[field];

    return (
      <div className={`bg-white border rounded-xl p-6 mb-4 ${hasError ? "border-red-300" : "border-gray-100"}`}>
        <p className={sectionLabel}>
          {field.toUpperCase()} <Star />
        </p>

        <ErrorMsg msg={errors[field]} />

        {hasSaved && (
          <div className="flex flex-wrap gap-2 mt-3 mb-3">
            {saved[field].map((item, i) => (
              <span key={i} className="bg-indigo-50 px-3 py-1 rounded">
                {item}
                <button onClick={() => handleRemove(field, i)}>✕</button>
              </span>
            ))}
          </div>
        )}

        {showInputRow && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id={`input-${field}`}
              className={`${hasError ? inputErrorClass : inputClass} sm:flex-1`}
              placeholder={placeholder}
              value={drafts[field]}
              onChange={(e) => setDrafts({ ...drafts, [field]: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSave(field))}
            />
            <button
              type="button"
              onClick={() => handleSave(field)}
              disabled={!drafts[field].trim()}
              className="shrink-0 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Add
            </button>
          </div>
        )}

        {hasSaved && !showInputRow && (
          <button onClick={() => showInput(field)}>+ Add {singularLabel}</button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pt-10 px-6">
      <div className="w-full max-w-2xl">

        <h2 className="text-2xl font-bold mb-6">Initial Setup</h2>

        {renderArraySection("departments", "Engineering, HR...", "department")}
        {renderArraySection("designations", "Manager, Engineer...", "designation")}
        {renderArraySection("locations", "Mumbai, Remote...", "location")}

        <div className={sectionCard}>
          <p className={sectionLabel}>Admin Employee</p>

          <input
            className={errors.manager_name ? inputErrorClass : inputClass}
            placeholder="Full Name"
            value={manager.name}
            onChange={(e) => setManager({ ...manager, name: e.target.value })}
          />
          <ErrorMsg msg={errors.manager_name} />

          <input
            className={`${errors.manager_email ? inputErrorClass : inputClass} mt-3`}
            placeholder="Email"
            value={manager.email}
            onChange={(e) => setManager({ ...manager, email: e.target.value })}
          />
          <ErrorMsg msg={errors.manager_email} />

          <p className="text-xs text-gray-400 mt-4">
            <span className="text-red-500">*</span> indicates mandatory fields
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={checkingSetup}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl mt-4"
        >
          {checkingSetup ? "Checking setup…" : "Complete Setup →"}
        </button>
      </div>
    </div>
  );
}