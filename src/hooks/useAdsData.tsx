import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MOCK_METRIC_DATA, type MetricData, type MetricKey } from "@/lib/types";

export interface AdsDataResult {
  google_ads: {
    investment: number;
    clicks: number;
    impressions: number;
    conversions: number;
    cost_per_conversion: number;
    ctr: number;
    avg_cpc: number;
    campaigns: Array<{ name: string; status: string; spend: number; clicks: number; conversions: number; cpa: number }>;
  } | null;
  meta_ads: {
    investment: number;
    impressions: number;
    clicks: number;
    leads: number;
    ctr: number;
    cpc: number;
    cpa: number;
    campaigns: Array<{ name: string; status: string; spend: number; leads: number; cpa: number }>;
  } | null;
  ga4: {
    sessions: number;
    events: number;
    conversion_rate: number;
  } | null;
  consolidated: {
    investment: number;
    revenue: number;
    roas: number;
    leads: number;
    cpa: number;
    ctr: number;
    cpc: number;
    conversion_rate: number;
    sessions: number;
    events: number;
    all_campaigns: Array<{ name: string; status: string; spend: number; leads?: number; clicks?: number; conversions?: number; cpa: number; source: string }>;
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

export function useAdsData() {
  const [data, setData] = useState<AdsDataResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUsingMock(true);
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/fetch-ads-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dm91Z2NjYnNybnJ0bnNnZXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTM2NjAsImV4cCI6MjA4NjUyOTY2MH0.lvUClvJaQRx2YGccRJwLMYpIudf9d-JE9dDwZkq0qh8",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const result = await res.json();

      if (result.error) {
        console.warn("Ads API error, falling back to mock:", result.error);
        setUsingMock(true);
      } else if (result.consolidated && result.consolidated.investment > 0) {
        setData(result);
        setUsingMock(false);
      } else {
        // No real data available, use mock
        setUsingMock(true);
      }
    } catch (err) {
      console.warn("Failed to fetch ads data, using mock:", err);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metricData: Record<MetricKey, MetricData> = usingMock || !data
    ? MOCK_METRIC_DATA
    : (consolidatedToMetricData(data.consolidated) || MOCK_METRIC_DATA);

  const campaigns = usingMock || !data?.consolidated
    ? null
    : data.consolidated.all_campaigns;

  return { data, metricData, campaigns, loading, error, usingMock, refetch: fetchData };
}
