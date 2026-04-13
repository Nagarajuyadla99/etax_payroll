import Papa from "papaparse";
import * as XLSX from "xlsx";

import { getCanonicalBulkHeaders, getSampleRows } from "./employeeFieldSchema";

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows, headers) {
  return Papa.unparse(rows, { columns: headers, header: true, skipEmptyLines: true });
}

export function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => String(h || "").trim(),
      complete: (res) => resolve({ headers: res.meta.fields || [], rows: res.data || [] }),
      error: (err) => reject(err),
    });
  });
}

export async function parseXlsx(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

export function buildSampleCsvBlob() {
  const headers = getCanonicalBulkHeaders({ includeSecondaryNameColumns: true });
  const rows = getSampleRows();
  const csv = toCsv(rows, headers);
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

export function buildSampleXlsxBlob() {
  const headers = getCanonicalBulkHeaders({ includeSecondaryNameColumns: true });
  const rows = getSampleRows();

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  // ensure header order even if some keys missing
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function buildErrorReportCsvBlob({ canonicalRows, rowErrors }) {
  const headers = ["row", "error", ...Object.keys((canonicalRows || [])[0] || {})];
  const rows = (rowErrors || []).map((e) => ({
    row: e.row,
    error: e.error,
    ...(canonicalRows?.[e.rowIndex] || {}),
  }));
  const csv = toCsv(rows, headers);
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

