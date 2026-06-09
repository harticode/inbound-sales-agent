import { PRICING_LOSS_OUTCOMES, WON_OUTCOMES } from "@/lib/constants";
import type { PostureScoreInput } from "@/types";
import type { Call } from "@/db/schema";

export function computeLaneDemandStats(
  laneCalls: Call[],
  availableLoads: number,
): PostureScoreInput {
  const requestCount = laneCalls.length;
  const bookedCount = laneCalls.filter((call) => WON_OUTCOMES.has(call.outcome)).length;
  const noLoadCount = laneCalls.filter((call) => call.outcome === "no_loads").length;
  const pricingLossCount = laneCalls.filter((call) => PRICING_LOSS_OUTCOMES.has(call.outcome)).length;

  return {
    requestCount,
    availableLoads,
    conversionRate: requestCount > 0 ? bookedCount / requestCount : 0,
    noLoadRate: requestCount > 0 ? noLoadCount / requestCount : 0,
    negotiationLossRate: requestCount > 0 ? pricingLossCount / requestCount : 0,
  };
}
