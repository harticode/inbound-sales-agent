import { describe, it, expect } from "vitest";
import { parseLocation, geocodeLocation, geocodeLane } from "@/lib/geo/us-cities";

describe("parseLocation", () => {
  it("normalizes City, ST format", () => {
    expect(parseLocation("Chicago, IL")).toBe("chicago,il");
    expect(parseLocation("  Dallas, TX ")).toBe("dallas,tx");
  });

  it("handles St. Louis abbreviation", () => {
    expect(parseLocation("St. Louis, MO")).toBe("st. louis,mo");
  });
});

describe("geocodeLocation", () => {
  it("returns coords for known cities", () => {
    const coords = geocodeLocation("Chicago, IL");
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeCloseTo(41.8781, 2);
  });

  it("returns null for unknown cities", () => {
    expect(geocodeLocation("Springfield, ZZ")).toBeNull();
  });
});

describe("geocodeLane", () => {
  it("geocodes both ends of a lane", () => {
    const result = geocodeLane("Chicago, IL", "Dallas, TX");
    expect(result.geocoded).toBe(true);
    if (result.geocoded) {
      expect(result.origin_coords[0]).toBeCloseTo(41.8781, 1);
      expect(result.dest_coords[0]).toBeCloseTo(32.7767, 1);
    }
  });

  it("returns geocoded false when either end is unknown", () => {
    expect(geocodeLane("Chicago, IL", "Unknown, ZZ").geocoded).toBe(false);
  });
});
