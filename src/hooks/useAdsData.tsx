import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { type MetricData, type MetricKey } from "@/lib/types";

export interface GoogleAdsData {
  investment: number;
  revenue: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cost_per_conversion: number;
  ctr: number;
  avg_cpc: number;
  campaigns: Array<{ name: string; status: string; spend: number; clicks: number; conversions: number; revenue: number; cpa: number }>;
}

export interface MetaAdsData {
  investment: number;
  revenue: number;
  impressions: number;
  clicks: number;
  leads: number;
  messages: number;
  ctr: number;
  cpc: number;
  cpa: number;
  campaigns: Array<{ name: string; status: string; spend: number; leads: number; messages: number; revenue: number; cpa: number }>;
}

export interface GA4Data {
  sessions: number;
  events: number;
  conversion_rate: number;
}

export interface AdsDataResult {
  google_ads: GoogleAdsData | null;
  meta_ads: MetaAdsData | null;
  ga4: GA4Data | null;
  consolidated: {
    investment: number;
    revenue: number;
    roas: number;
    leads: number;
    messages: number;
    cpa: number;
    ctr: number;
    cpc: number;
    conversion_rate: number;
    sessions: number;
    events: number;
    all_campaigns: Array<{ name: string; status: string; spend: number; leads?: number; clicks?: number; conversions?: number; messages?: number; revenue?: number; cpa: number; source: string }>;
  } | null;
  hourly_conversions: {
    purchases_by_hour?: Record<string, number>;
    registrations_by_hour?: Record<string, number>;
  } | null;
}

