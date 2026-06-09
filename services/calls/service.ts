import { and, eq, ilike, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db/client";
import { calls, carriers, loads, callEvents } from "@/db/schema";
import { serializeCall, serializeCallEvent } from "@/db/serializers";
import { coerceFloat, coerceInt } from "@/lib/utils";

const CLOSING_MESSAGES: Record<string, string> = {
  transferred:
    "Transfer was successful. A sales rep will take it from here — thank you for calling Acme Logistics.",
  declined: "Understood. We'll keep you in mind for future loads. Thank you for calling Acme Logistics.",
  no_loads:
    "We don't have anything on that lane right now. Feel free to call back anytime. Thank you for calling Acme Logistics.",
  carrier_not_eligible:
    "I'm sorry, we can't book loads with unauthorized carriers. Thank you for calling Acme Logistics.",
  negotiation_failed:
    "That's the best we can do on this one. Thank you for calling Acme Logistics — feel free to check back on other lanes.",
};

export function getClosingMessage(outcome: string | null | undefined): string | undefined {
  if (!outcome) return undefined;
  return CLOSING_MESSAGES[outcome];
}

type SerializedCall = ReturnType<typeof serializeCall>;

type EnrichedCallResponse = SerializedCall & {
  closing_message?: string;
};

export function enrichCallResponse(call: SerializedCall): EnrichedCallResponse {
  const closingMessage = getClosingMessage(call.outcome);
  return closingMessage ? { ...call, closing_message: closingMessage } : call;
}

export async function listCalls(options: {
  limit?: number;
  offset?: number;
  outcome?: string | null;
  sentiment?: string | null;
}) {
  const { limit = 50, offset = 0, outcome, sentiment } = options;
  const conditions = [];
  if (outcome) conditions.push(eq(calls.outcome, outcome as typeof calls.outcome.enumValues[number]));
  if (sentiment) conditions.push(eq(calls.sentiment, sentiment as typeof calls.sentiment.enumValues[number]));

  const rows = await db
    .select()
    .from(calls)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${calls.createdAt} desc`)
    .offset(offset)
    .limit(limit);

  return rows.map(serializeCall);
}

export async function getCallDetail(callId: string) {
  let [call] = await db.select().from(calls).where(eq(calls.callId, callId)).limit(1);

  if (!call && callId.startsWith("LIVE-")) {
    [call] = await db
      .select()
      .from(calls)
      .where(sql`${calls.extractedData}->>'live_call_id' = ${callId}`)
      .limit(1);
  }

  let events = await db
    .select()
    .from(callEvents)
    .where(eq(callEvents.callId, callId))
    .orderBy(callEvents.createdAt);

  if (call && call.callId !== callId) {
    const extra = await db
      .select()
      .from(callEvents)
      .where(eq(callEvents.callId, call.callId))
      .orderBy(callEvents.createdAt);
    const seen = new Set(events.map((e) => e.id));
    events = [...events, ...extra.filter((e) => !seen.has(e.id))].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  const eventList = events.map(serializeCallEvent);

  if (call) {
    return { ...serializeCall(call), events: eventList };
  }

  if (!events.length) return null;

  const carrierEvent = events.find((e) => e.eventType === "carrier_verify");
  const searchEvent = events.find((e) => e.eventType === "load_search");
  const cp = (carrierEvent?.payload ?? {}) as Record<string, string>;
  const sp = (searchEvent?.payload ?? {}) as Record<string, string>;

  return {
    id: 0,
    call_id: callId,
    carrier_mc_number: cp.mc_number ?? "",
    carrier_name: cp.legal_name ?? "",
    caller_name: "",
    origin_requested: sp.origin ?? "",
    destination_requested: sp.destination ?? "",
    equipment_requested: sp.equipment ?? "",
    loadboard_rate: null,
    initial_offer: null,
    final_agreed_rate: null,
    counter_offers: [],
    negotiation_rounds: 0,
    outcome: "in_progress",
    sentiment: "neutral",
    call_duration_seconds: null,
    notes: "",
    extracted_data: {},
    transcript_summary: "",
    started_at: events[0]?.createdAt.toISOString() ?? null,
    ended_at: null,
    created_at: events[0]?.createdAt.toISOString() ?? null,
    events: eventList,
    live: true,
  };
}

export async function createOrUpdateCall(body: Record<string, unknown>) {
  const callId = (body.call_id as string) || `HR-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  const [existing] = await db.select().from(calls).where(eq(calls.callId, callId)).limit(1);

  let carrierId: number | null = null;
  let carrierMc = String(body.carrier_mc_number ?? "");
  let carrierName = String(body.carrier_name ?? "");

  if (carrierMc) {
    const mc = carrierMc.trim().toUpperCase().replace(/MC/g, "").replace(/-/g, "").trim();
    const [carrierRow] = await db.select().from(carriers).where(eq(carriers.mcNumber, mc)).limit(1);
    if (carrierRow) {
      carrierId = carrierRow.id;
      if (!carrierMc) carrierMc = carrierRow.mcNumber;
      if (!carrierName) carrierName = carrierRow.legalName ?? "";
    }
  } else if (carrierName) {
    const safeName = carrierName.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const [carrierRow] = await db
      .select()
      .from(carriers)
      .where(ilike(carriers.legalName, `%${safeName}%`))
      .limit(1);
    if (carrierRow) {
      carrierId = carrierRow.id;
      carrierMc = carrierRow.mcNumber;
      carrierName = carrierRow.legalName ?? "";
    }
  }

  let loadDbId: number | null = null;
  const loadIdStr = body.load_id as string | undefined;
  if (loadIdStr) {
    const [load] = await db.select().from(loads).where(eq(loads.loadId, loadIdStr)).limit(1);
    if (load) {
      loadDbId = load.id;
    }
  }

  const callValues = {
    carrierMcNumber:
      body.carrier_mc_number !== undefined
        ? String(body.carrier_mc_number ?? "")
        : (existing?.carrierMcNumber ?? carrierMc),
    carrierName:
      body.carrier_name !== undefined
        ? String(body.carrier_name ?? "")
        : (existing?.carrierName ?? carrierName),
    callerName:
      body.caller_name !== undefined
        ? String(body.caller_name ?? "")
        : (existing?.callerName ?? ""),
    originRequested:
      body.origin_requested !== undefined
        ? String(body.origin_requested ?? "")
        : (existing?.originRequested ?? ""),
    destinationRequested:
      body.destination_requested !== undefined
        ? String(body.destination_requested ?? "")
        : (existing?.destinationRequested ?? ""),
    equipmentRequested:
      body.equipment_requested !== undefined
        ? String(body.equipment_requested ?? "")
        : (existing?.equipmentRequested ?? ""),
    loadboardRate:
      body.loadboard_rate !== undefined
        ? coerceFloat(body.loadboard_rate)
        : (existing?.loadboardRate ?? null),
    initialOffer:
      body.initial_offer !== undefined
        ? coerceFloat(body.initial_offer)
        : (existing?.initialOffer ?? null),
    finalAgreedRate:
      body.final_agreed_rate !== undefined
        ? coerceFloat(body.final_agreed_rate)
        : (existing?.finalAgreedRate ?? null),
    counterOffers:
      body.counter_offers !== undefined
        ? ((body.counter_offers as typeof calls.$inferInsert.counterOffers) ?? [])
        : (existing?.counterOffers ?? []),
    negotiationRounds:
      body.negotiation_rounds !== undefined
        ? coerceInt(body.negotiation_rounds)
        : (existing?.negotiationRounds ?? 0),
    outcome:
      body.outcome !== undefined
        ? ((body.outcome as typeof calls.$inferInsert.outcome) ?? "dropped")
        : (existing?.outcome ?? "dropped"),
    sentiment:
      body.sentiment !== undefined
        ? ((body.sentiment as typeof calls.$inferInsert.sentiment) ?? "neutral")
        : (existing?.sentiment ?? "neutral"),
    callDurationSeconds:
      body.call_duration_seconds !== undefined
        ? body.call_duration_seconds
          ? coerceInt(body.call_duration_seconds)
          : null
        : (existing?.callDurationSeconds ?? null),
    notes:
      body.notes !== undefined ? String(body.notes ?? "") : (existing?.notes ?? ""),
    extractedData:
      body.extracted_data !== undefined
        ? ((body.extracted_data as Record<string, unknown>) ?? {})
        : (existing?.extractedData ?? {}),
    transcriptSummary:
      body.transcript_summary !== undefined
        ? String(body.transcript_summary ?? "")
        : (existing?.transcriptSummary ?? ""),
    startedAt:
      body.started_at !== undefined
        ? body.started_at
          ? new Date(body.started_at as string)
          : undefined
        : existing?.startedAt,
    endedAt:
      body.ended_at !== undefined
        ? body.ended_at
          ? new Date(body.ended_at as string)
          : undefined
        : existing?.endedAt,
    carrierId: carrierId ?? existing?.carrierId ?? null,
    loadId: loadDbId ?? existing?.loadId ?? null,
  };

  if (loadDbId) {
    const [load] = await db.select().from(loads).where(eq(loads.id, loadDbId)).limit(1);
    if (load) {
      if (!callValues.loadboardRate) callValues.loadboardRate = load.loadboardRate;
      if (!callValues.originRequested) callValues.originRequested = load.origin;
      if (!callValues.destinationRequested) callValues.destinationRequested = load.destination;
      if (!callValues.equipmentRequested) callValues.equipmentRequested = load.equipmentType;
    }
  }

  if (existing) {
    await db.update(calls).set(callValues).where(eq(calls.id, existing.id));
    const [updated] = await db.select().from(calls).where(eq(calls.id, existing.id)).limit(1);
    await db.insert(callEvents).values({
      callId: updated!.callId,
      eventType: "call_logged",
      payload: { outcome: updated!.outcome, final_rate: updated!.finalAgreedRate },
    });
    return { call: enrichCallResponse(serializeCall(updated!)), status: 200 };
  }

  const [created] = await db
    .insert(calls)
    .values({ callId, ...callValues })
    .returning();

  await db.insert(callEvents).values({
    callId: created.callId,
    eventType: "call_logged",
    payload: { outcome: created.outcome, final_rate: created.finalAgreedRate },
  });

  return { call: enrichCallResponse(serializeCall(created)), status: 201 };
}

export async function updateCall(callId: string, body: Record<string, unknown>) {
  const [call] = await db.select().from(calls).where(eq(calls.callId, callId)).limit(1);
  if (!call) return null;

  const updates: Partial<typeof calls.$inferInsert> = {};
  const skip = new Set(["id", "call_id", "carrier_id", "load_id"]);

  if (body.load_id) {
    const [load] = await db.select().from(loads).where(eq(loads.loadId, String(body.load_id))).limit(1);
    if (load) updates.loadId = load.id;
  }

  for (const [key, value] of Object.entries(body)) {
    if (skip.has(key) || value === undefined) continue;
    const map: Record<string, keyof typeof updates> = {
      carrier_mc_number: "carrierMcNumber",
      carrier_name: "carrierName",
      caller_name: "callerName",
      origin_requested: "originRequested",
      destination_requested: "destinationRequested",
      equipment_requested: "equipmentRequested",
      loadboard_rate: "loadboardRate",
      initial_offer: "initialOffer",
      final_agreed_rate: "finalAgreedRate",
      counter_offers: "counterOffers",
      negotiation_rounds: "negotiationRounds",
      outcome: "outcome",
      sentiment: "sentiment",
      call_duration_seconds: "callDurationSeconds",
      notes: "notes",
      extracted_data: "extractedData",
      transcript_summary: "transcriptSummary",
      ended_at: "endedAt",
    };
    const field = map[key];
    if (field) {
      (updates as Record<string, unknown>)[field] =
        key === "ended_at" ? new Date(value as string) : value;
    }
  }

  await db.update(calls).set(updates).where(eq(calls.id, call.id));
  const [updated] = await db.select().from(calls).where(eq(calls.id, call.id)).limit(1);
  return serializeCall(updated!);
}

export async function exportCallsCsv() {
  const allCalls = await db.select().from(calls).orderBy(sql`${calls.createdAt} desc`);
  const header = [
    "call_id", "carrier_name", "carrier_mc", "lane", "equipment",
    "loadboard_rate", "agreed_rate", "discount_pct", "rounds",
    "outcome", "sentiment", "duration", "created_at",
  ];
  const rows = allCalls.map((c) => {
    const lane =
      c.originRequested && c.destinationRequested
        ? `${c.originRequested} → ${c.destinationRequested}`
        : "";
    const discountPct =
      c.loadboardRate && c.finalAgreedRate && c.loadboardRate > 0
        ? Math.round(((c.loadboardRate - c.finalAgreedRate) / c.loadboardRate) * 1000) / 10
        : 0;
    return [
      c.callId,
      c.carrierName,
      c.carrierMcNumber,
      lane,
      c.equipmentRequested,
      c.loadboardRate,
      c.finalAgreedRate,
      discountPct,
      c.negotiationRounds,
      c.outcome,
      c.sentiment,
      c.callDurationSeconds,
      c.createdAt?.toISOString() ?? "",
    ];
  });
  return [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}
