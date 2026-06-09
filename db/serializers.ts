import type { Call, CallEvent, Load } from "@/db/schema";
import { getSettings } from "@/config/env";
import { getRuntimeSettings } from "@/services/settings";

export function serializeCall(call: Call) {
  return {
    id: call.id,
    call_id: call.callId,
    carrier_mc_number: call.carrierMcNumber,
    carrier_name: call.carrierName,
    caller_name: call.callerName,
    origin_requested: call.originRequested,
    destination_requested: call.destinationRequested,
    equipment_requested: call.equipmentRequested,
    loadboard_rate: call.loadboardRate,
    initial_offer: call.initialOffer,
    final_agreed_rate: call.finalAgreedRate,
    counter_offers: call.counterOffers ?? [],
    negotiation_rounds: call.negotiationRounds,
    outcome: call.outcome,
    sentiment: call.sentiment,
    call_duration_seconds: call.callDurationSeconds,
    notes: call.notes,
    extracted_data: call.extractedData ?? {},
    transcript_summary: call.transcriptSummary,
    started_at: call.startedAt?.toISOString() ?? null,
    ended_at: call.endedAt?.toISOString() ?? null,
    created_at: call.createdAt.toISOString(),
  };
}

export function serializeCallEvent(event: CallEvent) {
  return {
    id: event.id,
    call_id: event.callId,
    event_type: event.eventType,
    payload: event.payload ?? {},
    created_at: event.createdAt.toISOString(),
  };
}

export async function serializeLoad(load: Load, includeLoadboardRate = true) {
  const env = getSettings();
  const rc = await getRuntimeSettings();
  const offerPct = (rc.offer_rate_pct as number) ?? env.offerRatePct;

  const base = {
    id: load.id,
    load_id: load.loadId,
    origin: load.origin,
    destination: load.destination,
    pickup_datetime: load.pickupDatetime.toISOString(),
    delivery_datetime: load.deliveryDatetime.toISOString(),
    equipment_type: load.equipmentType,
    notes: load.notes ?? "",
    weight: load.weight,
    commodity_type: load.commodityType ?? "",
    num_of_pieces: load.numOfPieces,
    miles: load.miles,
    dimensions: load.dimensions ?? "",
    status: load.status,
    created_at: load.createdAt.toISOString(),
  };

  if (includeLoadboardRate) {
    return {
      ...base,
      loadboard_rate: load.loadboardRate,
      offer_rate: Math.round(load.loadboardRate * offerPct * 100) / 100,
    };
  }

  return {
    ...base,
    offer_rate: Math.round(load.loadboardRate * offerPct * 100) / 100,
  };
}
