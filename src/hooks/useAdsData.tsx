import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MOCK_METRIC_DATA, type MetricData, type MetricKey } from "@/lib/types";

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

function consolidatedToMetricData(data: AdsDataResult["consolidated"]): Record<MetricKey, MetricData> | null {
  if (!data) return null;

  return {
    investment: { key: "investment", value: formatCurrency(data.investment), change: 0, trend: "neutral" },
    revenue: { key: "revenue", value: formatCurrency(data.revenue), change: 0, trend: "neutral" },
    roas: { key: "roas", value: data.roas > 0 ? `${data.roas.toFixed(2)}x` : "—", change: 0, trend: "neutral" },
    leads: { key: "leads", value: formatNumber(data.leads), change: 0, trend: "neutral" },
    cpa: { key: "cpa", value: formatCurrency(data.cpa), change: 0, trend: "neutral" },
    ctr: { key: "ctr", value: formatPercent(data.ctr), change: 0, trend: "neutral" },
    cpc: { key: "cpc", value: formatCurrency(data.cpc), change: 0, trend: "neutral" },
    conversion_rate: { key: "conversion_rate", value: formatPercent(data.conversion_rate), change: 0, trend: "neutral" },
    sessions: { key: "sessions", value: formatNumber(data.sessions), change: 0, trend: "neutral" },
    events: { key: "events", value: formatNumber(data.events), change: 0, trend: "neutral" },
    campaign_names: { key: "campaign_names", value: `${data.all_campaigns.filter((c) => c.status === "Ativa").length} ativas`, change: 0, trend: "neutral" },
    ad_sets: { key: "ad_sets", value: "—", change: 0, trend: "neutral" },
    attribution_comparison: { key: "attribution_comparison", value: "Multi-touch", change: 0, trend: "neutral" },
    discrepancy_percentage: { key: "discrepancy_percentage", value: "—", change: 0, trend: "neutral" },
    trend_charts: { key: "trend_charts", value: "30 dias", change: 0, trend: "neutral" },
    funnel_visualization: { key: "funnel_visualization", value: "—", change: 0, trend: "neutral" },
  };
}

function googleAdsToMetrics(data: GoogleAdsData): Record<string, MetricData> {
  return {
    investment: { key: "investment", value: formatCurrency(data.investment), change: 0, trend: "neutral" },
    clicks: { key: "ctr", value: formatNumber(data.clicks), change: 0, trend: "neutral" },
    impressions: { key: "ctr", value: formatNumber(data.impressions), change: 0, trend: "neutral" },
    conversions: { key: "leads", value: formatNumber(data.conversions), change: 0, trend: "neutral" },
    ctr: { key: "ctr", value: formatPercent(data.ctr), change: 0, trend: "neutral" },
    cpc: { key: "cpc", value: formatCurrency(data.avg_cpc), change: 0, trend: "neutral" },
    cpa: { key: "cpa", value: formatCurrency(data.cost_per_conversion), change: 0, trend: "neutral" },
  };
}

function metaAdsToMetrics(data: MetaAdsData): Record<string, MetricData> {
  return {
    investment: { key: "investment", value: formatCurrency(data.investment), change: 0, trend: "neutral" },
    clicks: { key: "ctr", value: formatNumber(data.clicks), change: 0, trend: "neutral" },
    impressions: { key: "ctr", value: formatNumber(data.impressions), change: 0, trend: "neutral" },
    leads: { key: "leads", value: formatNumber(data.leads), change: 0, trend: "neutral" },
    ctr: { key: "ctr", value: formatPercent(data.ctr), change: 0, trend: "neutral" },
    cpc: { key: "cpc", value: formatCurrency(data.cpc), change: 0, trend: "neutral" },
    cpa: { key: "cpa", value: formatCurrency(data.cpa), change: 0, trend: "neutral" },
  };
}

function ga4ToMetrics(data: GA4Data): Record<string, MetricData> {
  return {
    sessions: { key: "sessions", value: formatNumber(data.sessions), change: 0, trend: "neutral" },
    events: { key: "events", value: formatNumber(data.events), change: 0, trend: "neutral" },
    conversion_rate: { key: "conversion_rate", value: formatPercent(data.conversion_rate), change: 0, trend: "neutral" },
  };
}

export type DateRangeOption = "TODAY" | "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS";

const DATE_RANGE_TO_META: Record<DateRangeOption, string> = {
  TODAY: "today",
  LAST_7_DAYS: "last_7d",
  LAST_14_DAYS: "last_14d",
  LAST_30_DAYS: "last_30d",
};

const DATE_RANGE_TO_GA4: Record<DateRangeOption, { start: string; end: string }> = {
  TODAY: { start: "today", end: "today" },
  LAST_7_DAYS: { start: "7daysAgo", end: "today" },
  LAST_14_DAYS: { start: "14daysAgo", end: "today" },
  LAST_30_DAYS: { start: "30daysAgo", end: "today" },
};

export function useAdsData() {
  const [data, setData] = useState<AdsDataResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>("LAST_30_DAYS");

  const fetchData = useCallback(async (range: DateRangeOption = dateRange) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setData(null);
        setUsingMock(false);
        setLoading(false);
        return;
      }

      const ga4Range = DATE_RANGE_TO_GA4[range];

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
            meta_date_preset: DATE_RANGE_TO_META[range],
            ga4_start_date: ga4Range.start,
            ga4_end_date: ga4Range.end,
          }),
        }
      );

      const result = await res.json();

      if (result.error) {
        console.warn("Ads API error:", result.error);
        setData(null);
        setUsingMock(false);
      } else {
        setData(result);
        setUsingMock(false);
      }
    } catch (err) {
      console.warn("Failed to fetch ads data:", err);
      setData(null);
      setUsingMock(false);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metricData: Record<MetricKey, MetricData> | null = data?.consolidated
    ? consolidatedToMetricData(data.consolidated)
    : null;

  const campaigns = usingMock || !data?.consolidated
    ? null
    : data.consolidated.all_campaigns;

  const googleAdsMetrics = data?.google_ads ? googleAdsToMetrics(data.google_ads) : null;
  const metaAdsMetrics = data?.meta_ads ? metaAdsToMetrics(data.meta_ads) : null;
  const ga4Metrics = data?.ga4 ? ga4ToMetrics(data.ga4) : null;

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
