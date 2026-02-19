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
  purchases: number;
  registrations: number;
  messages: number;
  ctr: number;
  cpc: number;
  cpa: number;
  campaigns: Array<{ name: string; status: string; spend: number; leads: number; purchases: number; registrations: number; messages: number; revenue: number; cpa: number }>;
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
    all_campaigns: Array<{ name: string; status: string; spend: number; leads?: number; clicks?: number; conversions?: number; messages?: number; purchases?: number; registrations?: number; revenue?: number; followers?: number; profile_visits?: number; cpa: number; source: string }>;
  } | null;
  hourly_conversions: {
    purchases_by_hour?: Record<string, number>;
    registrations_by_hour?: Record<string, number>;
    messages_by_hour?: Record<string, number>;
  } | null;
  geo_conversions: Record<string, { purchases: number; registrations: number; messages: number; spend: number }> | null;
  geo_conversions_region: Record<string, { purchases: number; registrations: number; messages: number; spend: number }> | null;
  geo_conversions_city: Record<string, { purchases: number; registrations: number; messages: number; spend: number }> | null;
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

export type DateRangeOption = "TODAY" | "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS" | { startDate: string; endDate: string };

function isPresetRange(range: DateRangeOption): range is "TODAY" | "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS" {
  return typeof range === "string";
}

