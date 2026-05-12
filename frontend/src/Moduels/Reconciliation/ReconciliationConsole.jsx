import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import API from "../../services/api";

function Card({ title, children }) {
  return (
    <div className="bg-white shadow rounded-xl border">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold text-gray-900">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function ReconciliationConsole() {
  const [selectedImportId, setSelectedImportId] = useState(null);

  const importsQ = useQuery({
    queryKey: ["recon-imports"],
    queryFn: async () => (await API.get("/reconciliation/imports")).data,
  });

  const processImportM = useMutation({
    mutationFn: async (importId) =>
      (await API.post(`/reconciliation/imports/${importId}/process`)).data,
    onSuccess: () => importsQ.refetch(),
  });

  const txnsQ = useQuery({
    queryKey: ["recon-txns", selectedImportId],
    enabled: !!selectedImportId,
    queryFn: async () =>
      (await API.get(`/reconciliation/imports/${selectedImportId}/transactions`))
        .data,
  });

  const excQ = useQuery({
    queryKey: ["recon-exc", selectedImportId],
    enabled: !!selectedImportId,
    queryFn: async () =>
      (await API.get(`/reconciliation/imports/${selectedImportId}/exceptions`))
        .data,
  });

  const matchesQ = useQuery({
    queryKey: ["recon-matches", selectedImportId],
    enabled: !!selectedImportId,
    queryFn: async () =>
      (await API.get(`/reconciliation/imports/${selectedImportId}/matches`)).data,
  });

  const ackM = useMutation({
    mutationFn: async ({ exceptionId, note }) =>
      (await API.post(`/reconciliation/exceptions/${exceptionId}/ack`, null, { params: { note } })).data,
    onSuccess: () => excQ.refetch(),
  });

  const resolveM = useMutation({
    mutationFn: async ({ exceptionId, note }) =>
      (await API.post(`/reconciliation/exceptions/${exceptionId}/resolve`, null, { params: { note } })).data,
    onSuccess: () => excQ.refetch(),
  });

  const summaryQ = useQuery({
    queryKey: ["recon-summary", selectedImportId],
    enabled: !!selectedImportId,
    queryFn: async () =>
      (await API.get(`/reconciliation/imports/${selectedImportId}/summary`)).data,
  });

  const imports = importsQ.data || [];

  const selected = useMemo(
    () => imports.find((i) => i.import_id === selectedImportId) || null,
    [imports, selectedImportId]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-100 min-h-screen">
      <div className="mb-6">
        <div className="text-2xl font-bold text-gray-900">
          Reconciliation Console
        </div>
        <div className="text-sm text-gray-600">
          Imports → Transactions → Matches/Exceptions (Phase 2B)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Imports">
          {importsQ.isLoading ? (
            <div className="text-sm text-gray-500">Loading imports…</div>
          ) : importsQ.isError ? (
            <div className="text-sm text-red-700">
              Failed to load imports:{" "}
              {importsQ.error?.response?.data?.detail || importsQ.error?.message}
            </div>
          ) : imports.length ? (
            <div className="space-y-2">
              {imports.map((i) => (
                <button
                  key={i.import_id}
                  className={`w-full text-left p-3 rounded-lg border hover:bg-gray-50 ${
                    selectedImportId === i.import_id
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white"
                  }`}
                  onClick={() => setSelectedImportId(i.import_id)}
                >
                  <div className="font-medium text-gray-900">
                    {i.original_filename || i.import_id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Status: {i.status} • Source: {i.source}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No imports yet. Upload a bank statement first.
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card title="Selected Import">
            {!selectedImportId ? (
              <div className="text-sm text-gray-500">
                Select an import to view details.
              </div>
            ) : summaryQ.isLoading ? (
              <div className="text-sm text-gray-500">Loading summary…</div>
            ) : summaryQ.isError ? (
              <div className="text-sm text-red-700">
                Failed to load summary.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-700">
                    Import:{" "}
                    <span className="font-mono">{selectedImportId}</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    Transactions:{" "}
                    <span className="font-semibold">
                      {summaryQ.data?.transactions ?? 0}
                    </span>{" "}
                    • Exceptions:{" "}
                    <span className="font-semibold">
                      {summaryQ.data?.exceptions ?? 0}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    className="px-3 py-2 rounded-lg bg-white border hover:bg-gray-50 text-sm"
                    href={`${API.defaults.baseURL}/reconciliation/imports/${selectedImportId}/export.csv`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Export CSV
                  </a>
                  <button
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
                    onClick={() => processImportM.mutate(selectedImportId)}
                    disabled={processImportM.isPending}
                  >
                    {processImportM.isPending ? "Queued…" : "Process Import"}
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card title="Transactions (sample)">
            {!selectedImportId ? (
              <div className="text-sm text-gray-500">Select an import.</div>
            ) : txnsQ.isLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : txnsQ.isError ? (
              <div className="text-sm text-red-700">Failed to load.</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-gray-600 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Amount</th>
                      <th className="px-3 py-2 text-left">UTR</th>
                      <th className="px-3 py-2 text-left">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(txnsQ.data || []).slice(0, 25).map((t) => (
                      <tr key={t.transaction_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{t.row_index}</td>
                        <td className="px-3 py-2">{t.txn_date}</td>
                        <td className="px-3 py-2">{t.txn_type}</td>
                        <td className="px-3 py-2">{t.amount}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {t.utr || "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {t.reference || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Exceptions">
            {!selectedImportId ? (
              <div className="text-sm text-gray-500">Select an import.</div>
            ) : excQ.isLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : excQ.isError ? (
              <div className="text-sm text-red-700">Failed to load.</div>
            ) : (excQ.data || []).length ? (
              <div className="space-y-2">
                {(excQ.data || []).slice(0, 25).map((e) => (
                  <div
                    key={e.exception_id}
                    className="p-3 rounded-lg border bg-white"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-900">
                        {e.kind} • {e.severity}
                      </div>
                      <div className="text-xs text-gray-600">{e.status}</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      {e.summary}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {JSON.stringify(e.details || {})}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="px-3 py-1 rounded-lg bg-yellow-100 text-yellow-800 text-xs hover:bg-yellow-200"
                        onClick={() => ackM.mutate({ exceptionId: e.exception_id, note: "Acknowledged" })}
                        disabled={ackM.isPending}
                      >
                        Ack
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg bg-green-100 text-green-800 text-xs hover:bg-green-200"
                        onClick={() => resolveM.mutate({ exceptionId: e.exception_id, note: "Resolved" })}
                        disabled={resolveM.isPending}
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No exceptions.</div>
            )}
          </Card>

          <Card title="Matches">
            {!selectedImportId ? (
              <div className="text-sm text-gray-500">Select an import.</div>
            ) : matchesQ.isLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : matchesQ.isError ? (
              <div className="text-sm text-red-700">Failed to load.</div>
            ) : (matchesQ.data || []).length ? (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-gray-600 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Confidence</th>
                      <th className="px-3 py-2 text-left">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(matchesQ.data || []).slice(0, 25).map((m) => (
                      <tr key={m.match_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{m.match_type}</td>
                        <td className="px-3 py-2">{m.status}</td>
                        <td className="px-3 py-2">{m.confidence}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {m.provider_payout_id?.slice(0, 8) || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No matches yet.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

