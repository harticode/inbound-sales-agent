import { describe, expect, it } from "vitest";
import { getClosingMessage, enrichCallResponse } from "@/services/calls";
import { createOrUpdateCallSchema } from "@/lib/validators";

describe("call closing messages", () => {
  it("returns transfer message for transferred outcome", () => {
    const msg = getClosingMessage("transferred");
    expect(msg).toContain("Transfer was successful");
  });

  it("returns undefined for unknown outcome", () => {
    expect(getClosingMessage("unknown")).toBeUndefined();
  });

  it("adds closing_message to serialized call response", () => {
    const call = {
      id: 1,
      call_id: "CALL-TEST01",
      carrier_mc_number: "382168",
      carrier_name: "Test Carrier",
      caller_name: "",
      origin_requested: "Chicago, IL",
      destination_requested: "Dallas, TX",
      equipment_requested: "Dry Van",
      loadboard_rate: 2850,
      initial_offer: 2600,
      final_agreed_rate: 2750,
      counter_offers: [],
      negotiation_rounds: 2,
      outcome: "transferred" as const,
      sentiment: "positive" as const,
      call_duration_seconds: null,
      notes: "",
      extracted_data: {},
      transcript_summary: "",
      started_at: null,
      ended_at: null,
      created_at: new Date().toISOString(),
    };

    const enriched = enrichCallResponse(call);
    expect(enriched.closing_message).toContain("Transfer was successful");
  });
});

describe("createOrUpdateCallSchema", () => {
  it("accepts HappyRobot empty template strings for optional fields", () => {
    const parsed = createOrUpdateCallSchema.parse({
      call_id: "CALL-K6SP0H",
      outcome: "transferred",
      sentiment: "positive",
      carrier_mc_number: "123456",
      carrier_name: "PPX LOGISTICS INC",
      origin_requested: "Chicago",
      destination_requested: "Dallas",
      equipment_requested: "Dry Van",
      load_id: "LD-1001",
      loadboard_rate: "",
      caller_name: "",
      initial_offer: "",
      final_agreed_rate: "",
      counter_offers: "",
      negotiation_rounds: "",
      notes: "",
      extracted_data: "",
      transcript_summary: "",
    });

    expect(parsed.outcome).toBe("transferred");
    expect(parsed.sentiment).toBe("positive");
    expect(parsed.counter_offers).toBeUndefined();
    expect(parsed.loadboard_rate).toBeUndefined();
  });
});
