import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type MetricData, type MetricKey } from "@/lib/types";
import { type DateRangeOption, isPresetRange, getDateRange, getPreviousDateRange, getExpectedDays, getBrazilToday } from "@/lib/date-utils";
import { formatCurrency, formatNumber, formatPercent, formatMultiplier } from "@/lib/formatters";
import { aggregateMetrics, type DailyMetricRow } from "@/lib/metric-utils";
import { fetchDailyMetrics, fetchDailyCampaigns } from "@/services/ads-data";
import { fetchLiveAdsData, fetchLiveAdsDataWithTimeout, triggerLiveSync } from "@/services/ads-api";

// Re-export for consumers that import DateRangeOption from this file
export type { DateRangeOption };

// ─── Types ──────────────────────────────────────────────────────────────

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
    ftd: number;
    cost_per_ftd: number;
    all_campaigns: Array<{ name: string; status: string; spend: number; leads?: number; clicks?: number; conversions?: number; messages?: number; purchases?: number; registrations?: number; revenue?: number; followers?: number; profile_visits?: number; ftd?: number; cpa: number; source: string; adset_count?: number; ad_count?: number }>;
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

// ─── Constants ──────────────────────────────────────────────────────────

const DEMO_CLIENT_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
];

const DB_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const ENRICH_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes

// ─── Pure helper: build AdsDataResult from DB rows ──────────────────────

