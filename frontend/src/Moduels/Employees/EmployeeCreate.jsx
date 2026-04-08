import { useState, useEffect, useRef } from "react";
import { createEmployee } from "./EmployeeApi";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";

// ─── StepIndicator ────────────────────────────────────────────────────────────
function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center w-full mb-8">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        const isDisabled = step.disabled;

        return (
          <div key={stepNum} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
                  ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200" : ""}
                  ${isActive ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 scale-110" : ""}
                  ${!isCompleted && !isActive && !isDisabled ? "bg-white border-gray-300 text-gray-400" : ""}
                  ${isDisabled ? "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed" : ""}
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-semibold tracking-wide whitespace-nowrap
                  ${isActive ? "text-indigo-600" : ""}
                  ${isCompleted ? "text-emerald-600" : ""}
                  ${!isActive && !isCompleted ? "text-gray-400" : ""}
                `}
              >
                {step.label}
              </span>
              {isDisabled && (
                <span className="mt-0.5 text-[10px] text-gray-300 font-medium">Soon</span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-18px] rounded transition-all duration-500 ${isCompleted ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── EmployeeHeaderPreview ────────────────────────────────────────────────────
function EmployeeHeaderPreview({ firstName, lastName, employeeCode }) {
  if (!firstName) return null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-fade-in">
      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {firstName[0]?.toUpperCase()}{lastName?.[0]?.toUpperCase() || ""}
      </div>
      <div>
        <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest">Creating Employee</p>
        <p className="text-base font-bold text-indigo-800">
          {fullName}
          {employeeCode && <span className="ml-2 text-sm text-indigo-400 font-medium">#{employeeCode}</span>}
        </p>
      </div>
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
function FormField({ label, error, children, required }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder-gray-300";
const selectCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition text-gray-700 appearance-none cursor-pointer";
const errorInputCls = "w-full border border-red-300 rounded-lg px-3 py-2.5 text-sm bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition placeholder-gray-300";

// ─── Step1BasicDetails ────────────────────────────────────────────────────────
function Step1BasicDetails({ form, handleChange, errors }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <FormField label="Employee Code">
        <input className={inputCls} name="employee_code" placeholder="e.g. EMP-001" value={form.employee_code} onChange={handleChange} />
      </FormField>

      <FormField label="First Name" required error={errors.first_name}>
        <input className={errors.first_name ? errorInputCls : inputCls} name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} required />
      </FormField>

      <FormField label="Middle Name">
        <input className={inputCls} name="middle_name" placeholder="Middle Name" value={form.middle_name} onChange={handleChange} />
      </FormField>

      <FormField label="Last Name">
        <input className={inputCls} name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} />
      </FormField>

      <FormField label="Display Name">
        <input className={inputCls} name="display_name" placeholder="Display Name" value={form.display_name} onChange={handleChange} />
      </FormField>

      <FormField label="Work Email">
        <input className={inputCls} type="email" name="work_email" placeholder="name@company.com" value={form.work_email} onChange={handleChange} />
      </FormField>

      <FormField label="Mobile Phone">
        <input className={inputCls} name="mobile_phone" placeholder="+91 98765 43210" value={form.mobile_phone} onChange={handleChange} />
      </FormField>

      <FormField label="Gender">
        <div className="relative">
          <select className={selectCls} name="gender" value={form.gender} onChange={handleChange}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
      </FormField>

      <FormField label="Date of Birth">
        <input className={inputCls} type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} />
      </FormField>

      <FormField label="Marital Status">
        <div className="relative">
          <select className={selectCls} name="marital_status" value={form.marital_status} onChange={handleChange}>
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
      </FormField>

      <FormField label="Father's Name">
        <input className={inputCls} name="fathers_name" placeholder="Father's Name" value={form.fathers_name} onChange={handleChange} />
      </FormField>
    </div>
  );
}

// ─── Step2Organization ────────────────────────────────────────────────────────
function Step2Organization({ form, handleChange, errors, departments, designations, locations, managers, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading organizational data…</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormField label="Department" required error={errors.department_id}>
        <div className="relative">
          <select
            className={errors.department_id ? `${selectCls} border-red-300 bg-red-50` : selectCls}
            name="department_id"
            value={form.department_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
        {errors.department_id && <p className="text-xs text-red-500 mt-0.5">{errors.department_id}</p>}
      </FormField>

      <FormField label="Designation" required error={errors.designation_id}>
        <div className="relative">
          <select
            className={errors.designation_id ? `${selectCls} border-red-300 bg-red-50` : selectCls}
            name="designation_id"
            value={form.designation_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Designation</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
        {errors.designation_id && <p className="text-xs text-red-500 mt-0.5">{errors.designation_id}</p>}
      </FormField>

      <FormField label="Location" required error={errors.location_id}>
        <div className="relative">
          <select
            className={errors.location_id ? `${selectCls} border-red-300 bg-red-50` : selectCls}
            name="location_id"
            value={form.location_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
        {errors.location_id && <p className="text-xs text-red-500 mt-0.5">{errors.location_id}</p>}
      </FormField>

      <FormField label="Reporting Manager">
        <div className="relative">
          <select className={selectCls} name="manager_id" value={form.manager_id} onChange={handleChange}>
            <option value="">Select Manager (Optional)</option>
            {managers.map((m) => (
              <option key={m.employee_id} value={m.employee_id}>
                {[m.first_name, m.last_name].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
      </FormField>

      <FormField label="Business Unit">
        <input className={inputCls} name="business_unit" placeholder="e.g. Engineering, Sales" value={form.business_unit} onChange={handleChange} />
      </FormField>
    </div>
  );
}

// ─── Step3Compensation ────────────────────────────────────────────────────────
function Step3Compensation({ form, handleChange, errors }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <FormField label="Date of Joining">
        <input className={inputCls} type="date" name="date_of_joining" value={form.date_of_joining} onChange={handleChange} />
      </FormField>

      <FormField label="Date of Leaving">
        <input className={inputCls} type="date" name="date_of_leaving" value={form.date_of_leaving} onChange={handleChange} />
      </FormField>

      <FormField label="Employee Status">
        <div className="relative">
          <select className={selectCls} name="status" value={form.status} onChange={handleChange}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
      </FormField>

      <FormField label="Annual CTC (₹)" error={errors.annual_ctc}>
        <div className="relative">
          <span className="absolute left-3 inset-y-0 flex items-center text-gray-400 text-sm font-medium">₹</span>
          <input
            className={`${errors.annual_ctc ? errorInputCls : inputCls} pl-7`}
            name="annual_ctc"
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 600000"
            value={form.annual_ctc}
            onChange={handleChange}
          />
        </div>
        {form.annual_ctc && !errors.annual_ctc && (
          <p className="text-xs text-emerald-600 font-medium mt-0.5">
            ≈ ₹{(parseFloat(form.annual_ctc) / 100000).toFixed(2)} LPA
          </p>
        )}
      </FormField>

      <FormField label="Pay Frequency">
        <div className="relative">
          <select className={selectCls} name="pay_frequency" value={form.pay_frequency} onChange={handleChange}>
            <option value="Monthly">Monthly</option>
            <option value="Weekly">Weekly</option>
            <option value="Bi-Weekly">Bi-Weekly</option>
            <option value="Quarterly">Quarterly</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
      </FormField>

      <FormField label="UAN Link Status">
        <div className="relative">
          <select className={selectCls} name="uan_link_status" value={form.uan_link_status} onChange={handleChange}>
            <option value="Unlinked">Unlinked</option>
            <option value="Linked">Linked</option>
            <option value="Pending">Pending</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
      </FormField>

      <FormField label="Active Status">
        <div className="relative">
          <select className={selectCls} name="is_active" value={form.is_active} onChange={handleChange}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">▾</div>
        </div>
      </FormField>
    </div>
  );
}

// ─── Step4Banking ─────────────────────────────────────────────────────────────
function Step4Banking() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-2">
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-300">Banking Details</h3>
      <p className="text-sm text-gray-400 max-w-xs">Banking information capture will be available in an upcoming release. You can add it after the employee is created.</p>
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Coming Soon
      </span>
    </div>
  );
}

// ─── EmployeeCreate (Main) ────────────────────────────────────────────────────
export default function EmployeeCreate() {
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [stepErrors, setStepErrors] = useState({});
  const navigate = useNavigate();

  const [form, setForm] = useState({
    employee_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    display_name: "",
    work_email: "",
    mobile_phone: "",
    gender: "",
    date_of_birth: "",
    marital_status: "",
    fathers_name: "",
    date_of_joining: "",
    date_of_leaving: "",
    status: "active",
    department_id: "",
    designation_id: "",
    location_id: "",
    business_unit: "",
    manager_id: "",
    pay_structure_id: "",
    annual_ctc: "",
    pay_frequency: "Monthly",
    uan_link_status: "Unlinked",
    is_active: "true",
  });

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [dept, des, loc, mgr] = await Promise.all([
          API.get("/setup/departments", { headers }),
          API.get("/setup/designations", { headers }),
          API.get("/setup/locations", { headers }),
          API.get("/employees", { headers }),
        ]);
        setDepartments(dept.data);
        setDesignations(des.data);
        setLocations(loc.data);
        setManagers(mgr.data || []);
      } catch (err) {
        console.error("Failed to fetch dropdown data:", err);
      } finally {
        setDropdownLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear field-level error on change
    if (stepErrors[e.target.name]) {
      setStepErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
    }
  };

  // ── Validate by step ──────────────────────────────────────────────────────
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!form.first_name.trim()) errors.first_name = "First name is required";
    }
    if (step === 2) {
      if (!form.department_id) errors.department_id = "Please select a department";
      if (!form.designation_id) errors.designation_id = "Please select a designation";
      if (!form.location_id) errors.location_id = "Please select a location";
    }
    if (step === 3) {
      if (form.annual_ctc && isNaN(parseFloat(form.annual_ctc))) {
        errors.annual_ctc = "Annual CTC must be a valid number";
      }
      if (form.annual_ctc && parseFloat(form.annual_ctc) < 0) {
        errors.annual_ctc = "Annual CTC cannot be negative";
      }
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors({});
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setStepErrors({});
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    const errors = validateStep(3);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      const payload = { ...form };

// ✅ FIX 1: map email correctly
if (!form.work_email) {
  setSubmitError("Email is required");
  setLoading(false);
  return;
}
payload.email = form.work_email;

// remove wrong field
delete payload.work_email;

// ✅ FIX 2: validate required fields
if (!payload.first_name) {
  setSubmitError("First name is required");
  setLoading(false);
  return;
}

if (!payload.date_of_birth) {
  setSubmitError("Date of birth is required");
  setLoading(false);
  return;
}

// type conversions
payload.annual_ctc = payload.annual_ctc ? parseFloat(payload.annual_ctc) : undefined;
payload.is_active = payload.is_active === "true";

// remove empty fields
Object.keys(payload).forEach((k) => {
  if (payload[k] === "" || payload[k] === null || payload[k] === undefined) {
    delete payload[k];
  }
});

      await createEmployee(payload);
      setSubmitSuccess(true);
    } catch (error) {
      console.error(error);
      setSubmitError("Something went wrong while creating the employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { label: "Basic Details" },
    { label: "Organization" },
    { label: "Compensation" },
    { label: "Banking", disabled: true },
  ];

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ");

  // ── Success Screen ────────────────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">All Done!</h2>
          <p className="text-gray-500 text-sm mb-1">
            <span className="font-semibold text-emerald-600">{fullName}</span> has been created successfully.
          </p>
          <p className="text-gray-400 text-xs mb-7">The employee record is now live in the system.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              ← Go Back
            </button>
            <button
              onClick={() => { setSubmitSuccess(false); setForm({ employee_code: "", first_name: "", middle_name: "", last_name: "", display_name: "", work_email: "", mobile_phone: "", gender: "", date_of_birth: "", marital_status: "", fathers_name: "", date_of_joining: "", date_of_leaving: "", status: "active", department_id: "", designation_id: "", location_id: "", business_unit: "", manager_id: "", pay_structure_id: "", annual_ctc: "", pay_frequency: "Monthly", uan_link_status: "Unlinked", is_active: "true" }); setCurrentStep(1); }}
              className="px-5 py-2.5 bg-indigo-600 rounded-lg text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              + Add Another Employee
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-full shadow-lg transition duration-300 flex items-center gap-2 z-50 text-sm font-semibold"
      >
        ← Back
      </button>

      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">New Employee</h1>
          <p className="text-sm text-gray-400 mt-1">Complete all steps to onboard a new team member</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <StepIndicator currentStep={currentStep} steps={steps} />

          {/* Identity Banner (steps 1–3) */}
          {currentStep <= 3 && (
            <EmployeeHeaderPreview
              firstName={form.first_name}
              lastName={form.last_name}
              employeeCode={form.employee_code}
            />
          )}

          {/* Step Content */}
          <div className="min-h-[320px]">
            {currentStep === 1 && (
              <Step1BasicDetails form={form} handleChange={handleChange} errors={stepErrors} />
            )}
            {currentStep === 2 && (
              <Step2Organization
                form={form}
                handleChange={handleChange}
                errors={stepErrors}
                departments={departments}
                designations={designations}
                locations={locations}
                managers={managers}
                loading={dropdownLoading}
              />
            )}
            {currentStep === 3 && (
              <Step3Compensation form={form} handleChange={handleChange} errors={stepErrors} />
            )}
            {currentStep === 4 && <Step4Banking />}
          </div>

          {/* Error Banner */}
          {submitError && (
            <div className="mt-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300 font-medium">Step {currentStep} of 4</span>
            </div>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm shadow-indigo-200"
              >
                Next →
              </button>
            ) : currentStep === 3 ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    ✓ Create Employee
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
