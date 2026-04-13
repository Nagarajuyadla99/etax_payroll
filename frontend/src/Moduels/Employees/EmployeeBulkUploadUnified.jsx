import { useEffect, useMemo, useRef, useState } from "react";
import { bulkUploadEmployees } from "./EmployeeApi";
import { EMPLOYEE_FIELDS, getBulkTargetFields } from "./employeeFieldSchema";
import { autoMapColumns, coerceEmployeeRecord, validateEmployeeRecord, isBlank } from "./employeeValidation";
import {
  buildErrorReportCsvBlob,
  buildSampleCsvBlob,
  buildSampleXlsxBlob,
  downloadBlob,
  parseCsv,
  parseXlsx,
  toCsv,
} from "./employeeFileUtils";

function pill(kind) {
  if (kind === "ok") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (kind === "warn") return "bg-amber-50 text-amber-800 border-amber-200";
  if (kind === "bad") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

const dropCls =
  "border-2 border-dashed rounded-2xl p-6 bg-white transition flex flex-col items-center justify-center text-center";

function normaliseRowValue(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function MappingSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function EmployeeBulkUploadUnified({ lookups }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parseState, setParseState] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({});
  const [stage, setStage] = useState("select"); // select -> map -> preview -> uploading -> result
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [clientRowErrors, setClientRowErrors] = useState([]);
  const [canonicalRows, setCanonicalRows] = useState([]);
  const [validRows, setValidRows] = useState([]);

  const targetFields = useMemo(() => getBulkTargetFields(), []);

  const mappingOptions = useMemo(() => {
    const opts = [];
    for (const f of targetFields) {
      opts.push({ value: f.key, label: `${f.label} (${f.key})` });
      if (f.bulk?.secondaryNameKey) {
        opts.push({
          value: f.bulk.secondaryNameKey,
          label: `${f.label} Name (${f.bulk.secondaryNameKey})`,
        });
      }
    }
    return opts;
  }, [targetFields]);

  const reverseMap = useMemo(() => {
    // sourceHeader -> targetKey
    const out = {};
    for (const [k, v] of Object.entries(mapping || {})) {
      if (v) out[v] = k;
    }
    return out;
  }, [mapping]);

  useEffect(() => {
    if (!parseState.headers.length) return;
    setMapping((prev) => ({ ...autoMapColumns(parseState.headers), ...prev }));
  }, [parseState.headers]);

  const requiredTargets = useMemo(() => {
    const has = (k) => (lookups?.[k] || []).length > 0;
    const req = new Set(
      EMPLOYEE_FIELDS.filter((f) => f.bulk?.required).map((f) => f.key)
    );
    if (has("departments")) req.add("department_id");
    if (has("designations")) req.add("designation_id");
    if (has("locations")) req.add("location_id");
    return req;
  }, [lookups]);

  const parseFile = async (f) => {
    setResult(null);
    setClientRowErrors([]);
    setCanonicalRows([]);
    setValidRows([]);
    setMapping({});
    setParseState({ headers: [], rows: [] });

    const name = String(f?.name || "").toLowerCase();
    let parsed;
    if (name.endsWith(".csv")) parsed = await parseCsv(f);
    else if (name.endsWith(".xlsx")) parsed = await parseXlsx(f);
    else throw new Error("Only CSV or XLSX is supported");

    setParseState(parsed);
    setStage("map");
  };

  const onPickFile = (f) => {
    if (!f) return;
    setFile(f);
    parseFile(f).catch((e) => alert(e.message || "Failed to parse file"));
  };

  const buildCanonical = () => {
    const errors = [];
    const rows = [];
    const valid = [];

    const codeSeen = new Map();
    const invalidIdx = new Set();

    for (let i = 0; i < (parseState.rows || []).length; i++) {
      const raw = parseState.rows[i] || {};
      const record = {};

      // apply mapping (targetKey -> sourceHeader)
      for (const [targetKey, sourceHeader] of Object.entries(mapping || {})) {
        if (!sourceHeader) continue;
        record[targetKey] = normaliseRowValue(raw?.[sourceHeader]);
      }

      // coerce + validate using shared rules
      const coerced = coerceEmployeeRecord(record, { lookups });
      const rowErrs = validateEmployeeRecord(coerced, { mode: "bulk", lookups });

      // duplicate employee_code within the file
      const code = coerced.employee_code;
      if (!isBlank(code)) {
        const k = String(code);
        if (codeSeen.has(k)) rowErrs.employee_code = "Duplicate employee_code in this file";
        else codeSeen.set(k, i);
      }

      if (Object.keys(rowErrs).length > 0) {
        const top = Object.entries(rowErrs)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");
        errors.push({ row: i + 1, rowIndex: i, error: top, fieldErrors: rowErrs });
        invalidIdx.add(i);
      }

      rows.push(coerced);
    }

    setCanonicalRows(rows);
    setClientRowErrors(errors);
    for (let i = 0; i < rows.length; i++) {
      if (!invalidIdx.has(i)) valid.push(rows[i]);
    }
    setValidRows(valid);
    setStage("preview");
  };

  const mappingCompleteness = useMemo(() => {
    const mappedTargets = new Set(Object.keys(mapping || {}).filter((k) => mapping[k]));
    const missing = Array.from(requiredTargets).filter((t) => !mappedTargets.has(t));
    return { missing, ok: missing.length === 0 };
  }, [mapping, requiredTargets]);

  const handleUpload = async () => {
    // Upload valid rows only: invalid rows are excluded, so they never block upload.
    const base = validRows;
    const csv = toCsv(base, Object.keys(base?.[0] || {}));
    const cleanFile = new File([csv], "employees_canonical.csv", { type: "text/csv" });

    setUploading(true);
    setStage("uploading");
    try {
      const res = await bulkUploadEmployees(cleanFile);
      setResult(res);
      setStage("result");
    } catch (e) {
      console.error(e);
      alert("Upload failed");
      setStage("preview");
    } finally {
      setUploading(false);
    }
  };

  const canUpload = validRows.length > 0 && !uploading;

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Bulk Upload</h3>
            <p className="text-sm text-slate-500 mt-1">
              Upload CSV/XLSX, auto-map columns, preview with row-wise errors, then submit using the existing bulk API.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadBlob(buildSampleCsvBlob(), "employees_sample.csv")}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download Sample (CSV)
            </button>
            <button
              onClick={() => downloadBlob(buildSampleXlsxBlob(), "employees_sample.xlsx")}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Download Sample (XLSX)
            </button>
          </div>
        </div>
      </div>

      {/* Select */}
      {stage === "select" && (
        <div
          className={`${dropCls} ${file ? "border-slate-200" : "border-indigo-300 hover:border-indigo-400"} `}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            onPickFile(f);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
            ↑
          </div>
          <h4 className="mt-3 text-base font-bold text-slate-900">Drag & drop your CSV/XLSX</h4>
          <p className="text-sm text-slate-500 mt-1">
            Or{" "}
            <button className="text-indigo-600 font-semibold hover:underline" onClick={() => inputRef.current?.click()}>
              browse
            </button>
          </p>
          <p className="text-xs text-slate-400 mt-2">Max size depends on browser. Recommended: &lt; 5,000 rows per upload.</p>
        </div>
      )}

      {/* Map */}
      {stage === "map" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Map Columns</h4>
              <p className="text-sm text-slate-500 mt-1">
                We auto-map when headers match. Verify required fields are mapped.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full border ${mappingCompleteness.ok ? pill("ok") : pill("warn")}`}>
                {mappingCompleteness.ok ? "All required fields mapped" : `${mappingCompleteness.missing.length} required missing`}
              </span>
              <button
                onClick={() => buildCanonical()}
                disabled={!mappingCompleteness.ok}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Preview
              </button>
            </div>
          </div>

          {!mappingCompleteness.ok && (
            <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
              Missing required mappings: <b>{mappingCompleteness.missing.join(", ")}</b>
            </div>
          )}

          <div className="mt-4 overflow-auto border border-slate-200 rounded-xl">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">Source column</th>
                  <th className="text-left px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">Map to field</th>
                  <th className="text-left px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {(parseState.headers || []).map((h) => {
                  const selected = reverseMap[h] || "";
                  const isRequiredMapped = requiredTargets.has(selected);
                  return (
                    <tr key={h} className="odd:bg-white even:bg-slate-50/40">
                      <td className="px-3 py-2 border-b border-slate-100">
                        <code className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">{h}</code>
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100">
                        <MappingSelect
                          value={selected}
                          options={mappingOptions}
                          placeholder="(Ignore this column)"
                          onChange={(targetKey) => {
                            setMapping((prev) => {
                              const next = { ...prev };
                              // clear any other mapping pointing to this header
                              Object.keys(next).forEach((k) => {
                                if (next[k] === h) delete next[k];
                              });
                              if (targetKey) next[targetKey] = h;
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100">
                        {selected ? (
                          <span className={`text-xs px-2 py-1 rounded-full border ${pill(isRequiredMapped ? "ok" : "neutral")}`}>
                            {isRequiredMapped ? "Required mapped" : "Mapped"}
                          </span>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full border ${pill("warn")}`}>Ignored</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => {
                setStage("select");
                setFile(null);
                setParseState({ headers: [], rows: [] });
                setMapping({});
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Choose another file
            </button>
            <button
              onClick={() => setMapping((prev) => ({ ...prev, ...autoMapColumns(parseState.headers) }))}
              className="px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Auto-map again
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {stage === "preview" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Preview</h4>
              <p className="text-sm text-slate-500 mt-1">
                Validate rows before submission. Fix errors, then re-upload the corrected file.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full border ${clientRowErrors.length ? pill("bad") : pill("ok")}`}>
                {clientRowErrors.length ? `${clientRowErrors.length} rows with errors` : "All rows valid"}
              </span>
              <button
                disabled={!canUpload}
                onClick={handleUpload}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload {validRows.length} Valid Rows
              </button>
            </div>
          </div>

          {clientRowErrors.length > 0 && (
            <div className="mt-3 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
              Invalid rows are highlighted and will be excluded. You can still upload the valid rows now, then fix and re-upload the remaining rows.
            </div>
          )}

          <div className="mt-4 overflow-auto border border-slate-200 rounded-xl">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">Row</th>
                  {Object.keys(canonicalRows?.[0] || {}).map((h) => (
                    <th key={h} className="text-left px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">
                      {h}
                    </th>
                  ))}
                  <th className="text-left px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">Error</th>
                </tr>
              </thead>
              <tbody>
                {canonicalRows.slice(0, 50).map((r, idx) => {
                  const err = clientRowErrors.find((e) => e.rowIndex === idx);
                  return (
                    <tr key={idx} className={err ? "bg-red-50" : idx % 2 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-3 py-2 border-b border-slate-100 font-semibold text-slate-700">{idx + 1}</td>
                      {Object.keys(canonicalRows?.[0] || {}).map((h) => (
                        <td key={h} className="px-3 py-2 border-b border-slate-100 text-slate-700">
                          {String(r?.[h] ?? "")}
                        </td>
                      ))}
                      <td className="px-3 py-2 border-b border-slate-100">
                        {err ? (
                          <span className="text-xs text-red-700 font-semibold">{err.error}</span>
                        ) : (
                          <span className="text-xs text-emerald-700 font-semibold">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setStage("map")}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Back to mapping
            </button>
            <p className="text-xs text-slate-400">Showing first 50 rows in preview.</p>
          </div>
        </div>
      )}

      {/* Uploading */}
      {stage === "uploading" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <div>
            <p className="font-bold text-slate-900">Uploading…</p>
            <p className="text-sm text-slate-500">Submitting to bulk API. This can take a moment for large files.</p>
          </div>
        </div>
      )}

      {/* Result */}
      {stage === "result" && result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Upload Result</h4>
              <p className="text-sm text-slate-500 mt-1">Backend processed the file. Failed rows are reported without blocking successes.</p>
            </div>
            <div className="flex items-center gap-2">
              {result?.failed > 0 && (
                <button
                  onClick={() => {
                    const blob = buildErrorReportCsvBlob({
                      canonicalRows,
                      rowErrors: (result.errors || []).map((e) => ({
                        row: e.row,
                        rowIndex: (e.row || 1) - 1,
                        error: e.error,
                      })),
                    });
                    downloadBlob(blob, "employees_upload_errors.csv");
                  }}
                  className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Download Error Report (CSV)
                </button>
              )}
              <button
                onClick={() => {
                  setStage("select");
                  setFile(null);
                  setParseState({ headers: [], rows: [] });
                  setMapping({});
                  setResult(null);
                  setClientRowErrors([]);
                  setCanonicalRows([]);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Upload another file
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Rows</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{result.total_rows}</p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
              <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Inserted</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{result.inserted}</p>
            </div>
            <div className="p-4 rounded-xl border border-red-200 bg-red-50">
              <p className="text-xs text-red-700 font-semibold uppercase tracking-wider">Failed</p>
              <p className="text-2xl font-bold text-red-800 mt-1">{result.failed}</p>
            </div>
          </div>

          {result?.failed > 0 && (
            <div className="mt-4 overflow-auto max-h-80 border border-slate-200 rounded-xl">
              <table className="min-w-[800px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">Row</th>
                    <th className="text-left px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.errors || []).slice(0, 200).map((e, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-slate-50/40">
                      <td className="px-3 py-2 border-b border-slate-100 font-semibold text-slate-700">{e.row}</td>
                      <td className="px-3 py-2 border-b border-slate-100 text-red-700">{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