interface DailyMetricRow {
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
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function aggregateMetrics(rows: DailyMetricRow[]) {
  const totals = {
    spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0,
  };
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

export type DateRangeOption = "TODAY" | "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS";

function getDateRange(range: DateRangeOption): { startDate: string; endDate: string } {
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

// Also trigger a live sync to ensure today's data is fresh
async function triggerLiveSync(clientId?: string) {
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

export function useAdsData(clientId?: string) {
  const [data, setData] = useState<AdsDataResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>("LAST_30_DAYS");

  const fetchData = useCallback(async (range: DateRangeOption = dateRange) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setData(null);
        setLoading(false);
        return;
      }

      const { startDate, endDate } = getDateRange(range);

      // Build query - RLS will filter automatically
      let query = supabase
        .from("daily_metrics")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      // If a specific client_id is provided, filter by it
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data: rows, error: dbError } = await query;

      if (dbError) {
        console.error("Error fetching daily_metrics:", dbError);
        setError(dbError.message);
        setData(null);
        setLoading(false);
        return;
      }

      const metricRows = (rows || []) as DailyMetricRow[];

      // If no persisted data, trigger a live sync and fall back to API
      if (metricRows.length === 0) {
        // Fall back to live API call
        const ga4Range = {
          TODAY: { start: "today", end: "today" },
          LAST_7_DAYS: { start: "7daysAgo", end: "today" },
          LAST_14_DAYS: { start: "14daysAgo", end: "today" },
          LAST_30_DAYS: { start: "30daysAgo", end: "today" },
        }[range];
        const metaPreset = {
          TODAY: "today",
          LAST_7_DAYS: "last_7d",
          LAST_14_DAYS: "last_14d",
          LAST_30_DAYS: "last_30d",
        }[range];

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
        if (!result.error) {
          setData(result);
        } else {
          setData(null);
        }
        setLoading(false);
        return;
      }

      // Aggregate from persisted data
      const googleRows = metricRows.filter((r) => r.platform === "google");
      const metaRows = metricRows.filter((r) => r.platform === "meta");

      const googleAgg = aggregateMetrics(googleRows);
      const metaAgg = aggregateMetrics(metaRows);
      const allAgg = aggregateMetrics(metricRows);

      const googleAdsData: GoogleAdsData | null = googleRows.length > 0 ? {
        investment: googleAgg.spend,
        revenue: googleAgg.revenue,
        clicks: googleAgg.clicks,
        impressions: googleAgg.impressions,
        conversions: googleAgg.conversions,
        cost_per_conversion: googleAgg.cpa,
        ctr: googleAgg.ctr,
        avg_cpc: googleAgg.cpc,
        campaigns: [],
      } : null;

      const metaAdsData: MetaAdsData | null = metaRows.length > 0 ? {
        investment: metaAgg.spend,
        revenue: metaAgg.revenue,
        impressions: metaAgg.impressions,
        clicks: metaAgg.clicks,
        leads: metaAgg.conversions,
        messages: 0,
        ctr: metaAgg.ctr,
        cpc: metaAgg.cpc,
        cpa: metaAgg.cpa,
        campaigns: [],
      } : null;

      const result: AdsDataResult = {
        google_ads: googleAdsData,
        meta_ads: metaAdsData,
        ga4: null,
        consolidated: {
          investment: allAgg.spend,
          revenue: allAgg.revenue,
          roas: allAgg.roas,
          leads: allAgg.conversions,
          messages: 0,
          cpa: allAgg.cpa,
          ctr: allAgg.ctr,
          cpc: allAgg.cpc,
          conversion_rate: 0,
          sessions: 0,
          events: 0,
          all_campaigns: [],
        },
        hourly_conversions: null,
      };

      setData(result);

      // Trigger background sync for today's data
      triggerLiveSync(clientId);
    } catch (err) {
      console.warn("Failed to fetch ads data:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange, clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metricData: Record<MetricKey, MetricData> | null = data?.consolidated
    ? {
        investment: { key: "investment", value: formatCurrency(data.consolidated.investment), change: 0, trend: "neutral" },
        revenue: { key: "revenue", value: formatCurrency(data.consolidated.revenue), change: 0, trend: "neutral" },
        roas: { key: "roas", value: data.consolidated.roas > 0 ? `${data.consolidated.roas.toFixed(2)}x` : "—", change: 0, trend: "neutral" },
        leads: { key: "leads", value: formatNumber(data.consolidated.leads), change: 0, trend: "neutral" },
        messages: { key: "messages", value: formatNumber(data.consolidated.messages || 0), change: 0, trend: "neutral" },
        cpa: { key: "cpa", value: formatCurrency(data.consolidated.cpa), change: 0, trend: "neutral" },
        ctr: { key: "ctr", value: formatPercent(data.consolidated.ctr), change: 0, trend: "neutral" },
        cpc: { key: "cpc", value: formatCurrency(data.consolidated.cpc), change: 0, trend: "neutral" },
        conversion_rate: { key: "conversion_rate", value: formatPercent(data.consolidated.conversion_rate), change: 0, trend: "neutral" },
        sessions: { key: "sessions", value: formatNumber(data.consolidated.sessions), change: 0, trend: "neutral" },
        events: { key: "events", value: formatNumber(data.consolidated.events), change: 0, trend: "neutral" },
        campaign_names: { key: "campaign_names", value: `${data.consolidated.all_campaigns.filter((c) => c.status === "Ativa").length} ativas`, change: 0, trend: "neutral" },
        ad_sets: { key: "ad_sets", value: "—", change: 0, trend: "neutral" },
        attribution_comparison: { key: "attribution_comparison", value: "Multi-touch", change: 0, trend: "neutral" },
        discrepancy_percentage: { key: "discrepancy_percentage", value: "—", change: 0, trend: "neutral" },
        trend_charts: { key: "trend_charts", value: "30 dias", change: 0, trend: "neutral" },
        funnel_visualization: { key: "funnel_visualization", value: "—", change: 0, trend: "neutral" },
      }
    : null;

  const campaigns = !data?.consolidated
    ? null
    : data.consolidated.all_campaigns;

  const googleAdsMetrics = data?.google_ads ? {
    investment: { key: "investment" as const, value: formatCurrency(data.google_ads.investment), change: 0, trend: "neutral" as const },
    clicks: { key: "ctr" as const, value: formatNumber(data.google_ads.clicks), change: 0, trend: "neutral" as const },
    impressions: { key: "ctr" as const, value: formatNumber(data.google_ads.impressions), change: 0, trend: "neutral" as const },
    conversions: { key: "leads" as const, value: formatNumber(data.google_ads.conversions), change: 0, trend: "neutral" as const },
    ctr: { key: "ctr" as const, value: formatPercent(data.google_ads.ctr), change: 0, trend: "neutral" as const },
    cpc: { key: "cpc" as const, value: formatCurrency(data.google_ads.avg_cpc), change: 0, trend: "neutral" as const },
    cpa: { key: "cpa" as const, value: formatCurrency(data.google_ads.cost_per_conversion), change: 0, trend: "neutral" as const },
  } : null;

  const metaAdsMetrics = data?.meta_ads ? {
    investment: { key: "investment" as const, value: formatCurrency(data.meta_ads.investment), change: 0, trend: "neutral" as const },
    clicks: { key: "ctr" as const, value: formatNumber(data.meta_ads.clicks), change: 0, trend: "neutral" as const },
    impressions: { key: "ctr" as const, value: formatNumber(data.meta_ads.impressions), change: 0, trend: "neutral" as const },
    leads: { key: "leads" as const, value: formatNumber(data.meta_ads.leads), change: 0, trend: "neutral" as const },
    ctr: { key: "ctr" as const, value: formatPercent(data.meta_ads.ctr), change: 0, trend: "neutral" as const },
    cpc: { key: "cpc" as const, value: formatCurrency(data.meta_ads.cpc), change: 0, trend: "neutral" as const },
    cpa: { key: "cpa" as const, value: formatCurrency(data.meta_ads.cpa), change: 0, trend: "neutral" as const },
  } : null;

  const ga4Metrics = data?.ga4 ? {
    sessions: { key: "sessions" as const, value: formatNumber(data.ga4.sessions), change: 0, trend: "neutral" as const },
    events: { key: "events" as const, value: formatNumber(data.ga4.events), change: 0, trend: "neutral" as const },
    conversion_rate: { key: "conversion_rate" as const, value: formatPercent(data.ga4.conversion_rate), change: 0, trend: "neutral" as const },
  } : null;

  const changeDateRange = useCallback((range: DateRangeOption) => {
    setDateRange(range);
    fetchData(range);
  }, [fetchData]);

  return {
    data,
    metricData,
    campaigns,
    loading,
    error,
    usingMock,
    refetch: () => fetchData(dateRange),
    dateRange,
    changeDateRange,
    googleAdsMetrics,
    metaAdsMetrics,
    ga4Metrics,
    googleAdsCampaigns: data?.google_ads?.campaigns || null,
    metaAdsCampaigns: data?.meta_ads?.campaigns || null,
  };
}
