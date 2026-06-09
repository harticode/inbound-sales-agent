import { geocodeLane } from "@/lib/geo/us-cities";
import { WON_OUTCOMES, PRICING_LOSS_OUTCOMES, PICKUP_DAYS } from "@/lib/constants";
import { avg, round } from "@/lib/utils";
import type { DemandRecommendation } from "@/types";
import type { Call, Load } from "@/db/schema";

function includesLocation(source: string, target: string) {
  return Boolean(source && target && source.toLowerCase().includes(target.toLowerCase()));
}

function loadMatchesDemand(load: Load, origin: string, destination: string, equipment: string) {
  return (
    includesLocation(load.origin, origin) &&
    includesLocation(load.destination, destination) &&
    (!equipment || equipment === "Unknown" || load.equipmentType.toLowerCase().includes(equipment.toLowerCase()))
  );
}

function pickupWindow(load: Load) {
  const pickup = load.pickupDatetime;
  const hour = pickup.getUTCHours();
  const day = PICKUP_DAYS[pickup.getUTCDay()];
  const part = hour < 12 ? "AM" : hour < 17 ? "PM" : "Evening";
  return `${day} ${part}`;
}

function recommendationForDemand(args: {
  requestCount: number;
  conversionRate: number;
  noLoadRate: number;
  negotiationLossRate: number;
  availableLoads: number;
}): {
  recommendation: DemandRecommendation;
  recommendationLabel: string;
  recommendationReason: string;
} {
  const { requestCount, conversionRate, noLoadRate, negotiationLossRate, availableLoads } = args;

  if (requestCount >= 2 && noLoadRate <= 0.25 && conversionRate >= 0.4 && availableLoads <= requestCount) {
    return {
      recommendation: "raise_rate",
      recommendationLabel: "Ask higher",
      recommendationReason: "Repeated demand with limited supply and healthy conversion gives room to protect rate.",
    };
  }

  if (availableLoads > requestCount && (conversionRate < 0.25 || negotiationLossRate >= 0.4)) {
    return {
      recommendation: "be_flexible",
      recommendationLabel: "Be flexible",
      recommendationReason: "Inventory is available but conversion is soft, so a more tolerant negotiation stance can recover volume.",
    };
  }

  if (requestCount <= 1 && availableLoads > 0) {
    return {
      recommendation: "be_flexible",
      recommendationLabel: "Be flexible",
      recommendationReason: "Demand is light on this profile, so keep pricing flexible to avoid idle inventory.",
    };
  }

  return {
    recommendation: "hold_rate",
    recommendationLabel: "Hold",
    recommendationReason: "Demand and supply are balanced enough to keep the current pricing posture.",
  };
}

export function buildLaneDemandVsInventory(
  laneCounts: Record<string, { lane: string; count: number; booked: number }>,
  allAvailableLoads: Load[],
) {
  return Object.values(laneCounts).map((laneData) => {
    const parts = laneData.lane.split(" → ");
    const originPart = parts[0] ?? "";
    const destPart = parts[1] ?? "";
    const available = allAvailableLoads.filter(
      (ld) =>
        originPart &&
        destPart &&
        ld.origin.toLowerCase().includes(originPart.toLowerCase()) &&
        ld.destination.toLowerCase().includes(destPart.toLowerCase()),
    ).length;
    return {
      lane: laneData.lane,
      call_count: laneData.count,
      available_loads: available,
    };
  });
}

export function buildLaneRoutes(
  laneCounts: Record<string, { lane: string; count: number; booked: number }>,
  laneDemandVsInventory: { lane: string; call_count: number; available_loads: number }[],
  laneRevenue: Record<string, number>,
) {
  return Object.values(laneCounts)
    .map((laneData) => {
      const parts = laneData.lane.split(" → ");
      const origin = parts[0] ?? "";
      const destination = parts[1] ?? "";
      const demandEntry = laneDemandVsInventory.find((d) => d.lane === laneData.lane);
      const availableLoads = demandEntry?.available_loads ?? 0;
      const geo = geocodeLane(origin, destination);
      const conversionRate = laneData.count > 0 ? laneData.booked / laneData.count : 0;

      if (!geo.geocoded) {
        return {
          lane: laneData.lane,
          origin,
          destination,
          origin_coords: [0, 0] as [number, number],
          dest_coords: [0, 0] as [number, number],
          call_count: laneData.count,
          booked_count: laneData.booked,
          conversion_rate: Math.round(conversionRate * 10000) / 10000,
          revenue_booked: Math.round((laneRevenue[laneData.lane] ?? 0) * 100) / 100,
          available_loads: availableLoads,
          supply_gap: laneData.count > availableLoads,
          geocoded: false,
        };
      }

      return {
        lane: laneData.lane,
        origin,
        destination,
        origin_coords: geo.origin_coords,
        dest_coords: geo.dest_coords,
        call_count: laneData.count,
        booked_count: laneData.booked,
        conversion_rate: Math.round(conversionRate * 10000) / 10000,
        revenue_booked: Math.round((laneRevenue[laneData.lane] ?? 0) * 100) / 100,
        available_loads: availableLoads,
        supply_gap: laneData.count > availableLoads,
        geocoded: true,
      };
    })
    .sort((a, b) => b.call_count - a.call_count);
}

