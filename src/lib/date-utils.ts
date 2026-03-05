/**
 * Date range utilities for ads data queries.
 * Centralizes all date arithmetic previously scattered in useAdsData.
 */

export type DateRangeOption = "TODAY" | "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS";

/** Returns { startDate, endDate } as YYYY-MM-DD strings. */
export function getDateRange(range: DateRangeOption): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    switch (range) {
        case "TODAY":
            break;
        case "LAST_7_DAYS":
            start.setDate(start.getDate() - 7);
            break;
        case "LAST_14_DAYS":
            start.setDate(start.getDate() - 14);
            break;
        case "LAST_30_DAYS":
            start.setDate(start.getDate() - 30);
            break;
    }
    return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
    };
}

/** Returns the previous period (same length) before the given range, for trend comparison. */
export function getPreviousDateRange(range: DateRangeOption): { startDate: string; endDate: string } {
    const { startDate } = getDateRange(range);
    const start = new Date(startDate);
    const daysMap: Record<DateRangeOption, number> = { TODAY: 1, LAST_7_DAYS: 7, LAST_14_DAYS: 14, LAST_30_DAYS: 30 };
    const days = daysMap[range];
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days + 1);
    return {
        startDate: prevStart.toISOString().split("T")[0],
        endDate: prevEnd.toISOString().split("T")[0],
    };
}

/** GA4 relative date strings. */
export function getGA4Range(range: DateRangeOption): { start: string; end: string } {
    const map: Record<DateRangeOption, { start: string; end: string }> = {
        TODAY: { start: "today", end: "today" },
        LAST_7_DAYS: { start: "7daysAgo", end: "today" },
        LAST_14_DAYS: { start: "14daysAgo", end: "today" },
        LAST_30_DAYS: { start: "30daysAgo", end: "today" },
    };
    return map[range];
}

/** Meta Ads date preset strings. */
export function getMetaPreset(range: DateRangeOption): string {
    const map: Record<DateRangeOption, string> = {
        TODAY: "today",
        LAST_7_DAYS: "last_7d",
        LAST_14_DAYS: "last_14d",
        LAST_30_DAYS: "last_30d",
    };
    return map[range];
}

/** Meta Ads time_range start/end for custom ranges. */
export function getMetaTimeRange(range: DateRangeOption): { since: string; until: string } {
    const { startDate, endDate } = getDateRange(range);
    return { since: startDate, until: endDate };
}

/** Google Ads date format (YYYY-MM-DD already). */
export function getGoogleDateRange(range: DateRangeOption): { startDate: string; endDate: string } {
    return getDateRange(range);
}

/** Expected number of days for a range — used for coverage detection. */
export function getExpectedDays(range: DateRangeOption): number {
    const map: Record<DateRangeOption, number> = { TODAY: 1, LAST_7_DAYS: 7, LAST_14_DAYS: 14, LAST_30_DAYS: 30 };
    return map[range];
}
