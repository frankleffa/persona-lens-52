import { describe, expect, it } from "vitest";
import { calculateClientHealth } from "@/lib/decisionEngine";

describe("calculateClientHealth", () => {
  it("classifies REVENUE as CRITICAL when roasVariation is -30", () => {
    const result = calculateClientHealth(
      "REVENUE",
      { spend: 1000, revenue: 3500, roas: 3.5, conversions: 100 },
      { spend: 1000, revenue: 5000, roas: 5, conversions: 100 }
    );

    expect(result.status).toBe("CRITICAL");
    expect(result.variation).toBe(-30);
    expect(result.priority).toBe(1);
  });

  it("classifies DEMAND as CRITICAL when cpaVariation is +40", () => {
    const result = calculateClientHealth(
      "DEMAND",
      { spend: 1000, cpa: 28, conversions: 100 },
      { spend: 1000, cpa: 20, conversions: 100 }
    );

    expect(result.status).toBe("CRITICAL");
    expect(result.priority).toBe(1);
    expect(result.variation).toBe(0);
  });

  it("classifies MESSAGE as GROWING when conversionVariation is +20", () => {
    const result = calculateClientHealth(
      "MESSAGE",
      { spend: 800, cpa: 10, conversions: 120 },
      { spend: 800, cpa: 10, conversions: 100 }
    );

    expect(result.status).toBe("GROWING");
    expect(result.variation).toBe(20);
    expect(result.priority).toBe(4);
  });
});