export function buildDemandProfiles(allCalls: Call[], allLoadRows: Load[], allAvailableLoads: Load[]) {
  const demandGroups: Record<
    string,
    {
      lane: string;
      origin: string;
      destination: string;
      equipment: string;
      requestCount: number;
      noLoadCount: number;
      negotiationFailedCount: number;
      declinedCount: number;
      bookedCount: number;
    }
  > = {};

  for (const c of allCalls) {
    const origin = c.originRequested?.trim() ?? "";
    const destination = c.destinationRequested?.trim() ?? "";
    if (!origin || !destination) continue;

    const equipment = c.equipmentRequested?.trim() || "Unknown";
    const lane = `${origin} → ${destination}`;
    const key = `${lane}||${equipment}`;
    if (!demandGroups[key]) {
      demandGroups[key] = {
        lane,
        origin,
        destination,
        equipment,
        requestCount: 0,
        noLoadCount: 0,
        negotiationFailedCount: 0,
        declinedCount: 0,
        bookedCount: 0,
      };
    }

    const group = demandGroups[key];
    group.requestCount++;
    if (c.outcome === "no_loads") group.noLoadCount++;
    if (c.outcome === "negotiation_failed") group.negotiationFailedCount++;
    if (c.outcome === "declined") group.declinedCount++;
    if (WON_OUTCOMES.has(c.outcome)) group.bookedCount++;
  }

  return Object.values(demandGroups)
    .map((group) => {
      const availableMatches = allAvailableLoads.filter((ld) =>
        loadMatchesDemand(ld, group.origin, group.destination, group.equipment),
      );
      const profileLoads = allLoadRows.filter((ld) =>
        loadMatchesDemand(ld, group.origin, group.destination, group.equipment),
      );
      const miles = profileLoads
        .map((ld) => ld.miles)
        .filter((value): value is number => typeof value === "number");
      const rates = profileLoads
        .map((ld) => ld.loadboardRate)
        .filter((value): value is number => typeof value === "number");
      const windows = profileLoads.reduce<Record<string, number>>((acc, ld) => {
        const label = pickupWindow(ld);
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      }, {});
      const pickupWindows = Object.entries(windows)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      const conversionRate =
        group.requestCount > 0 ? group.bookedCount / group.requestCount : 0;
      const noLoadRate = group.requestCount > 0 ? group.noLoadCount / group.requestCount : 0;
      const negotiationLossRate =
        group.requestCount > 0
          ? (group.negotiationFailedCount + group.declinedCount) / group.requestCount
          : 0;
      const guidance = recommendationForDemand({
        requestCount: group.requestCount,
        conversionRate,
        noLoadRate,
        negotiationLossRate,
        availableLoads: availableMatches.length,
      });

      return {
        lane: group.lane,
        origin: group.origin,
        destination: group.destination,
        equipment: group.equipment,
        request_count: group.requestCount,
        no_load_count: group.noLoadCount,
        negotiation_failed_count: group.negotiationFailedCount,
        declined_count: group.declinedCount,
        booked_count: group.bookedCount,
        available_loads: availableMatches.length,
        avg_miles: miles.length ? round(avg(miles)!, 0) : null,
        avg_loadboard_rate: rates.length ? round(avg(rates)!, 2) : null,
        pickup_windows: pickupWindows,
        top_pickup_window: pickupWindows[0]?.label ?? null,
        conversion_rate: round(conversionRate, 4),
        no_load_rate: round(noLoadRate, 4),
        negotiation_loss_rate: round(negotiationLossRate, 4),
        recommendation: guidance.recommendation,
        recommendation_label: guidance.recommendationLabel,
        recommendation_reason: guidance.recommendationReason,
      };
    })
    .sort(
      (a, b) =>
        b.request_count - a.request_count ||
        b.no_load_count - a.no_load_count ||
        a.lane.localeCompare(b.lane),
    )
    .slice(0, 10);
}

export function buildDemandKpis(
  allCalls: Call[],
  laneCounts: Record<string, { lane: string; count: number; booked: number }>,
  topLanes: { lane: string; count: number; booked: number }[],
  equipmentDist: Record<string, number>,
  demandProfiles: ReturnType<typeof buildDemandProfiles>,
) {
  const total = allCalls.length;
  const topEquipment = Object.entries(equipmentDist)
    .sort(([, a], [, b]) => b - a)
    .map(([equipment]) => equipment)[0];
  const weightedMiles = demandProfiles.flatMap((profile) =>
    profile.avg_miles === null ? [] : Array(profile.request_count).fill(profile.avg_miles),
  );

  return {
    total_requested_lanes: Object.keys(laneCounts).length,
    no_load_rate: total > 0 ? round((allCalls.filter((c) => c.outcome === "no_loads").length / total), 4) : 0,
    negotiation_loss_rate:
      total > 0
        ? round((allCalls.filter((c) => PRICING_LOSS_OUTCOMES.has(c.outcome)).length / total), 4)
        : 0,
    top_requested_lane: topLanes[0]?.lane ?? "No demand",
    top_requested_equipment: topEquipment ?? "No demand",
    avg_requested_miles: weightedMiles.length ? round(avg(weightedMiles)!, 0) : null,
    premium_opportunities: demandProfiles.filter((profile) => profile.recommendation === "raise_rate").length,
    soft_negotiation_opportunities: demandProfiles.filter((profile) => profile.recommendation === "be_flexible").length,
  };
}
