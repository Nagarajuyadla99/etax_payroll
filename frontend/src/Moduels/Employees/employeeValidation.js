import { EMPLOYEE_FIELDS, normaliseHeader } from "./employeeFieldSchema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_RE =
  // pragmatic (not RFC-perfect) and matches backend EmailStr expectations well
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

export function validateValue(type, value) {
  if (isBlank(value)) return null;

  const s = String(value).trim();
  if (type === "string") return null;
  if (type === "email") return EMAIL_RE.test(s) ? null : "Invalid email format";
  if (type === "uuid") return UUID_RE.test(s) ? null : "Invalid UUID format";
  if (type === "date") {
    // backend expects YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "Use YYYY-MM-DD format";
    const d = new Date(s + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "Invalid date";
    return null;
  }
  if (type === "number") return Number.isFinite(Number(s)) ? null : "Invalid number";
  if (type === "phone") {
    // allow digits/space/+/-/() and enforce at least 8 digits
    if (!/^[0-9+\-\s()]+$/.test(s)) return "Invalid phone format";
    const digits = s.replace(/\D/g, "");
    if (digits.length < 8) return "Phone seems too short";
    return null;
  }
  if (type === "fk") return UUID_RE.test(s) ? null : "Provide UUID or map from name";
  return null;
}

function buildLookupIndex(list, nameKey) {
  const map = new Map();
  for (const item of list || []) {
    const name = String(item?.[nameKey] ?? "").trim().toLowerCase();
    if (!name) continue;
    // prefer first seen to keep deterministic
    if (!map.has(name)) map.set(name, item);
  }
  return map;
}

export function resolveFk({ field, value, record, lookups }) {
  // If a UUID is provided and exists in lookup list -> ok.
  // Else attempt name mapping via secondaryNameKey or by matching to list names.
  const list = lookups?.[field.fk?.kind] || [];
  const idKey = field.fk?.idKey || "id";
  const nameKey = field.fk?.nameKey || "name";
  const valueStr = isBlank(value) ? "" : String(value).trim();

  if (UUID_RE.test(valueStr)) {
    // If we have a list, ensure it exists; otherwise just accept UUID format.
    if (list.length === 0) return { ok: true, value: valueStr };
    const exists = list.some((x) => String(x?.[idKey]) === valueStr);
    return exists
      ? { ok: true, value: valueStr }
      : { ok: false, error: `Unknown ${field.label} ID` };
  }

  const secondaryKey = field.bulk?.secondaryNameKey;
  const nameCandidate = secondaryKey ? record?.[secondaryKey] : null;
  const name = !isBlank(nameCandidate) ? String(nameCandidate).trim() : valueStr;
  if (isBlank(name)) return { ok: true, value: undefined };

  if (list.length === 0) {
    return { ok: false, error: `${field.label} list is empty; provide UUID` };
  }

  const idx = buildLookupIndex(list, nameKey);
  const hit = idx.get(String(name).trim().toLowerCase());
  if (!hit) return { ok: false, error: `Unknown ${field.label}: ${name}` };
  return { ok: true, value: String(hit[idKey]) };
}

export function getEmployeeRulesContext({ lookups }) {
  const requiredIfHasOptions = (kind) => (lookups?.[kind] || []).length > 0;
  return {
    requireDepartment: requiredIfHasOptions("departments"),
    requireDesignation: requiredIfHasOptions("designations"),
    requireLocation: requiredIfHasOptions("locations"),
  };
}

export function validateEmployeeRecord(record, { mode, lookups } = {}) {
  const errors = {};
  const ctx = getEmployeeRulesContext({ lookups });

  for (const field of EMPLOYEE_FIELDS) {
    const v = record?.[field.key];

    const isRequired =
      mode === "bulk"
        ? !!field.bulk?.required || (field.key === "department_id" && ctx.requireDepartment) ||
          (field.key === "designation_id" && ctx.requireDesignation) ||
          (field.key === "location_id" && ctx.requireLocation)
        : !!field.required ||
          (field.key === "department_id" && ctx.requireDepartment) ||
          (field.key === "designation_id" && ctx.requireDesignation) ||
          (field.key === "location_id" && ctx.requireLocation);

    if (isRequired && isBlank(v)) {
      errors[field.key] = `${field.label} is required`;
      continue;
    }

    if (field.type === "fk") {
      if (isBlank(v) && !isRequired) continue;
      const res = resolveFk({ field, value: v, record, lookups });
      if (!res.ok) errors[field.key] = res.error;
      continue;
    }

    const err = validateValue(field.type === "fk" ? "uuid" : field.type, v);
    if (err) errors[field.key] = err;
  }

  // extra bulk-only validations
  if (mode === "bulk") {
    if (!isBlank(record?.employee_code) && String(record.employee_code).length > 64) {
      errors.employee_code = "Employee Code too long";
    }
  }

  return errors;
}

export function coerceEmployeeRecord(record, { lookups } = {}) {
  const out = { ...record };

  // FK mapping (id or name -> id)
  for (const field of EMPLOYEE_FIELDS.filter((f) => f.type === "fk")) {
    const res = resolveFk({ field, value: out[field.key], record: out, lookups });
    if (res.ok) {
      if (res.value === undefined) delete out[field.key];
      else out[field.key] = res.value;
    }
    // leave as-is if not ok (caller will validate)
  }

  // normalize common aliases
  if (!isBlank(out.work_email) && isBlank(out.email)) out.email = out.work_email;
  if (!isBlank(out.mobile_phone) && isBlank(out.phone)) out.phone = out.mobile_phone;

  // dates already kept as YYYY-MM-DD strings (backend parser handles in Pydantic for single create;
  // bulk service parses date strings explicitly)
  // booleans/numbers if present
  if (!isBlank(out.is_active)) {
    const s = String(out.is_active).trim().toLowerCase();
    out.is_active = s === "true" || s === "1" || s === "yes";
  }

  if (!isBlank(out.annual_ctc)) {
    const n = Number(out.annual_ctc);
    if (Number.isFinite(n)) out.annual_ctc = n;
  }

  // strip blanks
  Object.keys(out).forEach((k) => {
    if (isBlank(out[k])) delete out[k];
  });

  return out;
}

export function autoMapColumns(headers) {
  const headerNorms = (headers || []).map((h) => ({
    raw: h,
    norm: normaliseHeader(h),
  }));

  const mapping = {}; // targetKey -> sourceHeaderRaw

  for (const f of EMPLOYEE_FIELDS) {
    const candidates = new Set([
      f.key,
      ...(f.bulk?.headerAliases || []),
      f.label,
    ].map(normaliseHeader));

    const hit = headerNorms.find((h) => candidates.has(h.norm));
    if (hit) mapping[f.key] = hit.raw;

    if (f.bulk?.secondaryNameKey) {
      const nameCandidates = new Set([
        f.bulk.secondaryNameKey,
        ...(f.bulk.secondaryHeaderAliases || []),
      ].map(normaliseHeader));
      const nameHit = headerNorms.find((h) => nameCandidates.has(h.norm));
      if (nameHit) mapping[f.bulk.secondaryNameKey] = nameHit.raw;
    }
  }

  return mapping;
}