function buildResultFromDB(
  metricRows: DailyMetricRow[],
  campaignRows: any[],
): AdsDataResult {
  // Aggregate campaigns by name (deduped by external_campaign_id or campaign_name)
  const campaignMap = new Map<string, any>();
  for (const row of campaignRows) {
    const dedupeKey = row.external_campaign_id
      ? `${row.external_campaign_id}__${row.source}`
      : `${row.campaign_name}__${row.source}`;
    const existing = campaignMap.get(dedupeKey);
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
      existing.ftd += Number(row.ftd) || 0;
      existing.adset_count = Math.max(existing.adset_count, Number(row.adset_count) || 0);
      existing.ad_count = Math.max(existing.ad_count, Number(row.ad_count) || 0);
    } else {
      campaignMap.set(dedupeKey, {
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
        ftd: Number(row.ftd) || 0,
        cpa: 0,
        source: row.source || "",
        adset_count: Number(row.adset_count) || 0,
        ad_count: Number(row.ad_count) || 0,
        external_campaign_id: row.external_campaign_id || null,
      });
    }
  }
  const aggregatedCampaigns = Array.from(campaignMap.values()).map((c) => {
    const primaryResult = c.messages > 0 ? c.messages : (c.purchases > 0 ? c.purchases : (c.registrations > 0 ? c.registrations : c.conversions));
    return { ...c, cpa: primaryResult > 0 ? c.spend / primaryResult : 0 };
  });

  const googleRows = metricRows.filter((r) => r.platform === "google");
  const metaRows = metricRows.filter((r) => r.platform === "meta");
  const googleAgg = aggregateMetrics(googleRows);
  const metaAgg = aggregateMetrics(metaRows);
  const allAgg = aggregateMetrics(metricRows);
  const googleCampaigns = aggregatedCampaigns.filter((c) => c.source === "Google Ads");
  const metaCampaigns = aggregatedCampaigns.filter((c) => c.source === "Meta Ads");

  const googleAdsData: GoogleAdsData | null = googleRows.length > 0 ? {
    investment: googleAgg.spend, revenue: googleAgg.revenue, clicks: googleAgg.clicks,
    impressions: googleAgg.impressions, conversions: googleAgg.conversions,
    cost_per_conversion: googleAgg.cpa, ctr: googleAgg.ctr, avg_cpc: googleAgg.cpc,
    campaigns: googleCampaigns.map((c) => ({ name: c.name, status: c.status, spend: c.spend, clicks: c.clicks, conversions: c.conversions, revenue: c.revenue, cpa: c.cpa })),
  } : null;

  // Use dedicated columns from daily_metrics when available, fall back to campaign aggregation
  const metaTotalPurchases = metaRows.reduce((s, r) => s + (Number((r as any).purchases) || 0), 0) || metaCampaigns.reduce((s, c) => s + (c.purchases || 0), 0);
  const metaTotalRegistrations = metaRows.reduce((s, r) => s + (Number((r as any).registrations) || 0), 0) || metaCampaigns.reduce((s, c) => s + (c.registrations || 0), 0);
  const metaTotalMessages = metaRows.reduce((s, r) => s + (Number((r as any).messages) || 0), 0) || metaCampaigns.reduce((s, c) => s + (c.messages || 0), 0);
  const metaTotalLeads = metaRows.reduce((s, r) => s + (Number((r as any).leads) || 0), 0) || metaCampaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const metaAdsData: MetaAdsData | null = metaRows.length > 0 ? {
    investment: metaAgg.spend, revenue: metaAgg.revenue, impressions: metaAgg.impressions,
    clicks: metaAgg.clicks, leads: metaTotalLeads,
    purchases: metaTotalPurchases, registrations: metaTotalRegistrations,
    messages: metaTotalMessages,
    ctr: metaAgg.ctr, cpc: metaAgg.cpc, cpa: metaAgg.cpa,
    campaigns: metaCampaigns.map((c) => ({ name: c.name, status: c.status, spend: c.spend, leads: c.leads, purchases: c.purchases || 0, registrations: c.registrations || 0, messages: c.messages, revenue: c.revenue, cpa: c.cpa })),
  } : null;

  const totalMessages = metaTotalMessages;

  // FTD totals from daily_metrics
  const totalFtd = metricRows.reduce((s, r) => s + (Number((r as any).ftd) || 0), 0);
  const totalInvestment = allAgg.spend;
  const costPerFtd = totalFtd > 0 ? totalInvestment / totalFtd : 0;

  return {
    google_ads: googleAdsData,
    meta_ads: metaAdsData,
    ga4: null,
    consolidated: {
      investment: allAgg.spend, revenue: allAgg.revenue, roas: allAgg.roas,
      leads: allAgg.conversions, messages: totalMessages, cpa: allAgg.cpa,
      ctr: allAgg.ctr, cpc: allAgg.cpc, conversion_rate: 0, sessions: 0, events: 0,
      ftd: totalFtd, cost_per_ftd: costPerFtd,
      all_campaigns: aggregatedCampaigns,
    },
    // Try to extract hourly_data from DB metric rows
    hourly_conversions: (() => {
      const hourlyRow = metricRows.find((r: any) => r.hourly_data);
      if (hourlyRow && (hourlyRow as any).hourly_data) {
        return (hourlyRow as any).hourly_data as AdsDataResult["hourly_conversions"];
      }
      return null;
    })(),
    geo_conversions: (() => {
      const geoRow = metricRows.find((r: any) => r.geo_data);
      if (geoRow && (geoRow as any).geo_data) {
        const gd = (geoRow as any).geo_data as { country?: any; region?: any; city?: any };
        return gd.country || null;
      }
      return null;
    })(),
    geo_conversions_region: (() => {
      const geoRow = metricRows.find((r: any) => r.geo_data);
      if (geoRow && (geoRow as any).geo_data) {
        const gd = (geoRow as any).geo_data as { country?: any; region?: any; city?: any };
        return gd.region || null;
      }
      return null;
    })(),
    geo_conversions_city: (() => {
      const geoRow = metricRows.find((r: any) => r.geo_data);
      if (geoRow && (geoRow as any).geo_data) {
        const gd = (geoRow as any).geo_data as { country?: any; region?: any; city?: any };
        return gd.city || null;
      }
      return null;
    })(),
  };
}

// ─── Pure helpers: build formatted metrics ──────────────────────────────

function calcChange(current: number, previous: number | undefined): { change: number; trend: "up" | "down" | "neutral" } {
  if (!previous || previous === 0) return { change: 0, trend: "neutral" };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.1) return { change: 0, trend: "neutral" };
  return { change: pct, trend: pct > 0 ? "up" : "down" };
}

