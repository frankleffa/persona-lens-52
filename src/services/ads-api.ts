/**
 * Live API calls to the Supabase Edge Function `fetch-ads-data`.
 * Used as fallback when no persisted data exists, and for GA4/hourly/geo enrichment.
 */

import { supabase } from "@/integrations/supabase/client";
import type { DateRangeOption } from "@/lib/date-utils";
import { isPresetRange, getGA4Range, getMetaPreset, getMetaTimeRange, getGoogleDateRange, getDateRange } from "@/lib/date-utils";

export interface LiveAdsDataResult {
    google_ads: any;
    meta_ads: any;
    ga4: any;
    consolidated: any;
    hourly_conversions: any;
    geo_conversions: any;
    geo_conversions_region?: any;
    geo_conversions_city?: any;
    error?: string;
}

/** Build the request body for the fetch-ads-data Edge Function. */
function buildRequestBody(range: DateRangeOption, clientId?: string, tz?: string) {
    const ga4Range = getGA4Range(range);
    const metaPreset = getMetaPreset(range);
    const metaTimeRange = getMetaTimeRange(range);
    const googleDateRange = getGoogleDateRange(range);

    // For custom ranges derived from tz-aware preset calculation, pass explicit dates
    const { startDate, endDate } = getDateRange(range, tz);

    return {
        date_range: isPresetRange(range) ? range : "CUSTOM",
        meta_date_preset: metaPreset,
        meta_time_range: metaTimeRange,
        google_date_range: googleDateRange,
        ga4_start_date: ga4Range.start,
        ga4_end_date: ga4Range.end,
        client_id: clientId,
        // Send explicit dates so the edge function can use them for DB persistence
        start_date: startDate,
        end_date: endDate,
    };
}

/** Get auth headers for Edge Function calls. */
async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");
    return {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
    };
}

/** Fetch live ads data from the Edge Function. */
export async function fetchLiveAdsData(
    range: DateRangeOption,
    clientId?: string,
    tz?: string
): Promise<LiveAdsDataResult> {
    const headers = await getAuthHeaders();
    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ads-data`,
        {
            method: "POST",
            headers,
            body: JSON.stringify(buildRequestBody(range, clientId, tz)),
        }
    );
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result;
}

/** Fetch live data with a timeout (for background enrichment). */
export async function fetchLiveAdsDataWithTimeout(
    range: DateRangeOption,
    clientId?: string,
    timeoutMs = 15000,
    tz?: string
): Promise<LiveAdsDataResult> {
    const headers = await getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ads-data`,
            {
                method: "POST",
                headers,
                body: JSON.stringify(buildRequestBody(range, clientId, tz)),
                signal: controller.signal,
            }
        );
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        return result;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Fire-and-forget: trigger a live sync for today's + yesterday's data. */
export async function triggerLiveSync(clientId?: string): Promise<void> {
    try {
        const headers = await getAuthHeaders();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ads-data`;

        // Persist TODAY
        fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({
                date_range: "TODAY",
                meta_date_preset: "today",
                ga4_start_date: "today",
                ga4_end_date: "today",
                client_id: clientId,
            }),
        }).catch(() => { });

        // Persist YESTERDAY separately (not LAST_2_DAYS which aggregates 2 days)
        fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({
                date_range: "YESTERDAY",
                meta_date_preset: "yesterday",
                ga4_start_date: "yesterday",
                ga4_end_date: "yesterday",
                client_id: clientId,
            }),
        }).catch(() => { });
    } catch (e) {
        console.warn("Live sync failed (non-blocking):", e);
    }
}
