import { and, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { calls } from "@/db/schema";
import {
  WON_OUTCOMES,
  NEGOTIATED_OUTCOMES,
  PRICING_LOSS_OUTCOMES,
  SENTIMENT_SCORES,
} from "@/lib/constants";
import { resolveDemandPosture } from "@/services/negotiation";
import { POSTURE_LABELS } from "@/services/negotiation/settings";
import { computeLaneDemandStats } from "@/services/negotiation/lane-demand";
import type { DemandNegotiationBreakdown, DemandNegotiationPosture } from "@/types";
import type { Call, Load } from "@/db/schema";

export function periodCutoff(period: string): Date | null {
  const now = new Date();
  if (period === "today") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  if (period === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (period === "30d") return new Date(now.getTime() - 30 * 86400000);
  return null;
}

export function periodLength(period: string): number | null {
  if (period === "today") return 86400000;
  if (period === "7d") return 7 * 86400000;
  if (period === "30d") return 30 * 86400000;
  return null;
}

function buildLaneCounts(allCalls: Call[]) {
  const laneCounts: Record<string, { lane: string; count: number; booked: number }> = {};
  for (const c of allCalls) {
    if (c.originRequested && c.destinationRequested) {
      const key = `${c.originRequested} → ${c.destinationRequested}`;
      if (!laneCounts[key]) laneCounts[key] = { lane: key, count: 0, booked: 0 };
      laneCounts[key].count++;
      if (WON_OUTCOMES.has(c.outcome)) laneCounts[key].booked++;
    }
  }
  return laneCounts;
}

export function aggregateCallStats(allCalls: Call[]) {
  const total = allCalls.length;
  const booked = allCalls.filter((c) => c.outcome === "booked").length;
  const declined = allCalls.filter((c) => c.outcome === "declined").length;
  const transferred = allCalls.filter((c) => c.outcome === "transferred").length;
  const bookingRate = total > 0 ? (booked + transferred) / total : 0;

  const rounds = allCalls.filter((c) => c.negotiationRounds > 0).map((c) => c.negotiationRounds);
  const avgRounds = rounds.length ? rounds.reduce((a, b) => a + b, 0) / rounds.length : 0;

  const discounts: number[] = [];
  for (const c of allCalls) {
    if (c.loadboardRate && c.finalAgreedRate && c.loadboardRate > 0) {
      discounts.push(((c.loadboardRate - c.finalAgreedRate) / c.loadboardRate) * 100);
    }
  }
  const avgDiscount = discounts.length ? discounts.reduce((a, b) => a + b, 0) / discounts.length : 0;

  const totalRevenue = allCalls
    .filter((c) => WON_OUTCOMES.has(c.outcome))
    .reduce((s, c) => s + (c.finalAgreedRate ?? 0), 0);

  const durations = allCalls.filter((c) => c.callDurationSeconds).map((c) => c.callDurationSeconds!);
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const sentimentDist: Record<string, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
    frustrated: 0,
  };
  for (const c of allCalls) sentimentDist[c.sentiment] = (sentimentDist[c.sentiment] ?? 0) + 1;

  const outcomeDist: Record<string, number> = {};
  for (const c of allCalls) {
    outcomeDist[c.outcome] = (outcomeDist[c.outcome] ?? 0) + 1;
  }

  const callsByDay: Record<string, number> = {};
  for (const c of allCalls) {
    const day = c.createdAt ? c.createdAt.toISOString().slice(0, 10) : "unknown";
    callsByDay[day] = (callsByDay[day] ?? 0) + 1;
  }
  const callsByDayList = Object.entries(callsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const laneCounts = buildLaneCounts(allCalls);
  const topLanes = Object.values(laneCounts).sort((a, b) => b.count - a.count).slice(0, 10);

  const equipmentDist: Record<string, number> = {};
  for (const c of allCalls) {
    const eq = c.equipmentRequested || "Unknown";
    equipmentDist[eq] = (equipmentDist[eq] ?? 0) + 1;
  }

  const rateComparison = allCalls
    .filter((c) => c.loadboardRate && c.finalAgreedRate)
    .map((c) => ({
      call_id: c.callId,
      loadboard_rate: c.loadboardRate!,
      agreed_rate: c.finalAgreedRate!,
      discount_pct: Math.round(((c.loadboardRate! - c.finalAgreedRate!) / c.loadboardRate!) * 1000) / 10,
    }));

  const funnel = [
    { stage: "Calls Received", count: total },
    {
      stage: "Carrier Verified",
      count: total - allCalls.filter((c) => c.outcome === "carrier_not_eligible").length,
    },
    {
      stage: "Load Matched",
      count:
        total -
        allCalls.filter((c) =>
          ["carrier_not_eligible", "no_loads"].includes(c.outcome),
        ).length,
    },
    {
      stage: "Negotiated",
      count: allCalls.filter((c) => NEGOTIATED_OUTCOMES.has(c.outcome)).length,
    },
    { stage: "Booked", count: allCalls.filter((c) => WON_OUTCOMES.has(c.outcome)).length },
  ];

  const totalSavings = allCalls
    .filter((c) => WON_OUTCOMES.has(c.outcome) && c.loadboardRate && c.finalAgreedRate)
    .reduce((s, c) => s + (c.loadboardRate! - c.finalAgreedRate!), 0);

  const roundStats: Record<number, { attempts: number; accepted: number; discounts: number[] }> = {
    1: { attempts: 0, accepted: 0, discounts: [] },
    2: { attempts: 0, accepted: 0, discounts: [] },
    3: { attempts: 0, accepted: 0, discounts: [] },
  };
  for (const c of allCalls) {
    if (c.negotiationRounds > 0 && c.counterOffers?.length) {
      const maxRound = Math.min(c.negotiationRounds, 3);
      for (let r = 1; r <= maxRound; r++) roundStats[r].attempts++;
      if (WON_OUTCOMES.has(c.outcome) && c.loadboardRate && c.finalAgreedRate && c.loadboardRate > 0) {
        roundStats[maxRound].accepted++;
        roundStats[maxRound].discounts.push(
          ((c.loadboardRate - c.finalAgreedRate) / c.loadboardRate) * 100,
        );
      }
    }
  }
  const negotiationBreakdown = [1, 2, 3].map((r) => {
    const s = roundStats[r];
    return {
      round: r,
      attempts: s.attempts,
      accepted: s.accepted,
      win_rate: s.attempts > 0 ? Math.round((s.accepted / s.attempts) * 1000) / 10 : 0,
      avg_discount_pct:
        s.discounts.length > 0
          ? Math.round((s.discounts.reduce((a, b) => a + b, 0) / s.discounts.length) * 100) / 100
          : 0,
    };
  });

  const lostRevenue = allCalls
    .filter((c) => PRICING_LOSS_OUTCOMES.has(c.outcome))
    .reduce((s, c) => s + (c.loadboardRate ?? 0), 0);

  const hourBuckets: Record<string, number> = {};
  for (const c of allCalls) {
    if (c.createdAt) {
      const key = `${c.createdAt.getUTCDay()}-${c.createdAt.getUTCHours()}`;
      hourBuckets[key] = (hourBuckets[key] ?? 0) + 1;
    }
  }
  const peakHours = Object.entries(hourBuckets)
    .map(([k, count]) => {
      const [day, hour] = k.split("-").map(Number);
      return { day, hour, count };
    })
    .sort((a, b) => b.count - a.count);

  const carrierStats: Record<
    string,
    { carrier_name: string; count: number; booked: number; sentiments: number[] }
  > = {};
  for (const c of allCalls) {
    const mc = c.carrierMcNumber;
    if (!mc) continue;
    if (!carrierStats[mc]) {
      carrierStats[mc] = { carrier_name: c.carrierName || "", count: 0, booked: 0, sentiments: [] };
    }
    carrierStats[mc].count++;
    if (WON_OUTCOMES.has(c.outcome)) carrierStats[mc].booked++;
    carrierStats[mc].sentiments.push(SENTIMENT_SCORES[c.sentiment] ?? 2);
    if (c.carrierName) carrierStats[mc].carrier_name = c.carrierName;
  }

  const carrierLeaderboard = Object.entries(carrierStats)
    .map(([mc, stats]) => {
      const avgSent =
        stats.sentiments.length > 0
          ? stats.sentiments.reduce((a, b) => a + b, 0) / stats.sentiments.length
          : 2;
      return {
        mc_number: mc,
        name: stats.carrier_name,
        total_calls: stats.count,
        booked: stats.booked,
        booking_rate: stats.count > 0 ? Math.round((stats.booked / stats.count) * 10000) / 10000 : 0,
        avg_sentiment_score: Math.round(avgSent * 100) / 100,
      };
    })
    .sort((a, b) => b.total_calls - a.total_calls)
    .slice(0, 10);

  const laneRevenue: Record<string, number> = {};
  for (const c of allCalls) {
    if (c.originRequested && c.destinationRequested && WON_OUTCOMES.has(c.outcome)) {
      const key = `${c.originRequested} → ${c.destinationRequested}`;
      laneRevenue[key] = (laneRevenue[key] ?? 0) + (c.finalAgreedRate ?? 0);
    }
  }

  return {
    total,
    booked,
    declined,
    transferred,
    bookingRate,
    avgRounds,
    avgDiscount,
    totalRevenue,
    avgDuration,
    sentimentDist,
    outcomeDist,
    callsByDayList,
    laneCounts,
    topLanes,
    equipmentDist,
    rateComparison,
    funnel,
    totalSavings,
    negotiationBreakdown,
    lostRevenue,
    peakHours,
    carrierLeaderboard,
    laneRevenue,
  };
}

function laneKey(origin: string, destination: string, equipment: string) {
  return `${origin}|${destination}|${equipment}`;
}

function availableLoadsForLane(allAvailableLoads: Load[], origin: string, destination: string, equipment: string) {
  return allAvailableLoads.filter(
    (load) =>
      load.origin === origin &&
      load.destination === destination &&
      load.equipmentType === equipment,
  ).length;
}

export function buildDemandNegotiationBreakdown(
  allCalls: Call[],
  allAvailableLoads: Load[],
  eventPostures: Map<string, DemandNegotiationPosture>,
): DemandNegotiationBreakdown[] {
  const laneCalls: Record<string, Call[]> = {};
  for (const call of allCalls) {
    if (!call.originRequested || !call.destinationRequested) continue;
    const key = laneKey(call.originRequested, call.destinationRequested, call.equipmentRequested || "");
    laneCalls[key] = laneCalls[key] ?? [];
    laneCalls[key].push(call);
  }

  const postureStats: Record<
    DemandNegotiationPosture,
    { attempts: number; accepted: number; discounts: number[] }
  > = {
    protect_margin: { attempts: 0, accepted: 0, discounts: [] },
    balanced: { attempts: 0, accepted: 0, discounts: [] },
    win_capacity: { attempts: 0, accepted: 0, discounts: [] },
  };

  for (const call of allCalls) {
    if (call.negotiationRounds <= 0 || !call.counterOffers?.length) continue;

    let posture = eventPostures.get(call.callId);
    if (!posture && call.originRequested && call.destinationRequested) {
      const key = laneKey(call.originRequested, call.destinationRequested, call.equipmentRequested || "");
      const peers = laneCalls[key] ?? [];
      const availableLoads = availableLoadsForLane(
        allAvailableLoads,
        call.originRequested,
        call.destinationRequested,
        call.equipmentRequested || "",
      );

      posture = resolveDemandPosture(
        computeLaneDemandStats(peers, availableLoads),
      ).posture;
    }

    posture = posture ?? "balanced";
    postureStats[posture].attempts++;

    if (WON_OUTCOMES.has(call.outcome)) {
      postureStats[posture].accepted++;
      if (call.loadboardRate && call.finalAgreedRate && call.loadboardRate > 0) {
        postureStats[posture].discounts.push(
          ((call.loadboardRate - call.finalAgreedRate) / call.loadboardRate) * 100,
        );
      }
    }
  }

  return (["protect_margin", "balanced", "win_capacity"] as const).map((posture) => {
    const stats = postureStats[posture];
    return {
      posture,
      label: POSTURE_LABELS[posture].title,
      attempts: stats.attempts,
      accepted: stats.accepted,
      win_rate: stats.attempts > 0 ? Math.round((stats.accepted / stats.attempts) * 1000) / 10 : 0,
      avg_discount_pct:
        stats.discounts.length > 0
          ? Math.round((stats.discounts.reduce((a, b) => a + b, 0) / stats.discounts.length) * 100) / 100
          : 0,
    };
  });
}

export async function buildPeriodComparison(cutoff: Date | null, pLen: number | null, period: string) {
  if (!cutoff || !pLen) return {};

  const prevCutoff = new Date(cutoff.getTime() - pLen);
  const prevCalls = await db
    .select()
    .from(calls)
    .where(and(gte(calls.createdAt, prevCutoff), lt(calls.createdAt, cutoff)));

  const prevTotal = prevCalls.length;
  const prevBooked = prevCalls.filter((c) => WON_OUTCOMES.has(c.outcome)).length;
  const prevRevenue = prevCalls
    .filter((c) => WON_OUTCOMES.has(c.outcome))
    .reduce((s, c) => s + (c.finalAgreedRate ?? 0), 0);
  const prevDiscounts: number[] = [];
  for (const c of prevCalls) {
    if (c.loadboardRate && c.finalAgreedRate && c.loadboardRate > 0) {
      prevDiscounts.push(((c.loadboardRate - c.finalAgreedRate) / c.loadboardRate) * 100);
    }
  }
  const prevAvgDiscount = prevDiscounts.length
    ? prevDiscounts.reduce((a, b) => a + b, 0) / prevDiscounts.length
    : 0;

  return {
    total_calls_prev: prevTotal,
    total_booked_prev: prevBooked,
    revenue_prev: Math.round(prevRevenue * 100) / 100,
    discount_pct_prev: Math.round(prevAvgDiscount * 100) / 100,
  };
}

export function buildAgentImpact(
  total: number,
  bookingRate: number,
  totalRevenue: number,
  allCalls: Call[],
  avgHumanHandle: number,
  avgHumanCost: number,
) {
  return {
    hours_saved: Math.round((total * avgHumanHandle) / 60 * 10) / 10,
    cost_savings: Math.round(total * avgHumanCost * 100) / 100,
    avg_human_cost_per_call: avgHumanCost,
    avg_handle_time_minutes: avgHumanHandle,
    automation_rate: Math.round(bookingRate * 10000) / 10000,
    calls_outside_business_hours: allCalls.filter(
      (c) => c.createdAt && (c.createdAt.getUTCHours() < 8 || c.createdAt.getUTCHours() >= 18),
    ).length,
    revenue_per_call: total > 0 ? Math.round((totalRevenue / total) * 100) / 100 : 0,
  };
}
