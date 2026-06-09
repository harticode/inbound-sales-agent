import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null) return undefined;
  return value;
}

function parseCounterOffers(value: unknown) {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) return undefined;
  if (Array.isArray(normalized)) return normalized;
  if (typeof normalized === "string") {
    try {
      const parsed = JSON.parse(normalized);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseExtractedData(value: unknown) {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) return undefined;
  if (typeof normalized === "object" && normalized !== null && !Array.isArray(normalized)) {
    return normalized;
  }
  if (typeof normalized === "string") {
    try {
      const parsed = JSON.parse(normalized);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? parsed
        : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.union([z.number(), z.string()]).optional(),
);

export const createOrUpdateCallSchema = z
  .object({
    call_id: z.preprocess(emptyToUndefined, z.string().optional()),
    carrier_mc_number: z.preprocess(emptyToUndefined, z.string().optional()),
    carrier_name: z.preprocess(emptyToUndefined, z.string().optional()),
    caller_name: z.preprocess(emptyToUndefined, z.string().optional()),
    origin_requested: z.preprocess(emptyToUndefined, z.string().optional()),
    destination_requested: z.preprocess(emptyToUndefined, z.string().optional()),
    equipment_requested: z.preprocess(emptyToUndefined, z.string().optional()),
    loadboard_rate: optionalNumber,
    initial_offer: optionalNumber,
    final_agreed_rate: optionalNumber,
    counter_offers: z.preprocess(
      parseCounterOffers,
      z
        .array(
          z.object({
            round: z.number(),
            carrier: z.number(),
            broker: z.number().nullable(),
          }),
        )
        .optional(),
    ),
    negotiation_rounds: optionalNumber,
    outcome: z.preprocess(
      emptyToUndefined,
      z
        .enum([
          "booked",
          "declined",
          "no_loads",
          "carrier_not_eligible",
          "negotiation_failed",
          "transferred",
          "callback_requested",
          "dropped",
        ])
        .optional(),
    ),
    sentiment: z.preprocess(
      emptyToUndefined,
      z.enum(["positive", "neutral", "negative", "frustrated"]).optional(),
    ),
    call_duration_seconds: optionalNumber,
    notes: z.preprocess(emptyToUndefined, z.string().optional()),
    extracted_data: z.preprocess(parseExtractedData, z.record(z.unknown()).optional()),
    transcript_summary: z.preprocess(emptyToUndefined, z.string().optional()),
    started_at: z.preprocess(emptyToUndefined, z.string().optional()),
    ended_at: z.preprocess(emptyToUndefined, z.string().optional()),
    load_id: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .passthrough();

export const negotiateSchema = z.object({
  load_id: z.string().min(1),
  carrier_offer: z.union([z.number(), z.string()]),
  current_round: z.union([z.number(), z.string()]).optional(),
  previous_broker_counters: z.array(z.union([z.number(), z.string()])).optional(),
  call_id: z.string().optional(),
});

export const callStartedSchema = z
  .object({
    run_id: z.string().optional(),
    workflow_id: z.string().optional(),
  })
  .passthrough();

export const callEndedSchema = z
  .object({
    call_id: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough();

export const loadSearchSchema = z.object({
  origin: z.string().nullable().optional(),
  destination: z.string().nullable().optional(),
  equipment_type: z.string().nullable().optional(),
  min_rate: z.union([z.number(), z.string()]).nullable().optional(),
  max_weight: z.union([z.number(), z.string()]).nullable().optional(),
  pickup_date: z.string().nullable().optional(),
  call_id: z.string().optional(),
});

export const carrierVerifySchema = z.object({
  mc_number: z.string().min(1),
  call_id: z.string().optional(),
});
