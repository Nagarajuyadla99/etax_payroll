import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import API from "../../services/api";

function Badge({ text, tone }) {
  const cls =
    tone === "critical"
      ? "bg-red-100 text-red-800"
      : tone === "high"
      ? "bg-orange-100 text-orange-800"
      : tone === "medium"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-gray-100 text-gray-800";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {text}
    </span>
  );
}

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

export default function FraudConsole() {
  const [status, setStatus] = useState("open");
  const [severity, setSeverity] = useState("");

  const alertsQ = useQuery({
    queryKey: ["fraud-alerts", status, severity],
    queryFn: async () =>
      (
        await API.get("/fraud/alerts", {
          params: {
            status_filter: status || undefined,
            severity: severity || undefined,
          },
        })
      ).data,
  });

  const updateM = useMutation({
    mutationFn: async ({ alertId, status, resolution_note }) =>
      (await API.patch(`/fraud/alerts/${alertId}`, { status, resolution_note }))
        .data,
    onSuccess: () => alertsQ.refetch(),
  });

  const alerts = alertsQ.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-100 min-h-screen">
      <div className="mb-6">
        <div className="text-2xl font-bold text-gray-900">
          Fraud Monitoring
        </div>
        <div className="text-sm text-gray-600">
          Phase 2C baseline alerts + payout holds
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card title="Filters">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">Status</div>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="ack">Acknowledged</option>
                <option value="resolved">Resolved</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-1">Severity</div>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card title="Alerts">
            {alertsQ.isLoading ? (
              <div className="text-sm text-gray-500">Loading alerts…</div>
            ) : alertsQ.isError ? (
              <div className="text-sm text-red-700">
                Failed to load alerts:{" "}
                {alertsQ.error?.response?.data?.detail || alertsQ.error?.message}
              </div>
            ) : alerts.length ? (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-gray-600 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Severity</th>
                      <th className="px-3 py-2 text-left">Rule</th>
                      <th className="px-3 py-2 text-left">Title</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {alerts.map((a) => (
                      <tr key={a.alert_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <Badge text={a.severity} tone={a.severity} />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {a.rule_code}
                        </td>
                        <td className="px-3 py-2">{a.title}</td>
                        <td className="px-3 py-2">
                          <Badge text={a.status} tone="low" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 rounded-lg bg-yellow-100 text-yellow-800 text-xs hover:bg-yellow-200"
                              onClick={() =>
                                updateM.mutate({
                                  alertId: a.alert_id,
                                  status: "ack",
                                })
                              }
                              disabled={updateM.isPending}
                            >
                              Ack
                            </button>
                            <button
                              className="px-3 py-1 rounded-lg bg-green-100 text-green-800 text-xs hover:bg-green-200"
                              onClick={() =>
                                updateM.mutate({
                                  alertId: a.alert_id,
                                  status: "resolved",
                                  resolution_note: "Reviewed and resolved",
                                })
                              }
                              disabled={updateM.isPending}
                            >
                              Resolve
                            </button>
                            <button
                              className="px-3 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs hover:bg-gray-200"
                              onClick={() =>
                                updateM.mutate({
                                  alertId: a.alert_id,
                                  status: "ignored",
                                  resolution_note: "False positive",
                                })
                              }
                              disabled={updateM.isPending}
                            >
                              Ignore
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No alerts.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

