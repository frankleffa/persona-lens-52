/**
 * Date range utilities for ads data queries.
 * Centralizes all date arithmetic previously scattered in useAdsData.
 */

export type DateRangeOption = "TODAY" | "LAST_2_DAYS" | "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS" | { startDate: string; endDate: string };

export function isPresetRange(range: DateRangeOption): range is "TODAY" | "LAST_2_DAYS" | "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS" {
    return typeof range === "string";
}

export const getBrazilToday = (): Date => {
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    return new Date(utc - 3 * 60 * 60 * 1000) // UTC-3
}

/** Returns { startDate, endDate } as YYYY-MM-DD strings. */
export function getDateRange(range: DateRangeOption): { startDate: string; endDate: string } {
    if (!isPresetRange(range)) return { startDate: range.startDate, endDate: range.endDate };
    const end = getBrazilToday();
    const start = getBrazilToday();
    switch (range) {
        case "TODAY":
            break;
        case "LAST_2_DAYS":
            start.setDate(start.getDate() - 1);
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
    const { startDate, endDate } = getDateRange(range);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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
    if (!isPresetRange(range)) return { start: range.startDate, end: range.endDate };
    const map: Record<string, { start: string; end: string }> = {
        TODAY: { start: "today", end: "today" },
        LAST_2_DAYS: { start: "yesterday", end: "today" },
        LAST_7_DAYS: { start: "7daysAgo", end: "today" },
        LAST_14_DAYS: { start: "14daysAgo", end: "today" },
        LAST_30_DAYS: { start: "30daysAgo", end: "today" },
    };
    return map[range];
}

/** Meta Ads date preset strings. */
export function getMetaPreset(range: DateRangeOption): string | undefined {
    if (!isPresetRange(range)) return undefined;
    const map: Record<string, string> = {
        TODAY: "today",
        LAST_2_DAYS: "last_2d",
        LAST_7_DAYS: "last_7d",
        LAST_14_DAYS: "last_14d",
        LAST_30_DAYS: "last_30d",
    };
    return map[range];
}

/** Meta Ads time_range for custom ranges. */
export function getMetaTimeRange(range: DateRangeOption): { since: string; until: string } | undefined {
    if (isPresetRange(range)) return undefined;
    return { since: range.startDate, until: range.endDate };
}

/** Google Ads custom date range string. */
export function getGoogleDateRange(range: DateRangeOption): string | undefined {
    if (isPresetRange(range)) return undefined;
    return `BETWEEN '${range.startDate}' AND '${range.endDate}'`;
}

/** Expected number of days for a range — used for coverage detection. */
export function getExpectedDays(range: DateRangeOption): number {
    if (!isPresetRange(range)) {
        return Math.ceil((new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    const map: Record<string, number> = { TODAY: 1, LAST_2_DAYS: 2, LAST_7_DAYS: 7, LAST_14_DAYS: 14, LAST_30_DAYS: 30 };
    return map[range];
}
