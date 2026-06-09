import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { calls, callEvents } from "@/db/schema";
import { getSettings } from "@/config/env";
import { serializeCallEvent } from "@/db/serializers";

const HR_BASE = "https://platform.happyrobot.ai/api/v2";
const LIVE_SESSION_TTL_MS = 30 * 60 * 1000;

export async function getActiveCalls() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 10 * 60 * 1000);
  const staleCutoff = new Date(now.getTime() - 2 * 60 * 1000);

  const allEvents = await db
    .select()
    .from(callEvents)
    .where(gte(callEvents.createdAt, cutoff))
    .orderBy(callEvents.createdAt);

  const callMap = new Map<string, { events: typeof allEvents; completed: boolean }>();
  for (const e of allEvents) {
    if (!callMap.has(e.callId)) callMap.set(e.callId, { events: [], completed: false });
    const entry = callMap.get(e.callId)!;
    entry.events.push(e);
    if (e.eventType === "call_logged") entry.completed = true;
  }

  const active = [];
  for (const [callId, data] of callMap) {
    if (!data.completed) {
      const lastEvent = data.events[data.events.length - 1];
      if (lastEvent.createdAt < staleCutoff) continue;
      active.push({
        call_id: callId,
        started_at: data.events[0].createdAt.toISOString(),
        last_event: serializeCallEvent(lastEvent),
        event_count: data.events.length,
      });
    }
  }
  return active;
}

async function fetchLatestRunId(workflowId: string, apiKey: string) {
  if (!workflowId || !apiKey) return "";
  try {
    const resp = await fetch(
      `${HR_BASE}/workflows/${workflowId}/runs?status=running&page_size=1&sort=desc`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) },
    );
    if (resp.ok) {
      const data = await resp.json();
      const runs = data.data ?? [];
      if (runs.length) return runs[0].id ?? "";
    }
  } catch {
    /* ignore */
  }
  return "";
}

