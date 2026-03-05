/**
 * Live API calls to the Supabase Edge Function `fetch-ads-data`.
 * Used as fallback when no persisted data exists, and for GA4/hourly/geo enrichment.
 */

import { supabase } from "@/lib/supabase";
import type { DateRangeOption } from "@/lib/date-utils";
import { getGA4Range, getMetaPreset } from "@/lib/date-utils";

export interface LiveAdsDataResult {
    google_ads: any;
    meta_ads: any;
    ga4: any;
    consolidated: any;
    hourly_conversions: any;
    geo_conversions: any;
    error?: string;
}

/** Fetch live ads data from the Edge Function. */
export async function fetchLiveAdsData(
    range: DateRangeOption,
    clientId?: string
): Promise<LiveAdsDataResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const ga4Range = getGA4Range(range);
    const metaPreset = getMetaPreset(range);

    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ads-data`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                date_range: range,
                meta_date_preset: metaPreset,
                ga4_start_date: ga4Range.start,
                ga4_end_date: ga4Range.end,
                client_id: clientId,
            }),
        }
    );

    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result;
}

/** Fire-and-forget: trigger a live sync for today's data. */
export async function triggerLiveSync(clientId?: string): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ads-data`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    date_range: "TODAY",
                    meta_date_preset: "today",
                    ga4_start_date: "today",
                    ga4_end_date: "today",
                    client_id: clientId,
                }),
            }
        );
    } catch (e) {
        console.warn("Live sync failed (non-blocking):", e);
    }
}
