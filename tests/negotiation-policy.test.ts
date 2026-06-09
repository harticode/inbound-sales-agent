import { describe, it, expect } from "vitest";
import { getRoundThreshold, postureConfigs } from "@/services/negotiation/config";
import { computeAction } from "@/services/negotiation/policy";
import {
  computePostureScore,
  resolveDemandPosture,
  scoreToPosture,
} from "@/services/negotiation/posture";

describe("negotiation config", () => {
  it("exposes balanced round thresholds", () => {
    const round1 = getRoundThreshold("balanced", 1);
    const round2 = getRoundThreshold("balanced", 2);
    const round3 = getRoundThreshold("balanced", 3);
    expect(round1.accept).toBe(0.05);
    expect(round1.counterPct).toBe(0.93);
    expect(round2.counterPct).toBe(0.97);
    expect(round3.counterPct).toBe(1);
  });

  it("makes win_capacity progressively more flexible by round", () => {
    const round1 = getRoundThreshold("win_capacity", 1);
    const round2 = getRoundThreshold("win_capacity", 2);
    const round3 = getRoundThreshold("win_capacity", 3);
    expect(round1.accept).toBe(0.09);
    expect(round1.counterPct).toBe(0.95);
    expect(round2.counterPct).toBe(0.97);
    expect(round3.counterPct).toBe(1.03);
  });

  it("never decreases configured broker counters across rounds", () => {
    for (const posture of ["protect_margin", "balanced", "win_capacity"] as const) {
      const round1 = getRoundThreshold(posture, 1);
      const round2 = getRoundThreshold(posture, 2);
      const round3 = getRoundThreshold(posture, 3);

      expect(round2.counterPct).toBeGreaterThanOrEqual(round1.counterPct);
      expect(round3.counterPct).toBeGreaterThanOrEqual(round2.counterPct);
    }
  });

  it("keeps protect_margin from paying above loadboard", () => {
    expect(postureConfigs.protect_margin.maxOverLoadboard).toBe(1.0);
  });

  it("configures carrier-responsive gap shares", () => {
    expect(postureConfigs.protect_margin.gapShareByRound).toEqual({ 1: 0.1, 2: 0.15, 3: 0.2 });
    expect(postureConfigs.balanced.gapShareByRound).toEqual({ 1: 0.15, 2: 0.2, 3: 0.25 });
    expect(postureConfigs.win_capacity.gapShareByRound).toEqual({ 1: 0.2, 2: 0.25, 3: 0.3 });
  });
});

describe("posture scoring", () => {
  it("maps continuous scores to posture labels", () => {
    expect(scoreToPosture(0.85)).toBe("protect_margin");
    expect(scoreToPosture(0.55)).toBe("balanced");
    expect(scoreToPosture(0.15)).toBe("win_capacity");
  });

  it("cold-starts to win_capacity when inventory exceeds demand", () => {
    const score = computePostureScore({
      requestCount: 0,
      availableLoads: 2,
      conversionRate: 0,
      noLoadRate: 0,
      negotiationLossRate: 0,
    });
    expect(score).toBeLessThanOrEqual(0.3);
    expect(resolveDemandPosture({
      requestCount: 0,
      availableLoads: 2,
      conversionRate: 0,
      noLoadRate: 0,
      negotiationLossRate: 0,
    }).posture).toBe("win_capacity");
  });

  it("selects protect_margin for hot lanes", () => {
    const result = resolveDemandPosture({
      requestCount: 4,
      availableLoads: 1,
      conversionRate: 0.5,
      noLoadRate: 0,
      negotiationLossRate: 0.25,
    });
    expect(result.posture).toBe("protect_margin");
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });
});

