import type {
  MetricsSummary,
  CallRecord,
  LoadRecord,
  LoadSearchParams,
  CallDetail,
  CallEvent,
  ActiveCall,
  SettingsValues,
  SettingsSchema,
  NegotiationResult,
} from "@/types";

function buildLoadsUrl(params?: LoadSearchParams) {
  if (!params) return "/api/loads";
  const sp = new URLSearchParams();
  if (params.origin) sp.set("origin", params.origin);
  if (params.destination) sp.set("destination", params.destination);
  if (params.equipment_type) sp.set("equipment_type", params.equipment_type);
  if (params.min_rate != null) sp.set("min_rate", String(params.min_rate));
  if (params.max_weight != null) sp.set("max_weight", String(params.max_weight));
  if (params.pickup_date) sp.set("pickup_date", params.pickup_date);
  const qs = sp.toString();
  return qs ? `/api/loads?${qs}` : "/api/loads";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.clone().json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      else if (body?.message) detail = body.message;
    } catch {
      try {
        detail = (await res.text()) || detail;
      } catch {
        /* keep statusText */
      }
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json();
}

export const api = {
  getMetrics: (period?: string) =>
    request<MetricsSummary>(
      period ? `/api/metrics?period=${encodeURIComponent(period)}` : "/api/metrics",
    ),
  getCalls: (limit = 50) => request<CallRecord[]>(`/api/calls?limit=${limit}`),
  getLoads: (params?: LoadSearchParams) =>
    request<{ loads: LoadRecord[]; total: number }>(buildLoadsUrl(params)),
  getLoad: (loadId: string) =>
    request<LoadRecord>(`/api/loads/${encodeURIComponent(loadId)}`),
  getCallDetail: (callId: string) =>
    request<CallDetail>(`/api/calls/${encodeURIComponent(callId)}/detail`),
  getCallEvents: (callId: string) =>
    request<CallEvent[]>(`/api/calls/${encodeURIComponent(callId)}/events`),
  getActiveCalls: () => request<ActiveCall[]>("/api/events/active"),
  exportCsvUrl: "/api/calls/export/csv",
  getTranscriptSession: (callId?: string) =>
    request<{ session_id: string | null }>(
      callId
        ? `/api/events/transcript/session?call_id=${encodeURIComponent(callId)}`
        : "/api/events/transcript/session",
    ),
  transcriptStreamUrl: (sessionId: string) =>
    `/api/events/transcript/stream?session_id=${encodeURIComponent(sessionId)}`,
  getSettings: () =>
    request<{ values: SettingsValues; schema: SettingsSchema }>("/api/settings"),
  updateSettings: (patch: SettingsValues) =>
    request<{ values: SettingsValues }>("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  resetSettings: () =>
    request<{ values: SettingsValues }>("/api/settings/reset", { method: "POST" }),
  createVoiceToken: (data?: Record<string, unknown>) =>
    request<{
      url: string;
      token: string;
      room_name: string;
      run_id: string;
      call_id: string;
    }>("/api/voice/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data ? { data } : {}),
    }),
  notifyCallStarted: (payload: { run_id: string; call_id?: string; workflow_id?: string }) =>
    request<{ status: string; call_id: string }>("/api/events/call-started", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  notifyCallEnded: (payload: { call_id: string }) =>
    request<{ status: string; call_id: string }>("/api/events/call-ended", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, source: "web-call-panel" }),
    }),
  negotiate: (payload: {
    load_id: string;
    carrier_offer: number;
    current_round: number;
    previous_broker_counters?: number[];
  }) =>
    request<NegotiationResult>("/api/negotiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