function getDateRange(range: DateRangeOption): { startDate: string; endDate: string } {
  if (!isPresetRange(range)) return { startDate: range.startDate, endDate: range.endDate };
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

function getPreviousDateRange(range: DateRangeOption): { startDate: string; endDate: string } {
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

const DEMO_CLIENT_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
];

export function useAdsData(clientId?: string) {
  const [data, setData] = useState<AdsDataResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>("LAST_30_DAYS");
  const [previousPeriod, setPreviousPeriod] = useState<{ spend: number; revenue: number; roas: number; leads: number; messages: number; cpa: number; ctr: number; cpc: number } | null>(null);

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

      // Count unique days with data for coverage detection
      const uniqueDates = new Set(metricRows.map(r => r.date));
      const availableDays = uniqueDates.size;
      const expectedDaysMap: Record<string, number> = { TODAY: 1, LAST_7_DAYS: 7, LAST_14_DAYS: 14, LAST_30_DAYS: 30 };
      const expectedDays = isPresetRange(range) ? expectedDaysMap[range] : Math.ceil((new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000*60*60*24)) + 1;

      // If no persisted data and not a demo client, trigger a live sync and fall back to API
      if (metricRows.length === 0 && (!clientId || !DEMO_CLIENT_IDS.includes(clientId))) {
        // Fall back to live API call
        const ga4Range = isPresetRange(range) ? ({
          TODAY: { start: "today", end: "today" },
          LAST_7_DAYS: { start: "7daysAgo", end: "today" },
          LAST_14_DAYS: { start: "14daysAgo", end: "today" },
          LAST_30_DAYS: { start: "30daysAgo", end: "today" },
        } as Record<string, { start: string; end: string }>)[range] : { start: range.startDate, end: range.endDate };
        const metaPreset = isPresetRange(range) ? ({
          TODAY: "today",
          LAST_7_DAYS: "last_7d",
          LAST_14_DAYS: "last_14d",
          LAST_30_DAYS: "last_30d",
        } as Record<string, string>)[range] : undefined;
        const metaTimeRange = !isPresetRange(range) ? { since: range.startDate, until: range.endDate } : undefined;
        const googleDateRange = !isPresetRange(range) ? `BETWEEN '${range.startDate}' AND '${range.endDate}'` : undefined;

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
              date_range: isPresetRange(range) ? range : "CUSTOM",
              meta_date_preset: metaPreset,
              meta_time_range: metaTimeRange,
              google_date_range: googleDateRange,
              ga4_start_date: ga4Range!.start,
              ga4_end_date: ga4Range!.end,
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

      // Fetch campaigns from daily_campaigns table
      let campaignQuery = supabase
        .from("daily_campaigns")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);

      if (clientId) {
        campaignQuery = campaignQuery.eq("client_id", clientId);
      }

      const { data: campaignRows } = await campaignQuery;

      // Aggregate campaigns by name (sum across dates)
      const campaignMap = new Map<string, { name: string; status: string; spend: number; clicks: number; conversions: number; leads: number; purchases: number; registrations: number; messages: number; followers: number; profile_visits: number; revenue: number; cpa: number; source: string }>();
      for (const row of (campaignRows || []) as Array<{ campaign_name: string; campaign_status: string; spend: number; clicks: number; conversions: number; leads: number; purchases?: number; registrations?: number; messages: number; followers?: number; profile_visits?: number; revenue: number; source: string }>) {
        const existing = campaignMap.get(row.campaign_name);
        if (existing) {
          existing.spend += Number(row.spend) || 0;
          existing.clicks += Number(row.clicks) || 0;
          existing.conversions += Number(row.conversions) || 0;
          existing.leads += Number(row.leads) || 0;
          existing.purchases += Number(row.purchases) || 0;
          existing.registrations += Number(row.registrations) || 0;
          existing.messages += Number(row.messages) || 0;
          existing.followers += Number(row.followers) || 0;
          existing.profile_visits += Number(row.profile_visits) || 0;
          existing.revenue += Number(row.revenue) || 0;
        } else {
          campaignMap.set(row.campaign_name, {
            name: row.campaign_name,
            status: row.campaign_status || "Ativa",
            spend: Number(row.spend) || 0,
            clicks: Number(row.clicks) || 0,
            conversions: Number(row.conversions) || 0,
            leads: Number(row.leads) || 0,
            purchases: Number(row.purchases) || 0,
            registrations: Number(row.registrations) || 0,
            messages: Number(row.messages) || 0,
            followers: Number(row.followers) || 0,
            profile_visits: Number(row.profile_visits) || 0,
            revenue: Number(row.revenue) || 0,
            cpa: 0,
            source: row.source || "",
          });
        }
      }
      // Recalculate CPA after aggregation
      const aggregatedCampaigns = Array.from(campaignMap.values()).map((c) => {
        const primaryResult = c.messages > 0 ? c.messages : (c.purchases > 0 ? c.purchases : (c.registrations > 0 ? c.registrations : c.conversions));
        return { ...c, cpa: primaryResult > 0 ? c.spend / primaryResult : 0 };
      });

      // Aggregate from persisted data
      const googleRows = metricRows.filter((r) => r.platform === "google");
      const metaRows = metricRows.filter((r) => r.platform === "meta");

      const googleAgg = aggregateMetrics(googleRows);
      const metaAgg = aggregateMetrics(metaRows);
      const allAgg = aggregateMetrics(metricRows);

      const googleCampaigns = aggregatedCampaigns.filter((c) => c.source === "Google Ads");
      const metaCampaigns = aggregatedCampaigns.filter((c) => c.source === "Meta Ads");

      const googleAdsData: GoogleAdsData | null = googleRows.length > 0 ? {
        investment: googleAgg.spend,
        revenue: googleAgg.revenue,
        clicks: googleAgg.clicks,
        impressions: googleAgg.impressions,
        conversions: googleAgg.conversions,
        cost_per_conversion: googleAgg.cpa,
        ctr: googleAgg.ctr,
        avg_cpc: googleAgg.cpc,
        campaigns: googleCampaigns.map((c) => ({ name: c.name, status: c.status, spend: c.spend, clicks: c.clicks, conversions: c.conversions, revenue: c.revenue, cpa: c.cpa })),
      } : null;

      const metaTotalPurchases = metaCampaigns.reduce((sum, c) => sum + (c.purchases || 0), 0);
      const metaTotalRegistrations = metaCampaigns.reduce((sum, c) => sum + (c.registrations || 0), 0);
      const metaAdsData: MetaAdsData | null = metaRows.length > 0 ? {
        investment: metaAgg.spend,
        revenue: metaAgg.revenue,
        impressions: metaAgg.impressions,
        clicks: metaAgg.clicks,
        leads: metaCampaigns.reduce((sum, c) => sum + (c.leads || 0), 0),
        purchases: metaTotalPurchases,
        registrations: metaTotalRegistrations,
        messages: metaCampaigns.reduce((sum, c) => sum + (c.messages || 0), 0),
        ctr: metaAgg.ctr,
        cpc: metaAgg.cpc,
        cpa: metaAgg.cpa,
        campaigns: metaCampaigns.map((c) => ({ name: c.name, status: c.status, spend: c.spend, leads: c.leads, purchases: c.purchases || 0, registrations: c.registrations || 0, messages: c.messages, revenue: c.revenue, cpa: c.cpa })),
      } : null;

      const totalMessages = metaCampaigns.reduce((sum, c) => sum + (c.messages || 0), 0);

      const result: AdsDataResult = {
        google_ads: googleAdsData,
        meta_ads: metaAdsData,
        ga4: null,
        consolidated: {
          investment: allAgg.spend,
          revenue: allAgg.revenue,
          roas: allAgg.roas,
          leads: allAgg.conversions,
          messages: totalMessages,
          cpa: allAgg.cpa,
          ctr: allAgg.ctr,
          cpc: allAgg.cpc,
          conversion_rate: 0,
          sessions: 0,
          events: 0,
          all_campaigns: aggregatedCampaigns,
        },
        hourly_conversions: null,
        geo_conversions: null,
        geo_conversions_region: null,
        geo_conversions_city: null,
      };

      // Fetch previous period for comparison
      const { startDate: prevStart, endDate: prevEnd } = getPreviousDateRange(range);
      let prevQuery = supabase
        .from("daily_metrics")
        .select("*")
        .gte("date", prevStart)
        .lte("date", prevEnd);
      if (clientId) prevQuery = prevQuery.eq("client_id", clientId);
      const { data: prevRows } = await prevQuery;
      const prevMetricRows = (prevRows || []) as DailyMetricRow[];
      const prevAgg = aggregateMetrics(prevMetricRows);
      
      // Calculate previous period messages from campaigns
      let prevCampaignQuery = supabase
        .from("daily_campaigns")
        .select("*")
        .gte("date", prevStart)
        .lte("date", prevEnd);
      if (clientId) prevCampaignQuery = prevCampaignQuery.eq("client_id", clientId);
      const { data: prevCampRows } = await prevCampaignQuery;
      const prevMessages = (prevCampRows || []).reduce((sum: number, r: any) => sum + (Number(r.messages) || 0), 0);
      
      setPreviousPeriod({
        spend: prevAgg.spend,
        revenue: prevAgg.revenue,
        roas: prevAgg.roas,
        leads: prevAgg.conversions,
        messages: prevMessages,
        cpa: prevAgg.cpa,
        ctr: prevAgg.ctr,
        cpc: prevAgg.cpc,
      });

      setData(result);
      setCoverageInfo({ availableDays, expectedDays });

      // Fetch live hourly + geo data in background and merge
      if (clientId && !DEMO_CLIENT_IDS.includes(clientId)) {
        (async () => {
          try {
            const ga4Range2 = isPresetRange(range) ? ({
              TODAY: { start: "today", end: "today" },
              LAST_7_DAYS: { start: "7daysAgo", end: "today" },
              LAST_14_DAYS: { start: "14daysAgo", end: "today" },
              LAST_30_DAYS: { start: "30daysAgo", end: "today" },
            } as Record<string, { start: string; end: string }>)[range] : { start: range.startDate, end: range.endDate };
            const metaPreset2 = isPresetRange(range) ? ({
              TODAY: "today",
              LAST_7_DAYS: "last_7d",
              LAST_14_DAYS: "last_14d",
              LAST_30_DAYS: "last_30d",
            } as Record<string, string>)[range] : undefined;
            const metaTimeRange2 = !isPresetRange(range) ? { since: range.startDate, until: range.endDate } : undefined;
            const googleDateRange2 = !isPresetRange(range) ? `BETWEEN '${range.startDate}' AND '${range.endDate}'` : undefined;

            const liveRes = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ads-data`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  date_range: isPresetRange(range) ? range : "CUSTOM",
                  meta_date_preset: metaPreset2,
                  meta_time_range: metaTimeRange2,
                  google_date_range: googleDateRange2,
                  ga4_start_date: ga4Range2!.start,
                  ga4_end_date: ga4Range2!.end,
                  client_id: clientId,
                }),
              }
            );
            const liveData = await liveRes.json();
            if (!liveData.error) {
              setData((prev) => prev ? {
                ...prev,
                hourly_conversions: liveData.hourly_conversions || prev.hourly_conversions,
                geo_conversions: liveData.geo_conversions || prev.geo_conversions,
                geo_conversions_region: liveData.geo_conversions_region || prev.geo_conversions_region,
                geo_conversions_city: liveData.geo_conversions_city || prev.geo_conversions_city,
                // Mescla meta_ads ao vivo (tem purchases/registrations/leads corretos)
                meta_ads: liveData.meta_ads || prev.meta_ads,
                // Mescla campanhas ao vivo para ter purchases/registrations corretos
                consolidated: prev.consolidated ? {
                  ...prev.consolidated,
                  all_campaigns: liveData.consolidated?.all_campaigns || prev.consolidated.all_campaigns,
                } : prev.consolidated,
              } : prev);
            }
          } catch (e) {
            console.warn("Live sync for hourly/geo failed:", e);
          }
        })();
      }
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

  function calcChange(current: number, previous: number | undefined): { change: number; trend: "up" | "down" | "neutral" } {
    if (!previous || previous === 0) return { change: 0, trend: "neutral" };
    const pct = ((current - previous) / previous) * 100;
    if (Math.abs(pct) < 0.1) return { change: 0, trend: "neutral" };
    return { change: pct, trend: pct > 0 ? "up" : "down" };
  }

  const metricData: Partial<Record<MetricKey, MetricData>> | null = data?.consolidated
    ? {
        investment: { key: "investment", value: formatCurrency(data.consolidated.investment), ...calcChange(data.consolidated.investment, previousPeriod?.spend) },
        revenue: { key: "revenue", value: formatCurrency(data.consolidated.revenue), ...calcChange(data.consolidated.revenue, previousPeriod?.revenue) },
        roas: { key: "roas", value: data.consolidated.roas > 0 ? `${data.consolidated.roas.toFixed(2)}x` : "—", ...calcChange(data.consolidated.roas, previousPeriod?.roas) },
        leads: { key: "leads", value: formatNumber(data.consolidated.leads), ...calcChange(data.consolidated.leads, previousPeriod?.leads) },
        messages: { key: "messages", value: formatNumber(data.consolidated.messages || 0), ...calcChange(data.consolidated.messages || 0, previousPeriod?.messages) },
        cpa: { key: "cpa", value: formatCurrency(data.consolidated.cpa), ...calcChange(data.consolidated.cpa, previousPeriod?.cpa) },
        ctr: { key: "ctr", value: formatPercent(data.consolidated.ctr), ...calcChange(data.consolidated.ctr, previousPeriod?.ctr) },
        cpc: { key: "cpc", value: formatCurrency(data.consolidated.cpc), ...calcChange(data.consolidated.cpc, previousPeriod?.cpc) },
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
    revenue: { key: "revenue" as const, value: formatCurrency(data.google_ads.revenue), change: 0, trend: "neutral" as const },
  } : null;

  const metaAdsMetrics = data?.meta_ads ? {
    investment: { key: "investment" as const, value: formatCurrency(data.meta_ads.investment), change: 0, trend: "neutral" as const },
    clicks: { key: "ctr" as const, value: formatNumber(data.meta_ads.clicks), change: 0, trend: "neutral" as const },
    impressions: { key: "ctr" as const, value: formatNumber(data.meta_ads.impressions), change: 0, trend: "neutral" as const },
    leads: { key: "leads" as const, value: formatNumber(data.meta_ads.leads), change: 0, trend: "neutral" as const },
    ctr: { key: "ctr" as const, value: formatPercent(data.meta_ads.ctr), change: 0, trend: "neutral" as const },
    cpc: { key: "cpc" as const, value: formatCurrency(data.meta_ads.cpc), change: 0, trend: "neutral" as const },
    cpa: { key: "cpa" as const, value: formatCurrency(data.meta_ads.cpa), change: 0, trend: "neutral" as const },
    revenue: { key: "revenue" as const, value: formatCurrency(data.meta_ads.revenue), change: 0, trend: "neutral" as const },
    messages: { key: "messages" as const, value: formatNumber(data.meta_ads.messages), change: 0, trend: "neutral" as const },
    purchases: { key: "meta_conversions" as const, value: formatNumber(data.meta_ads.purchases), change: 0, trend: "neutral" as const },
    registrations: { key: "meta_registrations" as const, value: formatNumber(data.meta_ads.registrations), change: 0, trend: "neutral" as const },
    cost_per_purchase: { key: "meta_cost_per_purchase" as const, value: data.meta_ads.purchases > 0 ? formatCurrency(data.meta_ads.investment / data.meta_ads.purchases) : "—", change: 0, trend: "neutral" as const },
    cost_per_registration: { key: "meta_cost_per_registration" as const, value: data.meta_ads.registrations > 0 ? formatCurrency(data.meta_ads.investment / data.meta_ads.registrations) : "—", change: 0, trend: "neutral" as const },
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

  // Track data coverage - moved to state set inside fetchData
  const [coverageInfo, setCoverageInfo] = useState({ availableDays: 0, expectedDays: 0 });

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
    availableDays: coverageInfo.availableDays,
    expectedDays: coverageInfo.expectedDays,
  };
}
