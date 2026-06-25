/**
 * Metric aggregation and calculation utilities.
 * Extracted from the monolithic useAdsData hook.
 */

// ─── Daily metric rows (from daily_metrics table) ────────────────────────

export interface DailyMetricRow {
    id: string;
    client_id: string;
    account_id: string;
    platform: string;
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cpa: number;
    roas: number;
    purchases?: number;
    registrations?: number;
    messages?: number;
    leads?: number;
    ftd?: number;
    cost_per_ftd?: number;
}

export interface AggregatedMetrics {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cpa: number;
    roas: number;
}

/** Aggregate an array of daily metric rows into totals + derived ratios. */
export function aggregateMetrics(rows: DailyMetricRow[]): AggregatedMetrics {
    const totals = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
    for (const r of rows) {
        totals.spend += Number(r.spend) || 0;
        totals.impressions += Number(r.impressions) || 0;
        totals.clicks += Number(r.clicks) || 0;
        totals.conversions += Number(r.conversions) || 0;
        totals.revenue += Number(r.revenue) || 0;
    }
    return {
        ...totals,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
        cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
        cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
        roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
    };
}

// ─── Percentage change ──────────────────────────────────────────────────

/** Calculate percentage change between current and previous values. */
export function calcChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

// ─── Inverted metrics ───────────────────────────────────────────────────

/** Metrics where a decrease is positive (e.g. CPA going down is good). */
const INVERTED_METRICS = new Set(["cpa", "cpc", "cost_per_ftd", "google_cpa", "google_cpc", "meta_cpa", "meta_cpc"]);

export function isInvertedMetric(key: string): boolean {
    return INVERTED_METRICS.has(key);
}

// ─── Campaign rows (from daily_campaigns table) ─────────────────────────

export interface CampaignRow {
    campaign_name: string;
    campaign_status: string;
    spend: number;
    clicks: number;
    conversions: number;
    leads: number;
    messages: number;
    revenue: number;
    source: string;
}

export interface AggregatedCampaign {
    name: string;
    status: string;
    spend: number;
    clicks: number;
    conversions: number;
    leads: number;
    messages: number;
    revenue: number;
    cpa: number;
    source: string;
}

/** Aggregate campaign rows by name (sum across dates), recalculate CPA. */
export function aggregateCampaigns(rows: CampaignRow[]): AggregatedCampaign[] {
    const map = new Map<string, AggregatedCampaign>();

    for (const row of rows) {
        const existing = map.get(row.campaign_name);
        if (existing) {
            existing.spend += Number(row.spend) || 0;
            existing.clicks += Number(row.clicks) || 0;
            existing.conversions += Number(row.conversions) || 0;
            existing.leads += Number(row.leads) || 0;
            existing.messages += Number(row.messages) || 0;
            existing.revenue += Number(row.revenue) || 0;
        } else {
            map.set(row.campaign_name, {
                name: row.campaign_name,
                status: row.campaign_status || "Ativa",
                spend: Number(row.spend) || 0,
                clicks: Number(row.clicks) || 0,
                conversions: Number(row.conversions) || 0,
                leads: Number(row.leads) || 0,
                messages: Number(row.messages) || 0,
                revenue: Number(row.revenue) || 0,
                cpa: 0,
                source: row.source || "",
            });
        }
    }

    return Array.from(map.values()).map((c) => {
        const primaryResult = c.messages > 0 ? c.messages : c.leads > 0 ? c.leads : c.conversions;
        return { ...c, cpa: primaryResult > 0 ? c.spend / primaryResult : 0 };
    });
}
