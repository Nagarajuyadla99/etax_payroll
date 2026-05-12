import axios from "axios";

const API_BASE =
  (typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_API_URL
    : process.env.REACT_APP_API_URL) || "http://127.0.0.1:9000/api/salary";

const API = `${API_BASE}/v2`;

function genIdempotencyKey() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`;
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

function unwrap(err) {
  const apiErr = err?.response?.data;
  throw apiErr || err;
}

function isTransient(err) {
  const status = err?.response?.status;
  if (!status) return true; // network / timeout
  return status >= 500;
}

async function requestWithRetry(config, { retryOnce = true } = {}) {
  try {
    return await axios.request(config);
  } catch (e) {
    if (retryOnce && isTransient(e)) {
      // one retry only
      await new Promise((r) => setTimeout(r, 250));
      return await axios.request({ ...config, __retry: true });
    }
    throw e;
  }
}

function withIdempotency(config) {
  const method = String(config?.method || "get").toLowerCase();
  if (method !== "post") return config;
  const headers = { ...(config.headers || {}) };
  if (!headers["Idempotency-Key"]) headers["Idempotency-Key"] = genIdempotencyKey();
  return { ...config, headers };
}

/* ── Components ───────────────────────────────────────────── */
export async function v2CreateComponent(payload) {
  try {
    const base = authHeaders();
    const res = await requestWithRetry(
      withIdempotency({
        method: "post",
        url: `${API}/components`,
        data: payload,
        ...base,
      })
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2ListComponents(params = {}) {
  try {
    const res = await requestWithRetry({ method: "get", url: `${API}/components`, ...authHeaders(), params }, { retryOnce: true });
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2UpdateComponent(componentId, payload) {
  try {
    const res = await requestWithRetry(
      { method: "put", url: `${API}/components/${componentId}`, data: payload, ...authHeaders() },
      { retryOnce: true }
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

/* ── Groups ───────────────────────────────────────────────── */
export async function v2CreateGroup(payload) {
  try {
    const base = authHeaders();
    const res = await requestWithRetry(
      withIdempotency({
        method: "post",
        url: `${API}/component-groups`,
        data: payload,
        ...base,
      })
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2ListGroups() {
  try {
    const res = await requestWithRetry({ method: "get", url: `${API}/component-groups`, ...authHeaders() }, { retryOnce: true });
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2GetGroup(groupId) {
  try {
    const res = await requestWithRetry(
      { method: "get", url: `${API}/component-groups/${groupId}`, ...authHeaders() },
      { retryOnce: true }
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2AddGroupItem(groupId, payload) {
  try {
    const base = authHeaders();
    const res = await requestWithRetry(
      withIdempotency({
        method: "post",
        url: `${API}/component-groups/${groupId}/items`,
        data: payload,
        ...base,
      })
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2ListGroupItems(groupId) {
  try {
    const res = await requestWithRetry(
      { method: "get", url: `${API}/component-groups/${groupId}/items`, ...authHeaders() },
      { retryOnce: true }
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

/* ── Derived variables ────────────────────────────────────── */
export async function v2CreateDerivedVariable(payload) {
  try {
    const base = authHeaders();
    const res = await requestWithRetry(
      withIdempotency({ method: "post", url: `${API}/derived-variables`, data: payload, ...base })
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2ListDerivedVariables() {
  try {
    const res = await requestWithRetry({ method: "get", url: `${API}/derived-variables`, ...authHeaders() }, { retryOnce: true });
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2ValidateFormula(payload) {
  try {
    const base = authHeaders();
    const res = await requestWithRetry(
      withIdempotency({ method: "post", url: `${API}/formulas/validate`, data: payload, ...base }),
      { retryOnce: true }
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

/* ── Statutory configs ────────────────────────────────────── */
export async function v2CreateStatutoryConfig(payload) {
  try {
    const base = authHeaders();
    const res = await requestWithRetry(
      withIdempotency({ method: "post", url: `${API}/statutory-configs`, data: payload, ...base })
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2ListStatutoryConfigs(params = {}) {
  try {
    const res = await requestWithRetry(
      { method: "get", url: `${API}/statutory-configs`, ...authHeaders(), params },
      { retryOnce: true }
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

/* ── Template group links ─────────────────────────────────── */
export async function v2AddGroupToTemplate(templateId, payload) {
  try {
    const base = authHeaders();
    const res = await requestWithRetry(
      withIdempotency({ method: "post", url: `${API}/templates/${templateId}/groups`, data: payload, ...base })
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

export async function v2ListTemplateGroups(templateId) {
  try {
    const res = await requestWithRetry(
      { method: "get", url: `${API}/templates/${templateId}/groups`, ...authHeaders() },
      { retryOnce: true }
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

/* ── Preview ──────────────────────────────────────────────── */
export async function v2Preview(payload) {
  try {
    const base = authHeaders();
    const res = await requestWithRetry(
      withIdempotency({ method: "post", url: `${API}/preview`, data: payload, ...base }),
      { retryOnce: true }
    );
    return res.data;
  } catch (e) {
    unwrap(e);
  }
}

