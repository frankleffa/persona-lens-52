/**
 * Supabase queries for daily_metrics and daily_campaigns tables.
 * Pure data-fetching — no UI state, no React hooks.
 */

import { supabase } from "@/lib/supabase";
import type { DailyMetricRow, CampaignRow } from "@/lib/metric-utils";

/** Fetch daily metric rows from Supabase, optionally filtered by clientId and accountIds. */
export async function fetchDailyMetrics(
    startDate: string,
    endDate: string,
    clientId?: string,
    accountIds?: string[]
): Promise<DailyMetricRow[]> {
    let query = supabase
        .from("daily_metrics")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

    if (clientId) {
        query = query.eq("client_id", clientId);
        if (accountIds && accountIds.length > 0) {
            query = query.in("account_id", accountIds);
        }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as DailyMetricRow[];
}

/** Fetch daily campaign rows from Supabase. */
export async function fetchDailyCampaigns(
    startDate: string,
    endDate: string,
    clientId?: string,
    accountIds?: string[]
): Promise<CampaignRow[]> {
    let query = supabase
        .from("daily_campaigns")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);

    if (clientId) {
        query = query.eq("client_id", clientId);
        if (accountIds && accountIds.length > 0) {
            query = query.in("account_id", accountIds);
        }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CampaignRow[];
}