function buildMetricData(
  consolidated: AdsDataResult["consolidated"],
  prev: { spend: number; revenue: number; roas: number; leads: number; messages: number; cpa: number; ctr: number; cpc: number; ftd?: number; cost_per_ftd?: number; registrations?: number } | null,
): Partial<Record<MetricKey, MetricData>> {
  if (!consolidated) return {};
  const p = prev;
  return {
    investment: { key: "investment", value: formatCurrency(consolidated.investment), ...calcChange(consolidated.investment, p?.spend) },
    revenue: { key: "revenue", value: formatCurrency(consolidated.revenue), ...calcChange(consolidated.revenue, p?.revenue) },
    roas: { key: "roas", value: formatMultiplier(consolidated.roas), ...calcChange(consolidated.roas, p?.roas) },
    leads: { key: "leads", value: formatNumber(consolidated.leads), ...calcChange(consolidated.leads, p?.leads) },
    messages: { key: "messages", value: formatNumber(consolidated.messages || 0), ...calcChange(consolidated.messages || 0, p?.messages) },
    cpa: { key: "cpa", value: formatCurrency(consolidated.cpa), ...calcChange(consolidated.cpa, p?.cpa) },
    ftd: { key: "ftd", value: formatNumber(consolidated.ftd || 0), ...calcChange(consolidated.ftd || 0, p?.ftd || 0) },
    cost_per_ftd: { key: "cost_per_ftd", value: consolidated.cost_per_ftd > 0 ? formatCurrency(consolidated.cost_per_ftd) : "—", ...calcChange(consolidated.cost_per_ftd || 0, p?.cost_per_ftd || 0) },
    ctr: { key: "ctr", value: formatPercent(consolidated.ctr), ...calcChange(consolidated.ctr, p?.ctr) },
    cpc: { key: "cpc", value: formatCurrency(consolidated.cpc), ...calcChange(consolidated.cpc, p?.cpc) },
    conversion_rate: { key: "conversion_rate", value: formatPercent(consolidated.conversion_rate), change: 0, trend: "neutral" },
    sessions: { key: "sessions", value: formatNumber(consolidated.sessions), change: 0, trend: "neutral" },
    events: { key: "events", value: formatNumber(consolidated.events), change: 0, trend: "neutral" },
    campaign_names: { key: "campaign_names", value: `${consolidated.all_campaigns.filter((c) => c.status === "Ativa").length} ativas`, change: 0, trend: "neutral" },
    ad_sets: { key: "ad_sets", value: "—", change: 0, trend: "neutral" },
    attribution_comparison: { key: "attribution_comparison", value: "Multi-touch", change: 0, trend: "neutral" },
    discrepancy_percentage: { key: "discrepancy_percentage", value: "—", change: 0, trend: "neutral" },
    trend_charts: { key: "trend_charts", value: "30 dias", change: 0, trend: "neutral" },
    funnel_visualization: { key: "funnel_visualization", value: "—", change: 0, trend: "neutral" },
  };
}

function buildGoogleMetrics(g: GoogleAdsData | null) {
  if (!g) return null;
  return {
    investment: { key: "investment" as const, value: formatCurrency(g.investment), change: 0, trend: "neutral" as const },
    clicks: { key: "ctr" as const, value: formatNumber(g.clicks), change: 0, trend: "neutral" as const },
    impressions: { key: "ctr" as const, value: formatNumber(g.impressions), change: 0, trend: "neutral" as const },
    conversions: { key: "leads" as const, value: formatNumber(g.conversions), change: 0, trend: "neutral" as const },
    ctr: { key: "ctr" as const, value: formatPercent(g.ctr), change: 0, trend: "neutral" as const },
    cpc: { key: "cpc" as const, value: formatCurrency(g.avg_cpc), change: 0, trend: "neutral" as const },
    cpa: { key: "cpa" as const, value: formatCurrency(g.cost_per_conversion), change: 0, trend: "neutral" as const },
    revenue: { key: "revenue" as const, value: formatCurrency(g.revenue), change: 0, trend: "neutral" as const },
  };
}

