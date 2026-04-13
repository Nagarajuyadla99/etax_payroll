import { EMPLOYEE_FIELDS, getCanonicalBulkHeaders, getSampleRows } from "../employeeFieldSchema";

function badgeCls(kind) {
  if (kind === "required") return "bg-red-50 text-red-700 border-red-200";
  if (kind === "optional") return "bg-slate-50 text-slate-600 border-slate-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
}

function FieldLegend({ field }) {
  const bulkReq = field.bulk?.required;
  const required = !!field.required || !!bulkReq;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`px-2 py-0.5 rounded-full border font-semibold ${badgeCls(required ? "required" : "optional")}`}>
        {required ? "Required" : "Optional"}
      </span>
      <span className="text-slate-500">{field.type === "fk" ? "UUID / Name" : field.type}</span>
      {field.hint && <span className="text-slate-400">• {field.hint}</span>}
    </div>
  );
}

export default function EmployeeExampleSheet() {
  const headers = getCanonicalBulkHeaders({ includeSecondaryNameColumns: true });
  const rows = getSampleRows().slice(0, 3);

  const fieldMap = new Map(EMPLOYEE_FIELDS.map((f) => [f.key, f]));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Example Sheet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Your CSV/Excel should have a header row exactly like this. You can use IDs (UUID) or provide the *Name columns for auto-mapping.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-auto border border-slate-200 rounded-xl">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((h) => {
                const baseKey = h.endsWith("_name") ? h.replace(/_name$/, "_id") : h;
                const f = fieldMap.get(baseKey);
                const required = !!f?.required || !!f?.bulk?.required;
                return (
                  <th
                    key={h}
                    className={`text-left px-3 py-2 border-b border-slate-200 font-semibold ${
                      required ? "text-slate-900" : "text-slate-600"
                    }`}
                    title={f?.hint || ""}
                  >
                    <div className="flex items-center gap-2">
                      <span>{h}</span>
                      {required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">REQ</span>}
                      {!required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">OPT</span>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-slate-50/40">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 border-b border-slate-100 text-slate-700">
                    {String(r?.[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {EMPLOYEE_FIELDS.filter((f) => headers.includes(f.key)).map((f) => (
          <div key={f.key} className="p-3 rounded-xl border border-slate-200 bg-slate-50/40">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">{f.label}</p>
              <code className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                {f.key}
              </code>
            </div>
            <div className="mt-2">
              <FieldLegend field={f} />
            </div>
            {f.example && (
              <p className="mt-2 text-xs text-slate-500">
                Example: <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200">{f.example}</code>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

