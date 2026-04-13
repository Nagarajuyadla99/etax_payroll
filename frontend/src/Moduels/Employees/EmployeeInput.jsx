import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import { createEmployee } from "./EmployeeApi";

import DynamicEmployeeForm from "./components/DynamicEmployeeForm";
import EmployeeBulkUploadUnified from "./EmployeeBulkUploadUnified";
import EmployeeExampleSheet from "./components/EmployeeExampleSheet";
import HowToUploadGuide from "./components/HowToUploadGuide";
import { coerceEmployeeRecord, validateEmployeeRecord } from "./employeeValidation";

function Tab({ active, onClick, title, desc }) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-4 py-3 rounded-xl border transition w-full md:w-auto ${
        active
          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      <div className="font-bold text-sm">{title}</div>
      <div className={`text-xs mt-0.5 ${active ? "text-white/80" : "text-slate-500"}`}>{desc}</div>
    </button>
  );
}

export default function EmployeeInput() {
  const [tab, setTab] = useState("single"); // single | bulk
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [lookups, setLookups] = useState({
    departments: [],
    designations: [],
    locations: [],
  });

  const [form, setForm] = useState({
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    department_id: "",
    designation_id: "",
    location_id: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    setLoadingLookups(true);
    Promise.all([
      API.get("/setup/departments", { headers }),
      API.get("/setup/designations", { headers }),
      API.get("/setup/locations", { headers }),
    ])
      .then(([d, des, loc]) => {
        setLookups({
          departments: d.data || [],
          designations: des.data || [],
          locations: loc.data || [],
        });
      })
      .catch((e) => {
        console.error(e);
        setLookups({ departments: [], designations: [], locations: [] });
      })
      .finally(() => setLoadingLookups(false));
  }, []);

  const singleErrors = useMemo(
    () => validateEmployeeRecord(form, { mode: "single", lookups }),
    [form, lookups]
  );

  const handleCreate = async () => {
    setSaveOk(false);
    setSaveError("");

    const coerced = coerceEmployeeRecord(form, { lookups });
    const errors = validateEmployeeRecord(coerced, { mode: "single", lookups });
    if (Object.keys(errors).length > 0) {
      setSaveError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      await createEmployee(coerced);
      setSaveOk(true);
      setForm({
        employee_code: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        department_id: "",
        designation_id: "",
        location_id: "",
      });
    } catch (e) {
      console.error(e);
      setSaveError("Failed to create employee. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Employee Input</h1>
            <p className="text-sm text-slate-500 mt-1">
              Single employee and bulk upload share the same schema and validation rules.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Tab
              active={tab === "single"}
              onClick={() => setTab("single")}
              title="Single Employee"
              desc="Create one employee with guided validation"
            />
            <Tab
              active={tab === "bulk"}
              onClick={() => setTab("bulk")}
              title="Bulk Upload"
              desc="Upload CSV/XLSX with mapping and preview"
            />
          </div>
        </div>

        {loadingLookups && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <div>
              <p className="font-bold text-slate-900">Loading setup data…</p>
              <p className="text-sm text-slate-500">Departments, designations and locations power the dropdowns and bulk mapping.</p>
            </div>
          </div>
        )}

        {!loadingLookups && tab === "single" && (
          <>
            <DynamicEmployeeForm
              value={form}
              onChange={(next) => {
                setSaveOk(false);
                setSaveError("");
                setForm(next);
              }}
              mode="single"
              lookups={lookups}
              disabled={saving}
            />

            {saveError && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
                {saveError}
              </div>
            )}
            {saveOk && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
                Employee created successfully.
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setForm({ employee_code: "", first_name: "", last_name: "", email: "", phone: "", date_of_birth: "", department_id: "", designation_id: "", location_id: "" })}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={saving}
              >
                Reset
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || Object.keys(singleErrors).length > 0}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Creating…" : "Create Employee"}
              </button>
            </div>
          </>
        )}

        {!loadingLookups && tab === "bulk" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <HowToUploadGuide />
              <EmployeeExampleSheet />
            </div>
            <EmployeeBulkUploadUnified lookups={lookups} />
          </>
        )}
      </div>
    </div>
  );
}

