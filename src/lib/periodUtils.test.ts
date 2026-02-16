import { afterEach, describe, expect, it, vi } from "vitest";
import { getComparisonPeriods } from "@/lib/periodUtils";

afterEach(() => {
  vi.useRealTimers();
});

describe("getComparisonPeriods", () => {
  it("calculates current/previous correctly for LAST_7_DAYS", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-16T12:00:00.000Z"));

    const periods = getComparisonPeriods("LAST_7_DAYS");

    expect(periods).toEqual({
      current: { start: "2026-02-09", end: "2026-02-16" },
      previous: { start: "2026-02-01", end: "2026-02-08" },
    });
  });

  it("calculates current/previous correctly for LAST_14_DAYS", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-16T12:00:00.000Z"));

    const periods = getComparisonPeriods("LAST_14_DAYS");

    expect(periods).toEqual({
      current: { start: "2026-02-02", end: "2026-02-16" },
      previous: { start: "2026-01-18", end: "2026-02-01" },
    });
  });

  it("calculates current/previous correctly for LAST_30_DAYS", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-16T12:00:00.000Z"));

    const periods = getComparisonPeriods("LAST_30_DAYS");

    expect(periods).toEqual({
      current: { start: "2026-01-17", end: "2026-02-16" },
      previous: { start: "2025-12-17", end: "2026-01-16" },
    });
  });

  it("supports explicit range object", () => {
    const periods = getComparisonPeriods({ start: "2026-02-10", end: "2026-02-16" });

    expect(periods).toEqual({
      current: { start: "2026-02-10", end: "2026-02-16" },
      previous: { start: "2026-02-03", end: "2026-02-09" },
    });
  });
});