function buildMetaMetrics(m: MetaAdsData | null) {
  if (!m) return null;
  return {
    investment: { key: "investment" as const, value: formatCurrency(m.investment), change: 0, trend: "neutral" as const },
    clicks: { key: "ctr" as const, value: formatNumber(m.clicks), change: 0, trend: "neutral" as const },
    impressions: { key: "ctr" as const, value: formatNumber(m.impressions), change: 0, trend: "neutral" as const },
    leads: { key: "leads" as const, value: formatNumber(m.leads), change: 0, trend: "neutral" as const },
    ctr: { key: "ctr" as const, value: formatPercent(m.ctr), change: 0, trend: "neutral" as const },
    cpc: { key: "cpc" as const, value: formatCurrency(m.cpc), change: 0, trend: "neutral" as const },
    cpa: { key: "cpa" as const, value: formatCurrency(m.cpa), change: 0, trend: "neutral" as const },
    revenue: { key: "revenue" as const, value: formatCurrency(m.revenue), change: 0, trend: "neutral" as const },
    messages: { key: "messages" as const, value: formatNumber(m.messages), change: 0, trend: "neutral" as const },
    purchases: { key: "meta_conversions" as const, value: formatNumber(m.purchases), change: 0, trend: "neutral" as const },
    registrations: { key: "meta_registrations" as const, value: formatNumber(m.registrations), change: 0, trend: "neutral" as const },
    cost_per_purchase: { key: "meta_cost_per_purchase" as const, value: m.purchases > 0 ? formatCurrency(m.investment / m.purchases) : "—", change: 0, trend: "neutral" as const },
    cost_per_registration: { key: "meta_cost_per_registration" as const, value: m.registrations > 0 ? formatCurrency(m.investment / m.registrations) : "—", change: 0, trend: "neutral" as const },
  };
}

function buildGA4Metrics(g: GA4Data | null) {
  if (!g) return null;
  return {
    sessions: { key: "sessions" as const, value: formatNumber(g.sessions), change: 0, trend: "neutral" as const },
    events: { key: "events" as const, value: formatNumber(g.events), change: 0, trend: "neutral" as const },
    conversion_rate: { key: "conversion_rate" as const, value: formatPercent(g.conversion_rate), change: 0, trend: "neutral" as const },
  };
}

// ─── Core fetcher: DB data + campaigns ──────────────────────────────────

async function fetchDBData(range: DateRangeOption, clientId?: string) {
  const { startDate, endDate } = getDateRange(range);
  const [metricRows, campaignRows] = await Promise.all([
    fetchDailyMetrics(startDate, endDate, clientId),
    fetchDailyCampaigns(startDate, endDate, clientId),
  ]);
  const uniqueDates = new Set(metricRows.map(r => r.date));
  return { metricRows, campaignRows, availableDays: uniqueDates.size };
}

async function fetchPreviousPeriod(range: DateRangeOption, clientId?: string) {
  const { startDate, endDate } = getPreviousDateRange(range);
  const [prevMetricRows, prevCampRows] = await Promise.all([
    fetchDailyMetrics(startDate, endDate, clientId),
    fetchDailyCampaigns(startDate, endDate, clientId),
  ]);
  const prevAgg = aggregateMetrics(prevMetricRows as DailyMetricRow[]);
  const prevMessages = (prevCampRows || []).reduce((sum: number, r: any) => sum + (Number(r.messages) || 0), 0);
  const prevFtd = (prevMetricRows || []).reduce((sum: number, r: any) => sum + (Number(r.ftd) || 0), 0);
  const prevRegistrations = (prevMetricRows || []).reduce((sum: number, r: any) => sum + (Number(r.registrations) || 0), 0);
  const prevCostPerFtd = prevFtd > 0 ? prevAgg.spend / prevFtd : 0;
  return {
    spend: prevAgg.spend, revenue: prevAgg.revenue, roas: prevAgg.roas,
    leads: prevAgg.conversions, messages: prevMessages, cpa: prevAgg.cpa,
    ctr: prevAgg.ctr, cpc: prevAgg.cpc,
    ftd: prevFtd, cost_per_ftd: prevCostPerFtd,
    registrations: prevRegistrations,
  };
}

// ─── Main hook ──────────────────────────────────────────────────────────

