import { describe, expect, it } from "vitest";
import { getDemoCarrierIfApplicable, verifyCarrier } from "@/services/carriers";

describe("demo carrier", () => {
  it("returns PPX LOGISTICS for MC 123456", () => {
    const carrier = getDemoCarrierIfApplicable("123456");
    expect(carrier).not.toBeNull();
    expect(carrier?.legal_name).toBe("PPX LOGISTICS INC");
    expect(carrier?.is_eligible).toBe(true);
    expect(carrier?.operating_status).toBe("ACTIVE");
  });

  it("accepts MC prefix formatting", async () => {
    const carrier = await verifyCarrier("MC-123456");
    expect(carrier.legal_name).toBe("PPX LOGISTICS INC");
    expect(carrier.is_eligible).toBe(true);
  });
});