describe("computeAction", () => {
  const baseInput = {
    loadboardRate: 2850,
    maxRounds: 3,
    offerRatePct: 0.85,
    minMarginPct: 0.05,
    posture: "balanced" as const,
  };

  it("accepts at or below offer rate without messaging concerns", () => {
    const action = computeAction({
      ...baseInput,
      carrierOffer: 2400,
      currentRound: 1,
    });
    expect(action).toEqual({
      type: "accept",
      price: 2400,
      final: true,
      variant: "offer_rate",
    });
  });

  it("splits the gap from the paced counter toward the carrier ask", () => {
    const action = computeAction({
      ...baseInput,
      carrierOffer: 3000,
      currentRound: 1,
    });
    expect(action.type).toBe("counter");
    if (action.type === "counter") {
      // Paced counter is $2,498.50, then balanced R1 takes 15% of the remaining gap.
      expect(action.price).toBeCloseTo(2573.73, 0);
      expect(action.final).toBe(false);
    }
  });

  it("accepts carrier asks just above the planned counter", () => {
    const action = computeAction({
      ...baseInput,
      carrierOffer: 2520,
      currentRound: 1,
    });

    expect(action).toEqual({
      type: "accept",
      price: 2520,
      final: true,
      variant: "default",
    });
  });

  it("accepts carrier asks below the planned round counter", () => {
    const action = computeAction({
      ...baseInput,
      carrierOffer: 2490,
      currentRound: 1,
    });

    expect(action).toEqual({
      type: "accept",
      price: 2490,
      final: true,
      variant: "default",
    });
  });

  it("responds higher to higher carrier asks without matching them", () => {
    const lowerAsk = computeAction({
      ...baseInput,
      carrierOffer: 2700,
      currentRound: 1,
    });
    const higherAsk = computeAction({
      ...baseInput,
      carrierOffer: 3000,
      currentRound: 1,
    });

    expect(lowerAsk.type).toBe("counter");
    expect(higherAsk.type).toBe("counter");
    if (lowerAsk.type === "counter" && higherAsk.type === "counter") {
      expect(lowerAsk.price).toBeCloseTo(2528.73, 0);
      expect(higherAsk.price).toBeCloseTo(2573.73, 0);
      expect(higherAsk.price).toBeGreaterThan(lowerAsk.price);
      expect(higherAsk.price).toBeLessThan(3000);
    }
  });

  it("rejects protect_margin offers above loadboard on final round", () => {
    const action = computeAction({
      ...baseInput,
      posture: "protect_margin",
      carrierOffer: 2900,
      currentRound: 3,
    });
    expect(action).toEqual({
      type: "reject",
      final: true,
      variant: "protect_margin",
    });
  });

  it("splits win_capacity counters in later rounds", () => {
    const action = computeAction({
      loadboardRate: 1100,
      carrierOffer: 1200,
      currentRound: 2,
      maxRounds: 3,
      offerRatePct: 0.85,
      posture: "win_capacity",
      previousBrokerCounters: [1023],
    });

    expect(action.type).toBe("counter");
    if (action.type === "counter") {
      expect(action.price).toBe(1067.25);
    }
  });

  it("uses previous broker counters as the floor before splitting the gap", () => {
    const action = computeAction({
      loadboardRate: 1100,
      carrierOffer: 1200,
      currentRound: 2,
      maxRounds: 3,
      offerRatePct: 0.85,
      posture: "win_capacity",
      previousBrokerCounters: [1080],
    });

    expect(action.type).toBe("counter");
    if (action.type === "counter") {
      expect(action.price).toBe(1110);
    }
  });

  it("blocks accepts below the margin floor and counters at the floor price", () => {
    const action = computeAction({
      ...baseInput,
      posture: "protect_margin",
      carrierOffer: 2780,
      currentRound: 1,
    });

    expect(action).toEqual({
      type: "counter",
      price: 2707.5,
      final: false,
      variant: "protect_margin",
    });
  });

  it("allows stretch accepts above loadboard without applying the margin floor", () => {
    const action = computeAction({
      ...baseInput,
      posture: "win_capacity",
      carrierOffer: 3100,
      currentRound: 3,
    });

    expect(action).toEqual({
      type: "accept",
      price: 3100,
      final: true,
      variant: "stretch",
    });
  });

  it("rejects final-round accepts below the margin floor when stretch does not apply", () => {
    const action = computeAction({
      ...baseInput,
      posture: "protect_margin",
      carrierOffer: 2720,
      currentRound: 3,
    });

    expect(action).toEqual({
      type: "reject",
      final: true,
      variant: "below_floor",
    });
  });

  it("accepts when the carrier comes down to a previous broker counter", () => {
    const action = computeAction({
      loadboardRate: 1100,
      carrierOffer: 1023,
      currentRound: 2,
      maxRounds: 3,
      offerRatePct: 0.85,
      posture: "win_capacity",
      previousBrokerCounters: [1023],
    });

    expect(action).toEqual({
      type: "accept",
      price: 1023,
      final: true,
      variant: "final_round",
    });
  });
});
