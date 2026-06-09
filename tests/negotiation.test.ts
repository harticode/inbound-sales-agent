import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/settings", () => ({
  getRuntimeSettings: vi.fn(async () => ({
    offer_rate_pct: 0.85,
    negotiation_min_margin_pct: 0.05,
  })),
}));

import { evaluateOffer } from "@/services/negotiation/server";

const protectMarginContext = {
  posture: "protect_margin" as const,
  request_count: 4,
  available_loads: 1,
  conversion_rate: 0.5,
  no_load_rate: 0,
  negotiation_loss_rate: 0.25,
  reason: "High historical demand with limited available inventory.",
};

const winCapacityContext = {
  posture: "win_capacity" as const,
  request_count: 0,
  available_loads: 2,
  conversion_rate: 0,
  no_load_rate: 0,
  negotiation_loss_rate: 0,
  reason: "Light demand with available inventory.",
};

describe("evaluateOffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- General behavior (no demand context = balanced by default) ---

  it("accepts when carrier asks at or below offer rate", async () => {
    const result = await evaluateOffer(2850, 2400, 1);
    expect(result.accepted).toBe(true);
    expect(result.final).toBe(true);
  });

  it("counters when carrier asks above loadboard (balanced)", async () => {
    const result = await evaluateOffer(2850, 3000, 1);
    expect(result.accepted).toBe(false);
    // Paced counter is $2,498.50, then balanced R1 takes 15% of the remaining gap.
    expect(result.counter_offer).toBeCloseTo(2573.73, 0);
  });

  it("accepts favorable carrier asks below the final balanced counter", async () => {
    const result = await evaluateOffer(2850, 2450, 3);
    expect(result.accepted).toBe(true);
    expect(result.final).toBe(true);
  });

  it("accepts within 5% above loadboard on final round (balanced)", async () => {
    // 2850 * 1.05 = 2992.5 is the cap
    const result = await evaluateOffer(2850, 2950, 3);
    expect(result.accepted).toBe(true);
    expect(result.final).toBe(true);
  });

  it("rejects above 5% over loadboard on final round (balanced)", async () => {
    // 2850 * 1.05 = 2992.5, carrier asks 3100
    const result = await evaluateOffer(2850, 3100, 3);
    expect(result.accepted).toBe(false);
    expect(result.final).toBe(true);
  });

  // --- protect_margin (hot routes, pay minimum, never above loadboard) ---

  it("stays firmer when demand is strong for the lane", async () => {
    // carrier asks $2700, protect_margin round 1: accept threshold 3%
    // 2850 - 2700 = 150, 150/2850 = 5.26% > 3% → counter
    const result = await evaluateOffer(2850, 2700, 1, protectMarginContext);
    expect(result.accepted).toBe(false);
    // Paced counter is $2,470, then protect-margin R1 takes 10% of the remaining gap.
    expect(result.counter_offer).toBeCloseTo(2493, 0);
    expect(result.demand_posture).toBe("protect_margin");
    expect(result.message).toContain("Demand is strong");
  });

  it("counters protect margin asks that violate the margin floor even when within round threshold", async () => {
    // Round 1 accept threshold is 3%, but the 5% margin floor caps pay at $2,707.50.
    const result = await evaluateOffer(2850, 2780, 1, protectMarginContext);
    expect(result.accepted).toBe(false);
    expect(result.counter_offer).toBe(2707.5);
    expect(result.final).toBe(false);
  });

  it("rejects above loadboard on protect margin round 1", async () => {
    const result = await evaluateOffer(2850, 2900, 1, protectMarginContext);
    expect(result.accepted).toBe(false);
    expect(result.counter_offer).toBeCloseTo(2513, 0);
    expect(result.final).toBe(false);
  });

  it("rejects above loadboard on protect margin final round", async () => {
    const result = await evaluateOffer(2850, 2900, 3, protectMarginContext);
    expect(result.accepted).toBe(false);
    expect(result.final).toBe(true);
  });

  it("paces protect margin round 2 counters from the opening offer", async () => {
    const result = await evaluateOffer(2850, 2650, 2, protectMarginContext);
    expect(result.accepted).toBe(false);
    expect(result.counter_offer).toBeCloseTo(2601.98, 0);
    expect(result.final).toBe(false);
  });

  it("counters protect margin round 2 asks below the margin floor", async () => {
    // round 2 accept threshold = 5%, but margin at $2,720 is only 4.56%.
    const result = await evaluateOffer(2850, 2720, 2, protectMarginContext);
    expect(result.accepted).toBe(false);
    expect(result.counter_offer).toBe(2707.5);
    expect(result.final).toBe(false);
  });

  it("accepts within protect margin round 3 threshold", async () => {
    // round 3 accept threshold = 7%, carrier at 2660: discount = 6.67% < 7% → accept
    const result = await evaluateOffer(2850, 2660, 3, protectMarginContext);
    expect(result.accepted).toBe(true);
    expect(result.final).toBe(true);
  });

  it("accepts favorable protect margin asks below the final broker counter", async () => {
    // round 3 counter is 97% of loadboard ($2,764.50), so $2,600 is favorable.
    const result = await evaluateOffer(2850, 2600, 3, protectMarginContext);
    expect(result.accepted).toBe(true);
    expect(result.final).toBe(true);
  });

  // --- win_capacity (dead routes, 7-10% above loadboard tolerated) ---

  it("is more tolerant when demand is light and inventory is available", async () => {
    const result = await evaluateOffer(2850, 2450, 3, winCapacityContext);
    expect(result.accepted).toBe(true);
    expect(result.final).toBe(true);
    expect(result.demand_posture).toBe("win_capacity");
  });

  it("accepts up to 10% above loadboard on win capacity final round", async () => {
    // 2850 * 1.10 = 3135 is the cap
    const result = await evaluateOffer(2850, 3100, 3, winCapacityContext);
    expect(result.accepted).toBe(true);
    expect(result.final).toBe(true);
    expect(result.message).toContain("stretch");
  });

  it("rejects above 10% over loadboard on win capacity final round", async () => {
    // 2850 * 1.10 = 3135, carrier asks 3200
    const result = await evaluateOffer(2850, 3200, 3, winCapacityContext);
    expect(result.accepted).toBe(false);
    expect(result.final).toBe(true);
  });

  it("counters above loadboard on win capacity non-final round", async () => {
    const result = await evaluateOffer(2850, 2900, 1, winCapacityContext);
    expect(result.accepted).toBe(false);
    expect(result.counter_offer).toBeLessThan(2850);
    expect(result.final).toBe(false);
  });

  it("increases win capacity counters in later rounds", async () => {
    const result = await evaluateOffer(1100, 1200, 2, winCapacityContext, [1023]);
    expect(result.accepted).toBe(false);
    expect(result.counter_offer).toBe(1067.25);
    expect(result.message).toContain("$1,067.25");
  });

  it("returns error for invalid loadboard rate", async () => {
    const result = await evaluateOffer(0, 1000, 1);
    expect(result.accepted).toBe(false);
    expect(result.message).toContain("Invalid");
  });
});