async function discoverActiveRun(apiKey: string, hintWorkflowId = "") {
  if (!apiKey) return "";

  if (hintWorkflowId) {
    const runId = await fetchLatestRunId(hintWorkflowId, apiKey);
    if (runId) return runId;
  }

  try {
    const resp = await fetch(`${HR_BASE}/workflows/?page=1&page_size=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return "";
    const workflows = (await resp.json()).data ?? [];

    for (const wf of workflows) {
      const wfId = wf.id;
      if (!wfId || wfId === hintWorkflowId) continue;
      const r = await fetch(
        `${HR_BASE}/workflows/${wfId}/runs?status=running&page_size=1&sort=desc`,
        { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) },
      );
      if (r.ok) {
        const runs = (await r.json()).data ?? [];
        if (runs.length && runs[0].id) return runs[0].id;
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

export async function handleCallStarted(payload: Record<string, unknown>) {
  const settings = getSettings();
  const runId =
    (payload.run_id as string) ||
    (await discoverActiveRun(settings.happyrobotApiKey, settings.happyrobotWorkflowId));
  const workflowId = (payload.workflow_id as string) || settings.happyrobotWorkflowId;
  const callId =
    (typeof payload.call_id === "string" && payload.call_id.trim()) ||
    (runId ? `LIVE-${runId.slice(0, 8).toUpperCase()}` : "LIVE-UNKNOWN");

  const workflowRunId = await discoverActiveRun(
    settings.happyrobotApiKey,
    workflowId,
  );

  await db.insert(callEvents).values({
    callId,
    eventType: "call_started",
    payload: {
      run_id: runId,
      workflow_run_id: workflowRunId,
      workflow_id: workflowId,
      session_id: "",
    },
  });

  return { status: "ok", call_id: callId };
}

type LiveSessionPayload = {
  run_id?: string;
  workflow_run_id?: string;
  workflow_id?: string;
  session_id?: string;
};

async function runHasSessions(runId: string, apiKey: string): Promise<boolean> {
  if (!runId || !apiKey) return false;
  try {
    const resp = await fetch(
      `${HR_BASE}/runs/${runId}/sessions?page=1&page_size=1&sort=desc`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) },
    );
    if (!resp.ok) return false;
    const sessions = (await resp.json()).data ?? [];
    return sessions.length > 0;
  } catch {
    return false;
  }
}

async function fetchLatestWorkflowRun(
  workflowId: string,
  apiKey: string,
  since?: Date,
): Promise<string> {
  if (!workflowId || !apiKey) return "";
  try {
    const resp = await fetch(
      `${HR_BASE}/workflows/${workflowId}/runs?page=1&page_size=10&sort=desc`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) },
    );
    if (!resp.ok) return "";
    const runs = (await resp.json()).data ?? [];
    for (const run of runs) {
      if (since && run.timestamp && new Date(run.timestamp) < since) continue;
      if (run.id) return run.id;
    }
    return runs[0]?.id ?? "";
  } catch {
    return "";
  }
}

async function resolveWorkflowRunId(
  payload: LiveSessionPayload,
  apiKey: string,
  workflowId: string,
  startedAt?: Date,
): Promise<string> {
  const candidates = [payload.workflow_run_id, payload.run_id].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (await runHasSessions(candidate, apiKey)) return candidate;
  }

  const active = await discoverActiveRun(apiKey, workflowId);
  if (active && (await runHasSessions(active, apiKey))) return active;

  return fetchLatestWorkflowRun(workflowId, apiKey, startedAt);
}

async function fetchSessionIdForRun(runId: string, apiKey: string): Promise<string | null> {
  if (!runId || !apiKey) return null;
  try {
    const resp = await fetch(
      `${HR_BASE}/runs/${runId}/sessions?page=1&page_size=1&sort=desc`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) },
    );
    if (!resp.ok) return null;
    const sessions = (await resp.json()).data ?? [];
    return sessions[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function persistLiveSessionPayload(
  eventId: number,
  payload: LiveSessionPayload,
  updates: Partial<LiveSessionPayload>,
) {
  await db
    .update(callEvents)
    .set({ payload: { ...payload, ...updates } })
    .where(eq(callEvents.id, eventId));
}

async function findActiveLiveSession(callId?: string) {
  const cutoff = new Date(Date.now() - LIVE_SESSION_TTL_MS);
  const conditions = [
    eq(callEvents.eventType, "call_started"),
    gte(callEvents.createdAt, cutoff),
  ];
  if (callId) conditions.push(eq(callEvents.callId, callId));

  const startedEvents = await db
    .select()
    .from(callEvents)
    .where(and(...conditions))
    .orderBy(sql`${callEvents.createdAt} desc`)
    .limit(callId ? 1 : 10);

  if (!startedEvents.length) return null;

  const startedIds = startedEvents.map((e) => e.callId);
  const logged = await db
    .select({ callId: callEvents.callId })
    .from(callEvents)
    .where(
      and(eq(callEvents.eventType, "call_logged"), inArray(callEvents.callId, startedIds)),
    );
  const loggedSet = new Set(logged.map((l) => l.callId));

  for (const ev of startedEvents) {
    if (!loggedSet.has(ev.callId)) return ev;
  }
  return null;
}

async function fetchRunTranscript(runId: string, apiKey: string) {
  if (!runId || !apiKey) return { sessionId: "", messages: [] as { role: string; content: string; timestamp: string }[] };

  try {
    const sresp = await fetch(
      `${HR_BASE}/runs/${runId}/sessions?page=1&page_size=1&sort=desc`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000) },
    );
    if (!sresp.ok) return { sessionId: "", messages: [] };
    const sessions = (await sresp.json()).data ?? [];
    if (!sessions.length) return { sessionId: "", messages: [] };
    const sessionId = sessions[0].id ?? "";

    const messages: { role: string; content: string; timestamp: string }[] = [];
    const streamResp = await fetch(
      `${HR_BASE}/sessions/${sessionId}/stream?backfillLimit=1000`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000) },
    );
    if (!streamResp.ok) return { sessionId, messages };

    const text = await streamResp.text();
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw.startsWith("{")) continue;
      try {
        const msg = JSON.parse(raw);
        const role = msg.role;
        const content = msg.content;
        if (role === "user" || role === "assistant") {
          if (typeof content === "string" && content.trim() && !content.trim().startsWith("{")) {
            messages.push({
              role,
              content,
              timestamp: msg.timestamp || msg.created_at || "",
            });
          }
        }
      } catch {
        /* skip */
      }
    }
    return { sessionId, messages };
  } catch {
    return { sessionId: "", messages: [] };
  }
}

async function logOrphanCalls() {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  const toolTypes = ["carrier_verify", "load_search", "negotiate"] as const;
  const recent = await db
    .select()
    .from(callEvents)
    .where(
      and(
        gte(callEvents.createdAt, cutoff),
        inArray(callEvents.eventType, [...toolTypes]),
      ),
    )
    .orderBy(callEvents.createdAt);

  const byCall = new Map<string, typeof recent>();
  for (const e of recent) {
    if (!e.callId.startsWith("LIVE-")) {
      if (!byCall.has(e.callId)) byCall.set(e.callId, []);
      byCall.get(e.callId)!.push(e);
    }
  }

  if (byCall.size === 0) return 0;

  const existing = await db
    .select({ callId: calls.callId })
    .from(calls)
    .where(inArray(calls.callId, [...byCall.keys()]));
  const existingSet = new Set(existing.map((c) => c.callId));

  let count = 0;
  for (const [callId, events] of byCall) {
    if (existingSet.has(callId)) continue;

    const recentLog = await db
      .select({ id: callEvents.id })
      .from(callEvents)
      .where(
        and(
          eq(callEvents.callId, callId),
          eq(callEvents.eventType, "call_logged"),
          gte(callEvents.createdAt, new Date(Date.now() - 2 * 60 * 1000)),
        ),
      )
      .limit(1);
    if (recentLog.length) continue;

    const callData: Record<string, unknown> = {
      callId,
      outcome: "dropped" as const,
      transcriptSummary:
        "Call ended before the agent logged an outcome. See transcript for details.",
    };

    for (const e of events) {
      const data = (e.payload ?? {}) as Record<string, unknown>;
      if (e.eventType === "carrier_verify") {
        if (!callData.carrierMcNumber && data.mc_number) callData.carrierMcNumber = data.mc_number;
        if (!callData.carrierName && data.legal_name) callData.carrierName = data.legal_name;
      } else if (e.eventType === "load_search") {
        if (!callData.originRequested && data.origin) callData.originRequested = data.origin;
        if (!callData.destinationRequested && data.destination)
          callData.destinationRequested = data.destination;
        if (!callData.equipmentRequested && data.equipment_type)
          callData.equipmentRequested = data.equipment_type;
      }
    }

    await db.insert(calls).values(callData as typeof calls.$inferInsert);
    await db.insert(callEvents).values({
      callId,
      eventType: "call_logged",
      payload: { source: "call-ended-orphan-recovery", outcome: "dropped" },
    });
    count++;
  }
  return count;
}

export async function handleCallEnded(payload: Record<string, unknown>) {
  let liveCallId = (payload.call_id as string) || "";
  let runId = "";
  let sessionStartedAt: Date | null = null;

  if (!liveCallId) {
    const active = await findActiveLiveSession();
    if (active) {
      liveCallId = active.callId;
      const payload = (active.payload ?? {}) as LiveSessionPayload;
      sessionStartedAt = active.createdAt;
      const settings = getSettings();
      runId = await resolveWorkflowRunId(
        payload,
        settings.happyrobotApiKey,
        payload.workflow_id || settings.happyrobotWorkflowId,
        sessionStartedAt,
      );
    }
  } else {
    const started = await db
      .select()
      .from(callEvents)
      .where(and(eq(callEvents.callId, liveCallId), eq(callEvents.eventType, "call_started")))
      .orderBy(sql`${callEvents.createdAt} desc`)
      .limit(1);
    if (started.length) {
      const payload = (started[0].payload ?? {}) as LiveSessionPayload;
      sessionStartedAt = started[0].createdAt;
      const settings = getSettings();
      runId = await resolveWorkflowRunId(
        payload,
        settings.happyrobotApiKey,
        payload.workflow_id || settings.happyrobotWorkflowId,
        sessionStartedAt,
      );
    }
  }

  const orphansLogged = await logOrphanCalls();

  let fallbackLogged = false;
  if (liveCallId && sessionStartedAt) {
    const recentCalls = await db
      .select()
      .from(calls)
      .where(gte(calls.createdAt, sessionStartedAt))
      .limit(1);
    const existingLive = await db
      .select()
      .from(calls)
      .where(eq(calls.callId, liveCallId))
      .limit(1);

    if (!recentCalls.length && !existingLive.length) {
      await db.insert(calls).values({
        callId: liveCallId,
        outcome: "dropped",
        transcriptSummary:
          "Call ended before the agent logged an outcome. See transcript for details.",
      });
      fallbackLogged = true;
    }
  }

  let transcriptAttached = 0;
  if (runId && sessionStartedAt) {
    const settings = getSettings();
    const { messages } = await fetchRunTranscript(runId, settings.happyrobotApiKey);
    const newCalls = await db
      .select()
      .from(calls)
      .where(gte(calls.createdAt, sessionStartedAt));

    for (const c of newCalls) {
      const extracted = { ...(c.extractedData ?? {}) };
      if (messages.length) extracted.transcript = messages;
      extracted.happyrobot_run_id = runId;
      if (liveCallId && c.callId !== liveCallId) extracted.live_call_id = liveCallId;
      await db.update(calls).set({ extractedData: extracted }).where(eq(calls.id, c.id));
      transcriptAttached++;
    }
  }

  if (liveCallId) {
    await db.insert(callEvents).values({
      callId: liveCallId,
      eventType: "call_logged",
      payload: { source: "call-ended-webhook", ...payload },
    });
  }

  return {
    status: "ok",
    call_id: liveCallId,
    orphans_logged: orphansLogged,
    fallback_logged: fallbackLogged,
    transcript_attached: transcriptAttached,
  };
}

export async function getTranscriptSession(callId?: string) {
  const active = await findActiveLiveSession(callId);
  if (!active) return { session_id: null };

  const payload = (active.payload ?? {}) as LiveSessionPayload;
  if (payload.session_id) return { session_id: payload.session_id };

  const settings = getSettings();
  if (!settings.happyrobotApiKey) return { session_id: null };

  const workflowId = payload.workflow_id || settings.happyrobotWorkflowId;
  const workflowRunId = await resolveWorkflowRunId(
    payload,
    settings.happyrobotApiKey,
    workflowId,
    active.createdAt,
  );
  if (!workflowRunId) return { session_id: null };

  const sessionId = await fetchSessionIdForRun(
    workflowRunId,
    settings.happyrobotApiKey,
  );
  if (!sessionId) return { session_id: null };

  await persistLiveSessionPayload(active.id, payload, {
    workflow_run_id: workflowRunId,
    session_id: sessionId,
  });

  return { session_id: sessionId };
}
