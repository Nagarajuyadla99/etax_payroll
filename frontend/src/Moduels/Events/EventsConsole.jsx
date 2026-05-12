import React, { useState } from "react";
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

function Badge({ text }) {
  const tone =
    text === "processed"
      ? "bg-green-100 text-green-800"
      : text === "failed" || text === "dead"
      ? "bg-red-100 text-red-800"
      : text === "processing"
      ? "bg-blue-100 text-blue-800"
      : "bg-gray-100 text-gray-800";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
      {text}
    </span>
  );
}

export default function EventsConsole() {
  const [status, setStatus] = useState("");
  const [eventType, setEventType] = useState("");

  const eventsQ = useQuery({
    queryKey: ["events", status, eventType],
    queryFn: async () =>
      (
        await API.get("/events", {
          params: {
            status_filter: status || undefined,
            event_type: eventType || undefined,
            limit: 100,
          },
        })
      ).data,
  });

  const redeliverM = useMutation({
    mutationFn: async (eventId) =>
      (await API.post(`/events/${eventId}/redeliver`)).data,
    onSuccess: () => eventsQ.refetch(),
  });

  const events = eventsQ.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-100 min-h-screen">
      <div className="mb-6">
        <div className="text-2xl font-bold text-gray-900">Events Console</div>
        <div className="text-sm text-gray-600">
          Phase 2G outbox events (inspect + redeliver)
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
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="processed">Processed</option>
                <option value="failed">Failed</option>
                <option value="dead">Dead</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Event type</div>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. payout.completed"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card title="Recent events">
            {eventsQ.isLoading ? (
              <div className="text-sm text-gray-500">Loading events…</div>
            ) : eventsQ.isError ? (
              <div className="text-sm text-red-700">
                Failed to load events:{" "}
                {eventsQ.error?.response?.data?.detail || eventsQ.error?.message}
              </div>
            ) : events.length ? (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-gray-600 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Created</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Attempts</th>
                      <th className="px-3 py-2 text-left">Error</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {events.map((e) => (
                      <tr key={e.event_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{String(e.created_at)}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {e.event_type}
                        </td>
                        <td className="px-3 py-2">
                          <Badge text={e.status} />
                        </td>
                        <td className="px-3 py-2">{e.attempts}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 max-w-[360px]">
                          {e.last_error || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="px-3 py-1 rounded-lg bg-white border hover:bg-gray-50 text-xs"
                            onClick={() => redeliverM.mutate(e.event_id)}
                            disabled={redeliverM.isPending}
                          >
                            Redeliver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No events found.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

