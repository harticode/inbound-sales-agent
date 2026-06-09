import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { calls, callEvents, loads } from "@/db/schema";
import { getRuntimeSettings } from "@/services/settings";
import {
  periodCutoff,
  periodLength,
  aggregateCallStats,
  buildDemandNegotiationBreakdown,
  buildPeriodComparison,
  buildAgentImpact,
} from "./aggregation";
import type { DemandNegotiationPosture } from "@/types";
import {
  buildLaneDemandVsInventory,
  buildLaneRoutes,
  buildDemandProfiles,
  buildDemandKpis,
} from "./demand";

export async function getMetrics(period = "all") {
  const cutoff = periodCutoff(period);
  const allCalls = cutoff
    ? await db.select().from(calls).where(gte(calls.createdAt, cutoff))
    : await db.select().from(calls);

  const stats = aggregateCallStats(allCalls);

  const rc = await getRuntimeSettings();
  const avgHumanHandle = (rc.agent_avg_human_handle_minutes as number) ?? 8;
  const avgHumanCost = (rc.agent_avg_human_cost_per_call as number) ?? 12.5;

  const agentImpact = buildAgentImpact(
    stats.total,
    stats.bookingRate,
    stats.totalRevenue,
    allCalls,
    avgHumanHandle,
    avgHumanCost,
  );

  const allLoadRows = await db.select().from(loads);
  const allAvailableLoads = allLoadRows.filter((ld) => ld.status === "available");

  const callIds = allCalls.map((call) => call.callId);
  const negotiateEvents =
    callIds.length > 0
      ? await db
          .select()
          .from(callEvents)
          .where(and(eq(callEvents.eventType, "negotiate"), inArray(callEvents.callId, callIds)))
      : [];

  const eventPostures = new Map<string, DemandNegotiationPosture>();
  for (const event of negotiateEvents) {
    if (eventPostures.has(event.callId)) continue;
    const posture = event.payload?.demand_posture;
    if (posture === "protect_margin" || posture === "balanced" || posture === "win_capacity") {
      eventPostures.set(event.callId, posture);
    }
  }

  const demandNegotiationBreakdown = buildDemandNegotiationBreakdown(
    allCalls,
    allAvailableLoads,
    eventPostures,
  );
  const laneDemandVsInventory = buildLaneDemandVsInventory(stats.laneCounts, allAvailableLoads);
  const laneRoutes = buildLaneRoutes(stats.laneCounts, laneDemandVsInventory, stats.laneRevenue);
  const demandProfiles = buildDemandProfiles(allCalls, allLoadRows, allAvailableLoads);
  const demandKpis = buildDemandKpis(
    allCalls,
    stats.laneCounts,
    stats.topLanes,
    stats.equipmentDist,
    demandProfiles,
  );

  const periodComparison = await buildPeriodComparison(cutoff, periodLength(period), period);

  return {
    total_calls: stats.total,
    total_booked: stats.booked + stats.transferred,
    total_declined: stats.declined,
    booking_rate: Math.round(stats.bookingRate * 10000) / 10000,
    avg_negotiation_rounds: Math.round(stats.avgRounds * 100) / 100,
    avg_discount_pct: Math.round(stats.avgDiscount * 100) / 100,
    total_revenue_booked: Math.round(stats.totalRevenue * 100) / 100,
    avg_call_duration_seconds: Math.round(stats.avgDuration * 10) / 10,
    sentiment_distribution: stats.sentimentDist,
    outcome_distribution: stats.outcomeDist,
    calls_by_day: stats.callsByDayList,
    top_lanes: stats.topLanes,
    equipment_distribution: stats.equipmentDist,
    rate_comparison: stats.rateComparison,
    conversion_funnel: stats.funnel,
    total_margin_saved: Math.round(stats.totalSavings * 100) / 100,
    lost_revenue: Math.round(stats.lostRevenue * 100) / 100,
    peak_hours: stats.peakHours,
    carrier_leaderboard: stats.carrierLeaderboard,
    lane_demand_vs_inventory: laneDemandVsInventory,
    lane_routes: laneRoutes,
    demand_kpis: demandKpis,
    demand_profiles: demandProfiles,
    period_comparison: periodComparison,
    agent_impact: agentImpact,
    negotiation_breakdown: stats.negotiationBreakdown,
    demand_negotiation_breakdown: demandNegotiationBreakdown,
  };
}