export function useAdsData(clientId?: string) {
  const [dateRange, setDateRange] = useState<DateRangeOption>("LAST_2_DAYS");
  const queryClient = useQueryClient();

  const { startDate, endDate } = getDateRange(dateRange);
  const { startDate: prevStart, endDate: prevEnd } = getPreviousDateRange(dateRange);
  const isDemo = !!clientId && DEMO_CLIENT_IDS.includes(clientId);


  useEffect(() => {
    if (!clientId) return
    queryClient.invalidateQueries({ queryKey: ["dailyMetrics"] })
    queryClient.invalidateQueries({ queryKey: ["dailyCampaigns"] })
    queryClient.invalidateQueries({ queryKey: ["prevMetrics"] })
    queryClient.invalidateQueries({ queryKey: ["prevCampaigns"] })
    queryClient.invalidateQueries({ queryKey: ["liveData"] })
    queryClient.invalidateQueries({ queryKey: ["liveEnrich"] })
  }, [clientId, queryClient])

  // 1) DB metrics + campaigns
  const dbQuery = useQuery({
    queryKey: ["dailyMetrics", clientId, startDate, endDate],
    queryFn: () => fetchDBData(dateRange, clientId),
    staleTime: DB_STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
    enabled: !!clientId && !!startDate && !!endDate,
    placeholderData: keepPreviousData,
  });

  const hasDBData = (dbQuery.data?.metricRows?.length ?? 0) > 0;

  // 2) Fallback to live API if no DB data (and not demo)
  const liveQuery = useQuery({
    queryKey: ["liveData", clientId, startDate, endDate],
    queryFn: () => fetchLiveAdsData(dateRange, clientId),
    staleTime: DB_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
    enabled: !!clientId && !!startDate && !!endDate && !isDemo && dbQuery.isFetched && !hasDBData,
  });

  // 3) Previous period for comparison
  const prevQuery = useQuery({
    queryKey: ["prevMetrics", clientId, prevStart, prevEnd],
    queryFn: () => fetchPreviousPeriod(dateRange, clientId),
    staleTime: DB_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
    enabled: !!clientId && !!prevStart && !!prevEnd && hasDBData,
  });

  // 4) Live enrichment (GA4, hourly, geo) when we have DB data
  const enrichQuery = useQuery({
    queryKey: ["liveEnrich", clientId, startDate, endDate],
    queryFn: () => fetchLiveAdsDataWithTimeout(dateRange, clientId),
    staleTime: ENRICH_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
    enabled: !!clientId && !!startDate && !!endDate && !isDemo && hasDBData,
  });


  useEffect(() => {
    if (clientId && !isDemo && hasDBData) {
      triggerLiveSync(clientId);
    }
  }, [clientId, isDemo, hasDBData]);

  // Build composite result
  const data = useMemo<AdsDataResult | null>(() => {
    // No DB data — use live fallback
    if (!hasDBData && liveQuery.data) {
      return liveQuery.data as AdsDataResult;
    }

    if (!dbQuery.data || !hasDBData) return null;

    const base = buildResultFromDB(dbQuery.data.metricRows as DailyMetricRow[], dbQuery.data.campaignRows);

    // Merge enrichment data (GA4, hourly, geo)
    if (enrichQuery.data) {
      const live = enrichQuery.data;

      // Conservative merge for Meta Ads: use higher value between DB and live
      const mergedMeta = (() => {
        if (!live.meta_ads) return base.meta_ads;
        if (!base.meta_ads) return live.meta_ads;
        return {
          ...base.meta_ads,
          purchases: Math.max(base.meta_ads.purchases, live.meta_ads.purchases || 0),
          registrations: Math.max(base.meta_ads.registrations, live.meta_ads.registrations || 0),
          messages: Math.max(base.meta_ads.messages, live.meta_ads.messages || 0),
          leads: Math.max(base.meta_ads.leads, live.meta_ads.leads || 0),
          investment: live.meta_ads.investment > 0
            ? Math.max(base.meta_ads.investment, live.meta_ads.investment)
            : base.meta_ads.investment,
          revenue: live.meta_ads.revenue > 0
            ? Math.max(base.meta_ads.revenue, live.meta_ads.revenue)
            : base.meta_ads.revenue,
        };
      })();

      // Conservative merge for Google Ads
      const mergedGoogle = (() => {
        if (!live.google_ads) return base.google_ads;
        if (!base.google_ads) return live.google_ads;
        return {
          ...base.google_ads,
          conversions: Math.max(base.google_ads.conversions, live.google_ads.conversions || 0),
          investment: live.google_ads.investment > 0
            ? Math.max(base.google_ads.investment, live.google_ads.investment)
            : base.google_ads.investment,
          revenue: live.google_ads.revenue > 0
            ? Math.max(base.google_ads.revenue, live.google_ads.revenue)
            : base.google_ads.revenue,
        };
      })();

      return {
        ...base,
        meta_ads: mergedMeta,
        google_ads: mergedGoogle,
        ga4: live.ga4 || base.ga4,
        hourly_conversions: live.hourly_conversions || base.hourly_conversions,
        geo_conversions: live.geo_conversions || base.geo_conversions,
        geo_conversions_region: live.geo_conversions_region || base.geo_conversions_region,
        geo_conversions_city: live.geo_conversions_city || base.geo_conversions_city,
        consolidated: base.consolidated ? {
          ...base.consolidated,
          conversion_rate: live.ga4?.conversion_rate ?? base.consolidated.conversion_rate,
          sessions: live.ga4?.sessions ?? base.consolidated.sessions,
          events: live.ga4?.events ?? base.consolidated.events,
          // Use live campaigns when available (they have correct aggregated data)
          all_campaigns: live.consolidated?.all_campaigns?.length
            ? live.consolidated.all_campaigns
            : base.consolidated.all_campaigns,
        } : base.consolidated,
      };
    }

    return base;
  }, [hasDBData, dbQuery.data, liveQuery.data, enrichQuery.data]);

  // Coverage info
  const availableDays = dbQuery.data?.availableDays ?? 0;
  const expectedDays = getExpectedDays(dateRange);

  // Previous period
  const previousPeriod = prevQuery.data ?? null;

  // Derived formatted data
  const metricData = useMemo(() => {
    if (!data?.consolidated) return null;
    return buildMetricData(data.consolidated, previousPeriod);
  }, [data, previousPeriod]);

  const campaigns = data?.consolidated?.all_campaigns ?? null;
  const googleAdsMetrics = useMemo(() => buildGoogleMetrics(data?.google_ads ?? null), [data]);
  const metaAdsMetrics = useMemo(() => buildMetaMetrics(data?.meta_ads ?? null), [data]);
  const ga4Metrics = useMemo(() => buildGA4Metrics(data?.ga4 ?? null), [data]);

  const isBackgroundRefetch = dbQuery.isPlaceholderData || (dbQuery.isFetching && !!data);
  const loading = !data && (dbQuery.isLoading || (dbQuery.isFetched && !hasDBData && liveQuery.isLoading));

  const changeDateRange = (range: DateRangeOption) => {
    setDateRange(range);
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["dailyMetrics", clientId] });
    queryClient.invalidateQueries({ queryKey: ["dailyCampaigns", clientId] });
    queryClient.invalidateQueries({ queryKey: ["prevMetrics", clientId] });
    queryClient.invalidateQueries({ queryKey: ["prevCampaigns", clientId] });
    queryClient.invalidateQueries({ queryKey: ["liveData", clientId] });
    queryClient.invalidateQueries({ queryKey: ["liveEnrich", clientId] });
    queryClient.invalidateQueries({ queryKey: ["ftd30", clientId] });
    queryClient.invalidateQueries({ queryKey: ["ftd30prev", clientId] });
  };

  return {
    data,
    metricData,
    campaigns,
    loading,
    isBackgroundRefetch,
    error: dbQuery.error?.message ?? liveQuery.error?.message ?? null,
    usingMock: false,
    refetch,
    dateRange,
    changeDateRange,
    googleAdsMetrics,
    metaAdsMetrics,
    ga4Metrics,
    googleAdsCampaigns: data?.google_ads?.campaigns || null,
    metaAdsCampaigns: data?.meta_ads?.campaigns || null,
    availableDays,
    expectedDays,
    dailyMetricRows: dbQuery.data?.metricRows ?? [],
    previousMetricRows: prevQuery.data ? [] as DailyMetricRow[] : [],
    ftd30Rows: (ftd30Query.data ?? []) as DailyMetricRow[],
    ftd30PrevRows: (ftd30PrevQuery.data ?? []) as DailyMetricRow[],
  };
}
