export default function HowToUploadGuide() {
  const steps = [
    { title: "Download sample", body: "Use the sample CSV/XLSX so headers match the system schema." },
    { title: "Fill data", body: "Add employees row-by-row. Keep formats consistent (email, phone, YYYY-MM-DD dates)." },
    { title: "Upload file", body: "Drag & drop your CSV/XLSX. We’ll auto-map columns when headers match." },
    { title: "Preview & confirm", body: "Fix row-wise errors. Valid rows can still be submitted even if some rows fail." },
  ];

  const mistakes = [
    { title: "Missing headers", body: "First row must contain column headers like `employee_code`, `first_name`, `email`." },
    { title: "Invalid email format", body: "Example: `name@company.com` (avoid spaces or missing domain)." },
    { title: "Duplicate employee_code", body: "Employee codes must be unique within the organisation." },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="text-base font-bold text-slate-900">How to Upload</h3>
      <p className="text-sm text-slate-500 mt-1">
        Follow this flow to avoid errors and ensure a smooth bulk import.
      </p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {steps.map((s, i) => (
          <div key={s.title} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </div>
              <p className="font-bold text-slate-900">{s.title}</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-bold text-slate-900">Common mistakes</h4>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
          {mistakes.map((m) => (
            <div key={m.title} className="p-4 rounded-xl border border-amber-200 bg-amber-50">
              <p className="text-sm font-bold text-amber-900">{m.title}</p>
              <p className="text-sm text-amber-800 mt-1">{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

