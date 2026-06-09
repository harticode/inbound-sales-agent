import { and, eq, sql } from "drizzle-orm";
import { getSettings } from "@/config/env";
import { db } from "@/db/client";
import { calls, loads, type Load } from "@/db/schema";
import { getRuntimeSettings } from "@/services/settings";
import { actionToResult } from "./messages";
import { coerceNegotiationPostureSettings } from "./settings";
import { NEGOTIATION_MAX_ROUNDS } from "./config";
import { computeLaneDemandStats } from "./lane-demand";
import { computeAction } from "./policy";
import { resolveDemandPosture } from "./posture";
import { round } from "@/lib/utils";
import type {
  NegotiationResult,
  DemandNegotiationContext,
  DemandNegotiationPosture,
} from "@/types";

export async function getDemandNegotiationContext(load: Load): Promise<DemandNegotiationContext> {
  const laneCalls = await db
    .select()
    .from(calls)
    .where(
      and(
        eq(calls.originRequested, load.origin),
        eq(calls.destinationRequested, load.destination),
        eq(calls.equipmentRequested, load.equipmentType),
      ),
    );

  const [availableResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loads)
    .where(
      and(
        eq(loads.status, "available"),
        eq(loads.origin, load.origin),
        eq(loads.destination, load.destination),
        eq(loads.equipmentType, load.equipmentType),
      ),
    );

  const availableLoads = availableResult?.count ?? 0;
  const laneStats = computeLaneDemandStats(laneCalls, availableLoads);

  const postureResult = resolveDemandPosture(laneStats, {
    availableLoadRatio:
      laneStats.requestCount > 0
        ? availableLoads / laneStats.requestCount
        : availableLoads,
    pickupDayOfWeek: load.pickupDatetime.getDay(),
  });

  return {
    posture: postureResult.posture,
    request_count: laneStats.requestCount,
    available_loads: availableLoads,
    conversion_rate: round(laneStats.conversionRate, 4),
    no_load_rate: round(laneStats.noLoadRate, 4),
    negotiation_loss_rate: round(laneStats.negotiationLossRate, 4),
    reason: postureResult.reason,
    posture_score: round(postureResult.score, 4),
  };
}

export async function evaluateOffer(
  loadboardRate: number,
  carrierOffer: number,
  currentRound: number,
  demandContext?: DemandNegotiationContext,
  previousBrokerCounters: number[] = [],
): Promise<NegotiationResult> {
  const env = getSettings();
  const rc = await getRuntimeSettings();
  const offerRatePct = (rc.offer_rate_pct as number) ?? env.offerRatePct;
  const minMarginPct =
    (rc.negotiation_min_margin_pct as number) ?? env.negotiationMinMarginPct;
  const postureSettings = coerceNegotiationPostureSettings(
    rc.negotiation_posture_config,
    minMarginPct,
  );

  if (loadboardRate <= 0) {
    return {
      accepted: false,
      counter_offer: null,
      message: "Invalid loadboard rate. Cannot negotiate.",
      round_number: currentRound,
      final: true,
      ...(demandContext
        ? {
            demand_posture: demandContext.posture,
            demand_reason: demandContext.reason,
          }
        : {}),
    };
  }

  const posture: DemandNegotiationPosture = demandContext?.posture ?? "balanced";

  const action = computeAction({
    loadboardRate,
    carrierOffer,
    currentRound,
    maxRounds: NEGOTIATION_MAX_ROUNDS,
    posture,
    offerRatePct,
    minMarginPct,
    postureSettings,
    previousBrokerCounters,
  });

  return actionToResult(action, currentRound, demandContext);
}
