import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- Meta pagination helper ----------

async function fetchAllPages(url: string): Promise<any[]> {
  const allRows: any[] = [];
  let nextUrl: string | null = url;
  let page = 0;
  while (nextUrl) {
    const res: Response = await fetch(nextUrl);
    const data: any = await res.json();
    if (data.data) allRows.push(...data.data);
    nextUrl = data.paging?.next || null;
    page++;
    if (page > 20) break; // safety limit
  }
  console.log(`[fetchAllPages] Fetched ${allRows.length} rows across ${page} page(s)`);
  return allRows;
}

// ---------- Google Ads helpers ----------

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

interface GoogleAdsMetrics {
  investment: number;
  revenue: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cost_per_conversion: number;
  ctr: number;
  avg_cpc: number;
  campaigns: Array<{ name: string; status: string; spend: number; clicks: number; conversions: number; revenue: number; cpa: number; account_id: string }>;
  per_account: Array<{ account_id: string; investment: number; clicks: number; impressions: number; conversions: number; revenue: number; ftd: number }>;
}

/** Extract a conversion action count by name from Google Ads for a specific customer. */
async function fetchGoogleFTDByConversionName(
  accessToken: string,
  customerId: string,
  conversionName: string,
  devToken: string,
  dateClause: string
): Promise<number> {
  const cleanId = customerId.replace(/-/g, "");
  // Use the same date clause as the main query (DURING or BETWEEN)
  const query = `SELECT conversion_action.name, metrics.all_conversions FROM conversion_action ${dateClause} AND conversion_action.name = '${conversionName}'`;
  try {
    const res = await fetch(
      `https://googleads.googleapis.com/v16/customers/${cleanId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.results) {
      let total = 0;
      for (const row of data[0].results) {
        total += row.metrics?.allConversions || 0;
      }
      console.log(`[google-ftd] account=${customerId}, convName=${conversionName}, ftd=${Math.round(total)}`);
      return Math.round(total);
    }
    console.log(`[google-ftd] account=${customerId}, convName=${conversionName}, ftd=0 (no results)`);
  } catch (e) {
    console.warn(`[google-ftd] Could not fetch FTD for conversion "${conversionName}" on ${customerId}:`, e);
  }
  return 0;
}

async function fetchGoogleAdsData(
  accessToken: string,
  customerIds: string[],
  devToken: string,
  dateRange: string,
  googleDateRangeCustom?: string,
  ftdGoogleConvName?: string | null
): Promise<GoogleAdsMetrics> {
  const result: GoogleAdsMetrics = {
    investment: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0,
    cost_per_conversion: 0, ctr: 0, avg_cpc: 0, campaigns: [], per_account: [],
  };

  // Use custom BETWEEN clause or DURING preset
  const dateClause = googleDateRangeCustom
    ? `WHERE segments.date ${googleDateRangeCustom}`
    : `WHERE segments.date DURING ${dateRange}`;

  for (const customerId of customerIds) {
    const cleanId = customerId.replace(/-/g, "");
    const query = `SELECT metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion, metrics.ctr, metrics.average_cpc FROM customer ${dateClause}`;

    try {
      const res = await fetch(
        `https://googleads.googleapis.com/v16/customers/${cleanId}/googleAds:searchStream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": devToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        }
      );
      const data = await res.json();

      if (Array.isArray(data) && data[0]?.results) {
        let acctInvestment = 0, acctClicks = 0, acctImpressions = 0, acctConversions = 0, acctRevenue = 0;
        for (const row of data[0].results) {
          const m = row.metrics;
          const spend = (m.costMicros || 0) / 1_000_000;
          acctInvestment += spend;
          acctClicks += m.clicks || 0;
          acctImpressions += m.impressions || 0;
          acctConversions += m.conversions || 0;
          acctRevenue += m.conversionsValue || 0;
          result.investment += spend;
          result.clicks += m.clicks || 0;
          result.impressions += m.impressions || 0;
          result.conversions += m.conversions || 0;
          result.revenue += m.conversionsValue || 0;
        }
        // Fetch FTD for this account if configured
        let acctFtd = 0;
        if (ftdGoogleConvName) {
          acctFtd = await fetchGoogleFTDByConversionName(accessToken, customerId, ftdGoogleConvName, devToken, dateClause);
        }

        result.per_account.push({
          account_id: customerId,
          investment: acctInvestment,
          clicks: acctClicks,
          impressions: acctImpressions,
          conversions: acctConversions,
          revenue: acctRevenue,
          ftd: acctFtd,
        });
      }

      const campaignQuery = `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion FROM campaign ${dateClause} AND campaign.status = 'ENABLED' ORDER BY metrics.cost_micros DESC LIMIT 100`;

      const campRes = await fetch(
        `https://googleads.googleapis.com/v16/customers/${cleanId}/googleAds:searchStream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": devToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: campaignQuery }),
        }
      );
      const campData = await campRes.json();

      if (Array.isArray(campData) && campData[0]?.results) {
        for (const row of campData[0].results) {
          const spend = (row.metrics.costMicros || 0) / 1_000_000;
          const revenue = row.metrics.conversionsValue || 0;
          result.campaigns.push({
            name: row.campaign.name,
            status: "Ativa",
            spend,
            clicks: row.metrics.clicks || 0,
            conversions: row.metrics.conversions || 0,
            revenue,
            cpa: row.metrics.conversions > 0 ? spend / row.metrics.conversions : 0,
            account_id: customerId,
          });
        }
      }
    } catch (e) {
      console.error(`Google Ads error for ${customerId}:`, e);
    }
  }

  if (result.impressions > 0) result.ctr = (result.clicks / result.impressions) * 100;
  if (result.clicks > 0) result.avg_cpc = result.investment / result.clicks;
  if (result.conversions > 0) result.cost_per_conversion = result.investment / result.conversions;

  return result;
}

// ---------- Meta Ads helpers ----------

/** Extract a custom Meta action value from an actions array by event name. */
function extractMetaCustomAction(
  actions: Array<{ action_type: string; value?: string }>,
  eventName: string
): number {
  const act = actions?.find((a) => a.action_type === eventName);
  return act ? parseInt(act.value || "0") : 0;
}

interface MetaAccountMetrics {
  account_id: string;
  investment: number;
  revenue: number;
  impressions: number;
  clicks: number;
  purchases: number;
  registrations: number;
  messages: number;
  leads: number;
  ftd: number;
  timezone_name?: string;
}

interface MetaAdsMetrics {
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
  campaigns: Array<{ id: string; name: string; status: string; spend: number; clicks: number; leads: number; purchases: number; registrations: number; messages: number; followers: number; profile_visits: number; revenue: number; cpa: number; adset_count: number; ad_count: number; account_id: string; ftd: number }>;
  per_account: MetaAccountMetrics[];
}

async function fetchMetaAdsData(
  accessToken: string,
  adAccountIds: string[],
  datePreset: string,
  timeRange?: { since: string; until: string },
  ftdEventName?: string | null,
  registrationEventName?: string | null
): Promise<MetaAdsMetrics> {
  const result: MetaAdsMetrics = {
    investment: 0, revenue: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, registrations: 0, messages: 0,
    ctr: 0, cpc: 0, cpa: 0, campaigns: [], per_account: [],
  };

  // Build date parameter: use time_range if provided, otherwise date_preset
  const dateParam = timeRange
    ? `time_range=${encodeURIComponent(JSON.stringify(timeRange))}`
    : `date_preset=${datePreset}`;

  for (const accountId of adAccountIds) {
    try {
      // Fetch insights and account timezone in parallel
      const [res, tzRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,clicks,actions,action_values,cost_per_action_type,ctr,cpc&${dateParam}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${accessToken}`),
        fetch(`https://graph.facebook.com/v19.0/${accountId}?fields=timezone_name&access_token=${accessToken}`),
      ]);
      const data = await res.json();
      const tzData = await tzRes.json();
      const accountTimezone = tzData.timezone_name || null;

      if (data.data?.[0]) {
        const d = data.data[0];
        const acctSpend = parseFloat(d.spend || "0");
        const acctImpressions = parseInt(d.impressions || "0");
        const acctClicks = parseInt(d.clicks || "0");
        
        result.investment += acctSpend;
        result.impressions += acctImpressions;
        result.clicks += acctClicks;

        // Purchases (compras)
        const purchaseAction = d.actions?.find((a: { action_type: string }) => 
          a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
        );
        const acctPurchases = purchaseAction ? parseInt(purchaseAction.value || "0") : 0;
        result.purchases += acctPurchases;

         // Registrations (cadastros) — use custom event if configured, otherwise canonical
         let acctRegistrations = 0;
         if (registrationEventName) {
           const customRegAct = d.actions?.find((a: { action_type: string }) =>
             a.action_type === registrationEventName
           );
           acctRegistrations = customRegAct ? parseInt(customRegAct.value || "0") : 0;
         } else {
           // Priority: offsite_conversion.fb_pixel_complete_registration > complete_registration (never sum both)
           const regAction = d.actions?.find((a: { action_type: string }) =>
             a.action_type === "offsite_conversion.fb_pixel_complete_registration"
           ) || d.actions?.find((a: { action_type: string }) =>
             a.action_type === "complete_registration"
           );
           acctRegistrations = regAction ? parseInt(regAction.value || "0") : 0;
         }
         if (acctRegistrations > 0) result.registrations += acctRegistrations;

        // Leads — canonical: prefer fb_pixel variant, fallback to generic
        const leadAction = d.actions?.find((a: { action_type: string }) =>
          a.action_type === "offsite_conversion.fb_pixel_lead"
        ) || d.actions?.find((a: { action_type: string }) =>
          a.action_type === "lead"
        );
        const acctLeads = leadAction ? parseInt(leadAction.value || "0") : 0;

        // Leads = raw Meta lead action only (registrations and purchases tracked separately)
        result.leads += acctLeads;

        const msgAction = d.actions?.find((a: { action_type: string }) => 
          a.action_type === "onsite_conversion.messaging_conversation_started_7d" || 
          a.action_type === "onsite_conversion.messaging_first_reply"
        );
        const acctMessages = msgAction ? parseInt(msgAction.value || "0") : 0;
        if (acctMessages > 0) result.messages += acctMessages;

        // Revenue from purchase action_values
        const purchaseValue = d.action_values?.find((a: { action_type: string }) => 
          a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
        );
        const acctRevenue = purchaseValue ? parseFloat(purchaseValue.value || "0") : 0;
        if (acctRevenue > 0) result.revenue += acctRevenue;

        // FTD: custom event if configured, else 0 (decoupled from purchases)
        const acctFtd = ftdEventName
          ? extractMetaCustomAction(d.actions || [], ftdEventName)
          : 0;
        console.log(`[meta-ftd] account=${accountId}, event=${ftdEventName || 'none'}, actions_found=${JSON.stringify((d.actions || []).filter((a: any) => a.action_type === ftdEventName).map((a: any) => ({ type: a.action_type, value: a.value })))}, ftd=${acctFtd}`);

        // Store per-account metrics for individual persistence
        result.per_account.push({
          account_id: accountId,
          investment: acctSpend,
          revenue: acctRevenue,
          impressions: acctImpressions,
          clicks: acctClicks,
          purchases: acctPurchases,
          registrations: acctRegistrations,
          messages: acctMessages,
          leads: acctLeads,
          ftd: acctFtd,
          timezone_name: accountTimezone,
        });
      }

      // Fetch only ACTIVE campaigns to reduce API calls
      const campUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,effective_status,objective&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=100&access_token=${accessToken}`;
      const campRes = await fetch(campUrl);
      const campData = await campRes.json();
      console.log(`Meta campaigns ${accountId}: count=${campData.data?.length || 0}`);

      if (campData.data && campData.data.length > 0) {
        // Fetch insights in parallel batches of 5
        const activeCamps = campData.data;
        const BATCH = 5;
        for (let i = 0; i < activeCamps.length; i += BATCH) {
          const batch = activeCamps.slice(i, i + BATCH);
          const batchResults = await Promise.all(
            batch.map(async (camp: any) => {
              try {
                const insUrl = `https://graph.facebook.com/v19.0/${camp.id}/insights?fields=spend,clicks,actions,action_values&${dateParam}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${accessToken}`;
                const r = await fetch(insUrl);
                const d = await r.json();

                // Fetch adset count for this campaign
                let adsetCount = 0;
                let adCount = 0;
                try {
                  const filterParam = encodeURIComponent('[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]');
                  const adsetUrl = `https://graph.facebook.com/v19.0/${camp.id}/adsets?fields=id&filtering=${filterParam}&limit=1&summary=true&access_token=${accessToken}`;
                  const adsetRes = await fetch(adsetUrl);
                  const adsetData = await adsetRes.json();
                  adsetCount = adsetData.summary?.total_count ?? (adsetData.data?.length || 0);

                  // Fetch ad count for this campaign
                  const adsUrl = `https://graph.facebook.com/v19.0/${camp.id}/ads?fields=id&filtering=${filterParam}&limit=1&summary=true&access_token=${accessToken}`;
                  const adsRes = await fetch(adsUrl);
                  const adsData = await adsRes.json();
                  adCount = adsData.summary?.total_count ?? (adsData.data?.length || 0);
                  console.log(`[counts] Campaign ${camp.id} (${camp.name}): adsets=${adsetCount}, ads=${adCount}`);
                } catch (e) {
                  console.warn(`Failed to fetch adset/ad count for campaign ${camp.id}:`, e);
                }

                return { camp, insRow: d.data?.[0] || null, adsetCount, adCount };
              } catch { return { camp, insRow: null, adsetCount: 0, adCount: 0 }; }
            })
          );

          for (const { camp, insRow, adsetCount, adCount } of batchResults) {
            if (!insRow) continue;
            const spend = parseFloat(insRow.spend || "0");

            const actions = insRow.actions || [];
            const actionValues = insRow.action_values || [];

            // Purchases (compras)
            const purchaseAct = actions.find((a: any) => 
              a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
            );
            const purchases = parseInt(purchaseAct?.value || "0");

            // Registrations — use custom event if configured, otherwise canonical
            let registrations = 0;
            if (registrationEventName) {
              const customRegAct = actions.find((a: any) => a.action_type === registrationEventName);
              registrations = customRegAct ? parseInt(customRegAct.value || "0") : 0;
            } else {
              const regAct = actions.find((a: any) =>
                a.action_type === "offsite_conversion.fb_pixel_complete_registration"
              ) || actions.find((a: any) =>
                a.action_type === "complete_registration"
              );
              registrations = regAct ? parseInt(regAct.value || "0") : 0;
            }

            // Leads — canonical: prefer fb_pixel variant
            const campLeadAct = actions.find((a: any) =>
              a.action_type === "offsite_conversion.fb_pixel_lead"
            ) || actions.find((a: any) =>
              a.action_type === "lead"
            );
            const campLeads = campLeadAct ? parseInt(campLeadAct.value || "0") : 0;

            const msgAct = actions.find((a: any) =>
              a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
              a.action_type === "onsite_conversion.messaging_first_reply"
            );
            const messages = parseInt(msgAct?.value || "0");

            const purchaseVal = actionValues.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
            const revenue = parseFloat(purchaseVal?.value || "0");

            // Debug: log all action_types for follower campaigns
            if (camp.objective === "OUTCOME_ENGAGEMENT" || camp.name?.toLowerCase().includes("seguidor")) {
              console.log(`[debug-followers] Campaign: ${camp.name}, objective: ${camp.objective}, actions:`,
                JSON.stringify(actions.map((a: any) => ({ type: a.action_type, value: a.value }))));
            }

            // Followers (novos seguidores) - buscar todos os tipos possíveis
            const followAct = actions.find((a: any) =>
              a.action_type === "follow" || 
              a.action_type === "like" || 
              a.action_type === "page_like" ||
              a.action_type === "onsite_conversion.post_net_like"
            );
            let followers = parseInt(followAct?.value || "0");

            // Fallback: se não encontrou seguidores mas a campanha é de seguidores,
            // usar page_engagement como proxy
            if (followers === 0 && (
              camp.objective === "OUTCOME_ENGAGEMENT" ||
              camp.name?.toLowerCase().includes("seguidor")
            )) {
              const pageEngFallback = actions.find((a: any) => a.action_type === "page_engagement");
              followers = parseInt(pageEngFallback?.value || "0");
            }

            // Profile visits (engajamento com página)
            const pageEngAct = actions.find((a: any) =>
              a.action_type === "page_engagement"
            );
            const profileVisits = parseInt(pageEngAct?.value || "0");

            const isMessageCampaign = camp.objective === "MESSAGES" || messages > 0;
            const leads = campLeads;
            const primaryResult = isMessageCampaign ? messages : (purchases > 0 ? purchases : registrations);

            const clicks = parseInt(insRow.clicks || "0");

            // FTD at campaign level: custom event if configured, else 0
            const campFtd = ftdEventName
              ? extractMetaCustomAction(actions, ftdEventName)
              : 0;

            result.campaigns.push({
              id: camp.id,
              name: camp.name,
              status: "Ativa",
              spend,
              clicks,
              leads,
              purchases,
              registrations,
              messages,
              followers,
              profile_visits: profileVisits,
              revenue,
              cpa: primaryResult > 0 ? spend / primaryResult : 0,
              adset_count: adsetCount,
              ad_count: adCount,
              account_id: accountId,
              ftd: campFtd,
            });
          }
        }
        console.log(`Meta campaigns with spend: ${result.campaigns.length}`);
      }
    } catch (e) {
      console.error(`Meta Ads error for ${accountId}:`, e);
    }
  }

  if (result.impressions > 0) result.ctr = (result.clicks / result.impressions) * 100;
  if (result.clicks > 0) result.cpc = result.investment / result.clicks;
  if (result.registrations > 0) result.cpa = result.investment / result.registrations;

  return result;
}

// ---------- GA4 helpers ----------

interface GA4UTMEntry {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  users: number;
  conversions: number;
}

interface GA4EventBreakdown {
  eventName: string;
  count: number;
}

interface GA4UTMEventEntry {
  eventName: string;
  source: string;
  medium: string;
  campaign: string;
  count: number;
}

interface GA4Metrics {
  sessions: number;
  events: number;
  conversion_rate: number;
  utm_breakdown: GA4UTMEntry[];
  utm_event_breakdown: GA4EventBreakdown[];
  utm_events_by_campaign: GA4UTMEventEntry[];
  first_touch_events: GA4UTMEventEntry[];
}

// Expanded list: generic ecommerce + iGaming/betting custom events
const RELEVANT_EVENTS = [
  "purchase", "generate_lead", "sign_up", "begin_checkout", "add_to_cart",
  "contact", "submit_form",
  // iGaming / betting custom events (GTM DataLayer)
  "first_deposit", "ftd", "deposit_confirmed", "initiate_checkout", "signup_confirmed",
];

const PAID_MEDIUMS = new Set(["cpc", "cpm", "cpv", "ppc", "paid", "paidsocial", "paid_social", "display", "retargeting", "remarketing"]);
function isPaidMedium(medium: string): boolean {
  const m = (medium || "").toLowerCase().trim();
  return PAID_MEDIUMS.has(m) || m.includes("paid") || m.includes("cpc");
}

async function fetchGA4Data(
  accessToken: string,
  propertyIds: string[],
  startDate: string,
  endDate: string
): Promise<GA4Metrics> {
  const result: GA4Metrics = { sessions: 0, events: 0, conversion_rate: 0, utm_breakdown: [], utm_event_breakdown: [], utm_events_by_campaign: [], first_touch_events: [] };

  for (const propertyId of propertyIds) {
    try {
      // 1) Aggregate metrics (existing)
      const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: "sessions" },
              { name: "eventCount" },
              { name: "sessionConversionRate" },
            ],
          }),
        }
      );
      const data = await res.json();
      if (data.rows?.[0]?.metricValues) {
        const vals = data.rows[0].metricValues;
        result.sessions += parseInt(vals[0]?.value || "0");
        result.events += parseInt(vals[1]?.value || "0");
        result.conversion_rate = parseFloat(vals[2]?.value || "0") * 100;
      }

    } catch (e) {
      console.error(`GA4 metrics error for ${propertyId}:`, e);
    }

    // 2) UTM breakdown by source/medium/campaign (separate try/catch so metric fetch is not affected)
    try {
      console.log(`[GA4 UTM] Fetching UTM breakdown for ${propertyId} (${startDate} → ${endDate})`);

      const utmBody = (convMetric: string) => JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "sessionCampaignName" },
        ],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: convMetric },
        ],
        orderBys: [
          { metric: { metricName: "sessions" }, desc: true },
        ],
        limit: 50,
      });

      let utmData: any = null;

      // Try keyEvents first (newer GA4 API), fallback to conversions
      for (const metric of ["keyEvents", "conversions"]) {
        const utmRes = await fetch(
          `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: utmBody(metric),
          }
        );
        const parsed = await utmRes.json();
        if (parsed.error) {
          console.log(`[GA4 UTM] Metric '${metric}' failed: ${parsed.error.message}`);
          continue;
        }
        console.log(`[GA4 UTM] Metric '${metric}' succeeded: ${parsed.rows?.length ?? 0} rows`);
        utmData = parsed;
        break;
      }


      if (utmData?.rows) {
        for (const row of utmData.rows) {
          const dims = row.dimensionValues || [];
          const vals = row.metricValues || [];
          const sessions = parseInt(vals[0]?.value || "0");
          if (sessions === 0) continue;
          const medium = dims[1]?.value || "(not set)";
          if (!isPaidMedium(medium)) continue;
          result.utm_breakdown.push({
            source: dims[0]?.value || "(not set)",
            medium,
            campaign: dims[2]?.value || "(not set)",
            sessions,
            users: parseInt(vals[1]?.value || "0"),
            conversions: parseInt(vals[2]?.value || "0"),
          });
        }
      }
    } catch (e) {
      console.log(`[GA4 UTM] Exception for ${propertyId}: ${String(e)}`);
    }

    // 3) Event-level conversion breakdown using eventCount filtered by relevant events
    // This captures ALL event fires, not just those marked as "key events" in GA4
    try {
      console.log(`[GA4 Events] Fetching event breakdown for ${propertyId}`);

      const eventBody = JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: RELEVANT_EVENTS },
          },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 30,
      });

      const evRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: eventBody,
        }
      );
      const eventData = await evRes.json();

      if (eventData.error) {
        console.log(`[GA4 Events] eventCount query failed: ${eventData.error.message}`);
      } else {
        console.log(`[GA4 Events] eventCount succeeded: ${eventData.rows?.length ?? 0} rows`);
        if (eventData.rows) {
          for (const row of eventData.rows) {
            const eventName = row.dimensionValues?.[0]?.value || "(unknown)";
            const count = parseInt(row.metricValues?.[0]?.value || "0");
            if (count <= 0) continue;
            const existing = result.utm_event_breakdown.find((e) => e.eventName === eventName);
            if (existing) {
              existing.count += count;
            } else {
              result.utm_event_breakdown.push({ eventName, count });
            }
          }
        }
      }
    } catch (e) {
      console.log(`[GA4 Events] Exception for ${propertyId}: ${String(e)}`);
    }

    // 4) Events crossed with UTM dimensions (eventName x source/medium/campaign)
    try {
      console.log(`[GA4 UTM Events] Fetching events by UTM for ${propertyId}`);

      const utmEventBody = JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: "eventName" },
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "sessionCampaignName" },
        ],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: RELEVANT_EVENTS },
          },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 500,
      });

      const utmEvRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: utmEventBody,
        }
      );
      const utmEvData = await utmEvRes.json();

      if (utmEvData.error) {
        console.log(`[GA4 UTM Events] query failed: ${utmEvData.error.message}`);
      } else {
        console.log(`[GA4 UTM Events] succeeded: ${utmEvData.rows?.length ?? 0} rows`);
        if (utmEvData.rows) {
          for (const row of utmEvData.rows) {
            const dims = row.dimensionValues || [];
            const count = parseInt(row.metricValues?.[0]?.value || "0");
            if (count <= 0) continue;
            const medium = dims[2]?.value || "(not set)";
            if (!isPaidMedium(medium)) continue;
            result.utm_events_by_campaign.push({
              eventName: dims[0]?.value || "(unknown)",
              source: dims[1]?.value || "(not set)",
              medium,
              campaign: dims[3]?.value || "(not set)",
              count,
            });
          }
        }
      }
    } catch (e) {
      console.log(`[GA4 UTM Events] Exception for ${propertyId}: ${String(e)}`);
    }

    // 5) First-Touch Attribution: events by firstUserSource/firstUserMedium/firstUserCampaignName
    try {
      console.log(`[GA4 First-Touch] Fetching first-touch events for ${propertyId}`);

      const ftBody = JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: "eventName" },
          { name: "firstUserSource" },
          { name: "firstUserMedium" },
          { name: "firstUserCampaignName" },
        ],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: RELEVANT_EVENTS },
          },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 500,
      });

      const ftRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: ftBody,
        }
      );
      const ftData = await ftRes.json();

      if (ftData.error) {
        console.log(`[GA4 First-Touch] query failed: ${ftData.error.message}`);
      } else {
        console.log(`[GA4 First-Touch] succeeded: ${ftData.rows?.length ?? 0} rows`);
        if (ftData.rows) {
          for (const row of ftData.rows) {
            const dims = row.dimensionValues || [];
            const count = parseInt(row.metricValues?.[0]?.value || "0");
            if (count <= 0) continue;
            result.first_touch_events.push({
              eventName: dims[0]?.value || "(unknown)",
              source: dims[1]?.value || "(not set)",
              medium: dims[2]?.value || "(not set)",
              campaign: dims[3]?.value || "(not set)",
              count,
            });
          }
        }
      }
    } catch (e) {
      console.log(`[GA4 First-Touch] Exception for ${propertyId}: ${String(e)}`);
    }
  }

  // Sort UTM breakdown by sessions descending (in case of multiple properties)
  result.utm_breakdown.sort((a, b) => b.sessions - a.sessions);

  return result;
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!ANON_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration error: missing anon key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate user
  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData.user.id;

  // Use service role to read tokens
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Determine the effective manager_id based on role
  // If user is a client, resolve their linked manager
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  const userRole = roleData?.[0]?.role || "manager";
  let effectiveManagerId = userId;

  if (userRole === "client") {
    const { data: link } = await supabaseAdmin
      .from("client_manager_links")
      .select("manager_id")
      .eq("client_user_id", userId)
      .limit(1);

    if (!link || link.length === 0) {
      return new Response(JSON.stringify({ error: "No manager linked to this client", consolidated: null, google_ads: null, meta_ads: null, ga4: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    effectiveManagerId = link[0].manager_id;
  }

  const { data: connections, error: connError } = await supabaseAdmin
    .from("oauth_connections")
    .select("*")
    .eq("manager_id", effectiveManagerId)
    .eq("connected", true);

  if (connError) {
    return new Response(JSON.stringify({ error: connError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse body FIRST so we can use client_id for account filtering
  const body = await req.json().catch(() => ({}));
  console.log("[fetch-ads-data] action:", body.action, "client_id:", body.client_id);
  const targetClientId = body.client_id;

  // ========== ACTION: list_custom_events ==========
  if (body.action === "list_custom_events") {
    try {
      const clientId = body.client_id;
      if (!clientId) {
        return new Response(JSON.stringify({ error: "client_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Meta accounts for this client
      const { data: cMeta } = await supabaseAdmin
        .from("client_meta_ad_accounts")
        .select("ad_account_id")
        .eq("client_user_id", clientId);
      const metaIds = (cMeta || []).map((a) => a.ad_account_id);

      if (metaIds.length === 0) {
        return new Response(JSON.stringify({ events: [], message: "Nenhuma conta Meta vinculada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Meta connection token
      const metaConn = connections?.find((c) => c.provider === "meta_ads");
      if (!metaConn?.access_token) {
        return new Response(JSON.stringify({ events: [], message: "Meta Ads não conectado" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use a Map to store events with names (deduplicating by action_type)
      const eventsMap = new Map<string, { action_type: string; name?: string; is_custom: boolean; is_conversion: boolean }>();
      const warnings: string[] = [];

      for (const accountId of metaIds) {
        // Ensure act_ prefix
        const formattedId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
        console.log(`[list_custom_events] Processing account: ${formattedId} (raw: ${accountId})`);

        // 1. Fetch actions from insights (events that already fired in the last 30 days)
        try {
          const insightsUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights?fields=actions&date_preset=last_30d&access_token=${metaConn.access_token}`;
          const res = await fetch(insightsUrl);
          const data = await res.json();
          console.log(`[list_custom_events] Insights response for ${formattedId}:`, JSON.stringify(data).substring(0, 500));
          if (data.error) {
            warnings.push(`Insights ${formattedId}: ${data.error.message}`);
          } else if (data.data?.[0]?.actions) {
            for (const action of data.data[0].actions) {
              if (!eventsMap.has(action.action_type)) {
                eventsMap.set(action.action_type, {
                  action_type: action.action_type,
                  is_custom: action.action_type.includes("custom") || action.action_type.includes("fb_pixel_custom"),
                  is_conversion: action.action_type.includes("offsite_conversion") || action.action_type.includes("onsite_conversion"),
                });
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch insights for ${formattedId}:`, e);
          warnings.push(`Insights ${formattedId}: ${(e as Error).message}`);
        }

        // 2. Fetch Custom Conversions (conversões personalizadas)
        try {
          const ccUrl = `https://graph.facebook.com/v19.0/${formattedId}/customconversions?fields=id,name,custom_event_type&access_token=${metaConn.access_token}`;
          console.log(`[list_custom_events] Fetching custom conversions: ${ccUrl.replace(metaConn.access_token, "TOKEN")}`);
          const ccRes = await fetch(ccUrl);
          const ccData = await ccRes.json();
          console.log(`[list_custom_events] Custom Conversions raw response for ${formattedId}:`, JSON.stringify(ccData).substring(0, 1000));

          if (ccData.error) {
            warnings.push(`CustomConversions ${formattedId}: ${ccData.error.message} (code: ${ccData.error.code})`);
            
            // Fallback: try /me/customconversions
            console.log(`[list_custom_events] Trying fallback /me/customconversions...`);
            try {
              const fallbackUrl = `https://graph.facebook.com/v19.0/me/customconversions?fields=id,name,custom_event_type&access_token=${metaConn.access_token}`;
              const fbRes = await fetch(fallbackUrl);
              const fbData = await fbRes.json();
              console.log(`[list_custom_events] Fallback /me/customconversions response:`, JSON.stringify(fbData).substring(0, 1000));
              if (fbData.data) {
                for (const cc of fbData.data) {
                  const actionType = `offsite_conversion.custom.${cc.id}`;
                  eventsMap.set(actionType, {
                    action_type: actionType,
                    name: cc.name,
                    is_custom: true,
                    is_conversion: true,
                  });
                }
                warnings.push(`Fallback /me/customconversions: encontrou ${fbData.data.length} conversão(ões)`);
              } else if (fbData.error) {
                warnings.push(`Fallback /me/customconversions: ${fbData.error.message}`);
              }
            } catch (fbErr) {
              warnings.push(`Fallback /me/customconversions: ${(fbErr as Error).message}`);
            }
          } else if (ccData.data) {
            console.log(`[list_custom_events] Found ${ccData.data.length} custom conversions for ${formattedId}`);
            for (const cc of ccData.data) {
              const actionType = `offsite_conversion.custom.${cc.id}`;
              eventsMap.set(actionType, {
                action_type: actionType,
                name: cc.name,
                is_custom: true,
                is_conversion: true,
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch custom conversions for ${formattedId}:`, e);
          warnings.push(`CustomConversions ${formattedId}: ${(e as Error).message}`);
        }
      }

      // Convert to sorted array
      const events = Array.from(eventsMap.values()).sort((a, b) => {
        if (a.name && !b.name) return -1;
        if (!a.name && b.name) return 1;
        return a.action_type.localeCompare(b.action_type);
      });

      console.log(`[list_custom_events] Returning ${events.length} events (${events.filter(e => e.name).length} with names), ${warnings.length} warnings`);

      return new Response(JSON.stringify({ events, warnings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("list_custom_events error:", e);
      return new Response(JSON.stringify({ error: (e as Error).message, events: [] }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Read active accounts from dedicated tables
  let googleAccountIds: string[] = [];
  let metaAccountIds: string[] = [];
  let ga4PropertyIds: string[] = [];

  if (targetClientId && userRole !== "client") {
    // Manager/admin viewing a specific client -- use that client's assigned accounts
    const { data: cGoogle } = await supabaseAdmin
      .from("client_ad_accounts")
      .select("customer_id")
      .eq("client_user_id", targetClientId);
    googleAccountIds = (cGoogle || []).map((a) => a.customer_id);

    const { data: cMeta } = await supabaseAdmin
      .from("client_meta_ad_accounts")
      .select("ad_account_id")
      .eq("client_user_id", targetClientId);
    metaAccountIds = (cMeta || []).map((a) => a.ad_account_id);

    const { data: cGA4 } = await supabaseAdmin
      .from("client_ga4_properties")
      .select("property_id")
      .eq("client_user_id", targetClientId);
    ga4PropertyIds = (cGA4 || []).map((a) => a.property_id);
  } else if (userRole === "client") {
    // Client: use only assigned accounts
    const { data: cGoogle } = await supabaseAdmin
      .from("client_ad_accounts")
      .select("customer_id")
      .eq("client_user_id", userId);
    googleAccountIds = (cGoogle || []).map((a) => a.customer_id);

    const { data: cMeta } = await supabaseAdmin
      .from("client_meta_ad_accounts")
      .select("ad_account_id")
      .eq("client_user_id", userId);
    metaAccountIds = (cMeta || []).map((a) => a.ad_account_id);

    const { data: cGA4 } = await supabaseAdmin
      .from("client_ga4_properties")
      .select("property_id")
      .eq("client_user_id", userId);
    ga4PropertyIds = (cGA4 || []).map((a) => a.property_id);
  } else {
    // Manager without client_id -- use all active accounts (fallback)
    const { data: googleAccounts } = await supabaseAdmin
      .from("manager_ad_accounts")
      .select("customer_id")
      .eq("manager_id", effectiveManagerId)
      .eq("is_active", true);
    googleAccountIds = (googleAccounts || []).map((a) => a.customer_id);

    const { data: metaAccounts } = await supabaseAdmin
      .from("manager_meta_ad_accounts")
      .select("ad_account_id")
      .eq("manager_id", effectiveManagerId)
      .eq("is_active", true);
    metaAccountIds = (metaAccounts || []).map((a) => a.ad_account_id);
  }
  const dateRange = body.date_range || "LAST_30_DAYS";
  const metaDatePreset = body.meta_date_preset || "last_30d";
  const metaTimeRange = body.meta_time_range as { since: string; until: string } | undefined;
  const googleDateRangeCustom = body.google_date_range as string | undefined;
  const ga4StartDate = body.ga4_start_date || "30daysAgo";
  const ga4EndDate = body.ga4_end_date || "today";
  const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";

  // Load FTD + registration event config for this client
  const configClientId = targetClientId || (userRole === "client" ? userId : null);
  let ftdEventName: string | null = null;
  let ftdGoogleConvName: string | null = null;
  let registrationEventName: string | null = null;
  if (configClientId) {
    const { data: analysisConfig } = await supabaseAdmin
      .from("client_analysis_config")
      .select("ftd_event_name, ftd_google_conversion_name, registration_event_name")
      .eq("client_id", configClientId)
      .maybeSingle();
    if (analysisConfig) {
      ftdEventName = analysisConfig.ftd_event_name || null;
      ftdGoogleConvName = analysisConfig.ftd_google_conversion_name || null;
      registrationEventName = (analysisConfig as any).registration_event_name || null;
    }
  }

  const result: Record<string, unknown> = {
    google_ads: null,
    meta_ads: null,
    ga4: null,
    consolidated: null,
    hourly_conversions: null,
    geo_conversions: null,
  };

  try {
    const promises: Promise<void>[] = [];

    // Google Ads
    const googleConn = connections?.find((c) => c.provider === "google_ads");
    if (googleConn?.refresh_token && googleAccountIds.length > 0) {
      promises.push(
        (async () => {
          const accessToken = await refreshGoogleToken(googleConn.refresh_token);
          await supabaseAdmin.from("oauth_connections").update({
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          }).eq("id", googleConn.id);

          result.google_ads = await fetchGoogleAdsData(accessToken, googleAccountIds, devToken, dateRange, googleDateRangeCustom, ftdGoogleConvName);
        })()
      );
    }

    // Meta Ads
    const metaConn = connections?.find((c) => c.provider === "meta_ads");
    
    if (metaConn?.access_token && metaAccountIds.length > 0) {
      promises.push(
        (async () => {
          result.meta_ads = await fetchMetaAdsData(metaConn.access_token, metaAccountIds, metaDatePreset, metaTimeRange, ftdEventName, registrationEventName);
        })()
      );
    }

    // GA4
    const ga4Conn = connections?.find((c) => c.provider === "ga4");
    if (ga4Conn?.refresh_token) {
      promises.push(
        (async () => {
          const accessToken = await refreshGoogleToken(ga4Conn.refresh_token);
          await supabaseAdmin.from("oauth_connections").update({
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          }).eq("id", ga4Conn.id);

          // For clients with assigned GA4 properties, use those; otherwise use manager's selected
          let propsToFetch = ga4PropertyIds;
          if (propsToFetch.length === 0 && userRole !== "client") {
            propsToFetch = ((ga4Conn.account_data as Array<{ id: string; selected: boolean }>)
              ?.filter((a) => a.selected)
              .map((a) => a.id)) || [];
          }

          if (propsToFetch.length > 0) {
            result.ga4 = await fetchGA4Data(accessToken, propsToFetch, ga4StartDate, ga4EndDate);
          }
        })()
      );
    }

    await Promise.all(promises);

    // Build meta_timezones map from per_account data
    const mAdsForTz = result.meta_ads as MetaAdsMetrics | null;
    const metaTimezones: Record<string, string> = {};
    if (mAdsForTz?.per_account) {
      for (const pa of mAdsForTz.per_account) {
        if (pa.timezone_name) metaTimezones[pa.account_id] = pa.timezone_name;
      }
    }
    result.meta_timezones = Object.keys(metaTimezones).length > 0 ? metaTimezones : null;

    const gAds = result.google_ads as GoogleAdsMetrics | null;
    const mAds = result.meta_ads as MetaAdsMetrics | null;
    const ga4 = result.ga4 as GA4Metrics | null;

    const totalInvestment = (gAds?.investment || 0) + (mAds?.investment || 0);
    const totalClicks = (gAds?.clicks || 0) + (mAds?.clicks || 0);
    const totalImpressions = (gAds?.impressions || 0) + (mAds?.impressions || 0);
    // consolidated.leads = registrations only (NOT registrations + purchases)
    const totalRegistrations = mAds?.registrations || 0;
    const totalMessages = mAds?.messages || 0;
    const totalRevenue = (gAds?.revenue || 0) + (mAds?.revenue || 0);

    // FTD totals from Meta per_account + Google
    const metaFtdTotal = mAds?.per_account?.reduce((s, a) => s + (a.ftd || 0), 0) || 0;
    const googleFtdTotal = gAds?.per_account?.reduce((s, a) => s + (a.ftd || 0), 0) || 0;
    const totalFtd = metaFtdTotal + googleFtdTotal;
    const costPerFtd = totalFtd > 0 ? totalInvestment / totalFtd : 0;

    console.log(`[fetch-ads-data] FTD config: eventName=${ftdEventName}, googleConv=${ftdGoogleConvName}`);
    console.log(`[fetch-ads-data] FTD totals: meta=${metaFtdTotal}, google=${googleFtdTotal}, total=${totalFtd}, costPerFtd=${costPerFtd.toFixed(2)}`);
    console.log(`[fetch-ads-data] Registrations: ${totalRegistrations}, Purchases: ${mAds?.purchases || 0}, Leads(raw): ${mAds?.leads || 0}`);

    result.consolidated = {
      investment: totalInvestment,
      revenue: totalRevenue,
      roas: totalInvestment > 0 ? totalRevenue / totalInvestment : 0,
      leads: totalRegistrations,
      messages: totalMessages,
      cpa: totalRegistrations > 0 ? totalInvestment / totalRegistrations : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalInvestment / totalClicks : 0,
      conversion_rate: ga4?.conversion_rate || 0,
      sessions: ga4?.sessions || 0,
      events: ga4?.events || 0,
      ftd: totalFtd,
      cost_per_ftd: costPerFtd,
      all_campaigns: [
        ...(gAds?.campaigns?.map((c) => ({ ...c, source: "Google Ads" })) || []),
        ...(mAds?.campaigns?.map((c) => ({ ...c, source: "Meta Ads" })) || []),
      ],
    };

    // Hourly conversions from Meta (purchases, registrations & messages by hour)
    const purchasesByHour: Record<string, number> = {};
    const registrationsByHour: Record<string, number> = {};
    const messagesByHour: Record<string, number> = {};

    const metaConn2 = connections?.find((c) => c.provider === "meta_ads");
    if (metaConn2?.access_token && metaAccountIds.length > 0) {
      for (const accountId of metaAccountIds) {
        try {
          const metaDateParam = metaTimeRange ? `time_range=${encodeURIComponent(JSON.stringify(metaTimeRange))}` : `date_preset=${metaDatePreset}`;
          const hourlyUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=actions&${metaDateParam}&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&use_account_attribution_setting=true&action_report_time=mixed&limit=100&access_token=${metaConn2.access_token}`;
          const hourlyRows = await fetchAllPages(hourlyUrl);
          const hourlyData = { data: hourlyRows };

          if (hourlyData.data) {
            for (const row of hourlyData.data) {
              const hourMatch = row.hourly_stats_aggregated_by_advertiser_time_zone?.match(/(\d+)/);
              if (!hourMatch) continue;
              const hour = hourMatch[1];

              const actions = row.actions || [];
              const purchaseAct = actions.find((a: { action_type: string }) =>
                a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
              );
              if (purchaseAct) {
                purchasesByHour[hour] = (purchasesByHour[hour] || 0) + parseInt(purchaseAct.value || "0");
              }

              // Registrations — use custom event if configured, otherwise canonical
              let regAct;
              if (registrationEventName) {
                regAct = actions.find((a: { action_type: string }) => a.action_type === registrationEventName);
              } else {
                regAct = actions.find((a: { action_type: string }) =>
                  a.action_type === "offsite_conversion.fb_pixel_complete_registration"
                ) || actions.find((a: { action_type: string }) =>
                  a.action_type === "complete_registration"
                );
              }
              if (regAct) {
                registrationsByHour[hour] = (registrationsByHour[hour] || 0) + parseInt(regAct.value || "0");
              }

              const msgAct = actions.find((a: { action_type: string }) =>
                a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
                a.action_type === "onsite_conversion.messaging_first_reply"
              );
              if (msgAct) {
                messagesByHour[hour] = (messagesByHour[hour] || 0) + parseInt(msgAct.value || "0");
              }
            }
          }
        } catch (e) {
          console.error(`Hourly Meta error for ${accountId}:`, e);
        }
      }
    }

    const hourlyConversionsData = {
      purchases_by_hour: purchasesByHour,
      registrations_by_hour: registrationsByHour,
      messages_by_hour: messagesByHour,
    };
    result.hourly_conversions = hourlyConversionsData;


    // ---------- GEO conversions from Meta ----------
    type GeoEntry = { purchases: number; registrations: number; messages: number; spend: number };
    const geoByCountry: Record<string, GeoEntry> = {};
    const geoByRegion: Record<string, GeoEntry> = {};
    const geoByCity: Record<string, GeoEntry> = {};

    const parseGeoActions = (row: Record<string, unknown>, bucket: Record<string, GeoEntry>, key: string) => {
      if (!bucket[key]) {
        bucket[key] = { purchases: 0, registrations: 0, messages: 0, spend: 0 };
      }
      bucket[key].spend += parseFloat((row.spend as string) || "0");
      const actions = (row.actions || []) as Array<{ action_type: string; value: string }>;
      const purchaseAct = actions.find((a) =>
        a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
      );
      if (purchaseAct) bucket[key].purchases += parseInt(purchaseAct.value || "0");
      // Registrations — use custom event if configured, otherwise canonical
      let regAct;
      if (registrationEventName) {
        regAct = actions.find((a) => a.action_type === registrationEventName);
      } else {
        regAct = actions.find((a) =>
          a.action_type === "offsite_conversion.fb_pixel_complete_registration"
        ) || actions.find((a) =>
          a.action_type === "complete_registration"
        );
      }
      if (regAct) bucket[key].registrations += parseInt(regAct.value || "0");
      const msgAct = actions.find((a) =>
        a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
        a.action_type === "onsite_conversion.messaging_first_reply"
      );
      if (msgAct) bucket[key].messages += parseInt(msgAct.value || "0");
    };

    if (metaConn2?.access_token && metaAccountIds.length > 0) {
      const breakdownLevels = [
        { breakdown: "country", bucket: geoByCountry, keyField: "country" },
        { breakdown: "region", bucket: geoByRegion, keyField: "region" },
        { breakdown: "city", bucket: geoByCity, keyField: "city" },
      ];
      for (const accountId of metaAccountIds) {
        for (const { breakdown, bucket, keyField } of breakdownLevels) {
          try {
            const geoDateParam = metaTimeRange ? `time_range=${encodeURIComponent(JSON.stringify(metaTimeRange))}` : `date_preset=${metaDatePreset}`;
            const geoUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,actions&${geoDateParam}&breakdowns=${breakdown}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${metaConn2.access_token}&limit=200`;
            const geoRows = await fetchAllPages(geoUrl);
            if (geoRows.length > 0) {
              for (const row of geoRows) {
                const key = (row as Record<string, string>)[keyField] || "unknown";
                parseGeoActions(row, bucket, key);
              }
            }
          } catch (e) {
            console.error(`GEO Meta ${breakdown} error for ${accountId}:`, e);
          }
        }
      }
    }

    result.geo_conversions = geoByCountry;
    result.geo_conversions_region = geoByRegion;
    result.geo_conversions_city = geoByCity;

    // ---------- PERSIST daily_metrics ----------
    // Persist TODAY's data when fetching today, and also persist YESTERDAY
    // when dateRange includes it (e.g. LAST_2_DAYS) via a separate Meta request.
    const shouldPersistToday = dateRange === "TODAY"; // Only persist today when range is exactly TODAY
    const shouldPersistYesterday = dateRange === "YESTERDAY" || dateRange === "LAST_2_DAYS" || dateRange === "LAST_7_DAYS" || dateRange === "LAST_14_DAYS" || dateRange === "LAST_30_DAYS";
    const persistClientId = userRole === "client" ? userId : (body.client_id || userId);
    const today = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split("T")[0];

    const metricsToUpsert: Array<Record<string, unknown>> = [];

    if (shouldPersistToday) {
      if (gAds && gAds.per_account.length > 0) {
        for (const acct of gAds.per_account) {
          metricsToUpsert.push({
            client_id: persistClientId,
            account_id: acct.account_id,
            platform: "google",
            date: today,
            spend: acct.investment,
            impressions: acct.impressions,
            clicks: acct.clicks,
            conversions: acct.conversions,
            revenue: acct.revenue,
            ftd: acct.ftd || 0,
            cost_per_ftd: acct.ftd > 0 ? acct.investment / acct.ftd : 0,
            ctr: acct.impressions > 0 ? (acct.clicks / acct.impressions) * 100 : 0,
            cpc: acct.clicks > 0 ? acct.investment / acct.clicks : 0,
            cpm: acct.impressions > 0 ? (acct.investment / acct.impressions) * 1000 : 0,
            cpa: acct.conversions > 0 ? acct.investment / acct.conversions : 0,
            roas: acct.investment > 0 ? acct.revenue / acct.investment : 0,
          });
        }
      }

      if (mAds && mAds.per_account.length > 0) {
        for (const acct of mAds.per_account) {
          metricsToUpsert.push({
            client_id: persistClientId,
            account_id: acct.account_id,
            platform: "meta",
            date: today,
            spend: acct.investment,
            impressions: acct.impressions,
            clicks: acct.clicks,
            conversions: acct.purchases + acct.registrations,
            revenue: acct.revenue,
            purchases: acct.purchases,
            registrations: acct.registrations,
            messages: acct.messages,
            leads: acct.leads,
            ftd: acct.ftd,
            cost_per_ftd: acct.ftd > 0 ? acct.investment / acct.ftd : 0,
            ctr: acct.impressions > 0 ? (acct.clicks / acct.impressions) * 100 : 0,
            cpc: acct.clicks > 0 ? acct.investment / acct.clicks : 0,
            cpm: acct.impressions > 0 ? (acct.investment / acct.impressions) * 1000 : 0,
            cpa: acct.registrations > 0 ? acct.investment / acct.registrations : 0,
            roas: acct.investment > 0 ? acct.revenue / acct.investment : 0,
          });
        }
      }

      if (metricsToUpsert.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("daily_metrics")
          .upsert(metricsToUpsert, { onConflict: "account_id,platform,date" });
        if (upsertError) {
          console.error("Failed to persist daily_metrics:", upsertError);
        } else {
          console.log(`Persisted ${metricsToUpsert.length} daily_metrics rows for today`);
        }
      }
    } else {
      console.log(`[fetch-ads-data] Skipping today persistence — dateRange="${dateRange}"`);
    }

    // ---------- PERSIST hourly_data in daily_metrics ----------
    const hasHourlyData = Object.keys(purchasesByHour).length > 0 || Object.keys(registrationsByHour).length > 0 || Object.keys(messagesByHour).length > 0;
    if (hasHourlyData && (shouldPersistToday || dateRange === "YESTERDAY")) {
      const hourlyDate = dateRange === "YESTERDAY" ? yesterday : today;
      try {
        const { error: hourlyErr } = await supabaseAdmin
          .from("daily_metrics")
          .update({ hourly_data: hourlyConversionsData })
          .eq("client_id", persistClientId)
          .eq("date", hourlyDate);
        if (hourlyErr) {
          console.error("Failed to persist hourly_data:", hourlyErr);
        } else {
          console.log(`Persisted hourly_data for ${hourlyDate}`);
        }
      } catch (e) {
        console.error("Error persisting hourly_data:", e);
      }
    }

    // ---------- PERSIST geo_data in daily_metrics ----------
    const hasGeoData = Object.keys(geoByCountry).length > 0 || Object.keys(geoByRegion).length > 0 || Object.keys(geoByCity).length > 0;
    if (hasGeoData && (shouldPersistToday || dateRange === "YESTERDAY")) {
      const geoDate = dateRange === "YESTERDAY" ? yesterday : today;
      const geoPayload = { country: geoByCountry, region: geoByRegion, city: geoByCity };
      try {
        const { error: geoErr } = await supabaseAdmin
          .from("daily_metrics")
          .update({ geo_data: geoPayload })
          .eq("client_id", persistClientId)
          .eq("date", geoDate);
        if (geoErr) {
          console.error("Failed to persist geo_data:", geoErr);
        } else {
          console.log(`Persisted geo_data for ${geoDate}`);
        }
      } catch (e) {
        console.error("Error persisting geo_data:", e);
      }
    }

    if (shouldPersistYesterday && metaAccountIds.length > 0) {
      const metaConnYesterday = connections?.find((c) => c.provider === "meta_ads");
      if (metaConnYesterday?.access_token) {
        try {
          console.log(`[fetch-ads-data] Fetching yesterday's data (${yesterday}) for separate persistence...`);
          const yesterdayMeta = await fetchMetaAdsData(
            metaConnYesterday.access_token,
            metaAccountIds,
            "yesterday",
            { since: yesterday, until: yesterday },
            ftdEventName,
            registrationEventName
          );

          // Persist yesterday's metrics per account
          if (yesterdayMeta.per_account.length > 0) {
            const yesterdayMetrics = yesterdayMeta.per_account.map((acct) => ({
              client_id: persistClientId,
              account_id: acct.account_id,
              platform: "meta",
              date: yesterday,
              spend: acct.investment,
              impressions: acct.impressions,
              clicks: acct.clicks,
              conversions: acct.purchases + acct.registrations,
              revenue: acct.revenue,
              purchases: acct.purchases,
              registrations: acct.registrations,
              messages: acct.messages,
              leads: acct.leads,
              ftd: acct.ftd,
              cost_per_ftd: acct.ftd > 0 ? acct.investment / acct.ftd : 0,
              ctr: acct.impressions > 0 ? (acct.clicks / acct.impressions) * 100 : 0,
              cpc: acct.clicks > 0 ? acct.investment / acct.clicks : 0,
              cpm: acct.impressions > 0 ? (acct.investment / acct.impressions) * 1000 : 0,
              cpa: acct.registrations > 0 ? acct.investment / acct.registrations : 0,
              roas: acct.investment > 0 ? acct.revenue / acct.investment : 0,
            }));

            const { error: yesterdayMetricErr } = await supabaseAdmin
              .from("daily_metrics")
              .upsert(yesterdayMetrics, { onConflict: "account_id,platform,date" });

            if (yesterdayMetricErr) {
              console.error("Failed to persist yesterday daily_metrics:", yesterdayMetricErr);
            } else {
              console.log(`Persisted ${yesterdayMetrics.length} yesterday daily_metrics for ${yesterday}`);
            }
          }

          // Persist yesterday's campaigns (clean slate)
          if (yesterdayMeta.campaigns.length > 0) {
            const yesterdayCampaigns = yesterdayMeta.campaigns.map((c) => ({
              client_id: persistClientId,
              account_id: c.account_id || metaAccountIds[0] || "unknown",
              platform: "meta",
              date: yesterday,
              external_campaign_id: c.id,
              campaign_name: c.name,
              campaign_status: c.status || "Ativa",
              spend: c.spend,
              clicks: c.clicks || 0,
              conversions: c.purchases,
              leads: c.leads,
              purchases: c.purchases,
              registrations: c.registrations,
              messages: c.messages,
              followers: c.followers,
              profile_visits: c.profile_visits,
              revenue: c.revenue,
              cpa: c.cpa,
              adset_count: c.adset_count || 0,
              ad_count: c.ad_count || 0,
              ftd: c.ftd,
              source: "Meta Ads",
            }));

            // Clean slate for yesterday
            await supabaseAdmin
              .from("daily_campaigns")
              .delete()
              .eq("client_id", persistClientId)
              .eq("date", yesterday);

            const { error: yesterdayCampErr } = await supabaseAdmin
              .from("daily_campaigns")
              .upsert(yesterdayCampaigns, { onConflict: "client_id,account_id,platform,date,campaign_name" });

            if (yesterdayCampErr) {
              console.error("Failed to persist yesterday daily_campaigns:", yesterdayCampErr);
            } else {
              console.log(`Persisted ${yesterdayCampaigns.length} yesterday daily_campaigns for ${yesterday}`);
            }
          }
        } catch (e) {
          console.error("Failed to fetch/persist yesterday's data:", e);
        }
      }
    }

    // ---------- PERSIST daily_campaigns ----------
    if (shouldPersistToday) {
      const campaignsToUpsert: Array<Record<string, unknown>> = [];

      if (gAds?.campaigns) {
        for (const c of gAds.campaigns) {
          campaignsToUpsert.push({
            client_id: persistClientId,
            account_id: c.account_id || googleAccountIds[0] || "unknown",
            platform: "google",
            date: today,
            campaign_name: c.name,
            campaign_status: c.status || "Ativa",
            spend: c.spend,
            clicks: c.clicks,
            conversions: c.conversions,
            leads: 0,
            messages: 0,
            revenue: c.revenue,
            cpa: c.cpa,
            ftd: 0, // FTD for Google tracked at account level
            source: "Google Ads",
          });
        }
      }

      if (mAds?.campaigns) {
        for (const c of mAds.campaigns) {
          campaignsToUpsert.push({
            client_id: persistClientId,
            account_id: c.account_id || metaAccountIds[0] || "unknown",
            platform: "meta",
            date: today,
            external_campaign_id: c.id,
            campaign_name: c.name,
            campaign_status: c.status || "Ativa",
            spend: c.spend,
            clicks: c.clicks || 0,
            conversions: c.purchases,
            leads: c.leads,
            purchases: c.purchases,
            registrations: c.registrations,
            messages: c.messages,
            followers: c.followers,
            profile_visits: c.profile_visits,
            revenue: c.revenue,
            cpa: c.cpa,
            adset_count: c.adset_count || 0,
            ad_count: c.ad_count || 0,
            ftd: c.ftd,
            source: "Meta Ads",
          });
        }
      }

      if (campaignsToUpsert.length > 0) {
        // Clean slate: delete ALL campaigns for this client+date, then insert fresh data.
        // This ensures renamed/removed campaigns in Meta/Google are properly cleaned up.
        const datesToClean = [...new Set(campaignsToUpsert.map((c) => c.date as string))];
        const clientToClean = campaignsToUpsert[0].client_id as string;

        for (const dateToClean of datesToClean) {
          const { error: delErr } = await supabaseAdmin
            .from("daily_campaigns")
            .delete()
            .eq("client_id", clientToClean)
            .eq("date", dateToClean);
          if (delErr) {
            console.error(`Failed to clean daily_campaigns for ${dateToClean}:`, delErr);
          }
        }

        const { error: campError } = await supabaseAdmin
          .from("daily_campaigns")
          .upsert(campaignsToUpsert, { onConflict: "client_id,account_id,platform,date,campaign_name" });

        if (campError) {
          console.error("Failed to persist daily_campaigns:", campError);
        } else {
          console.log(`Persisted ${campaignsToUpsert.length} daily_campaigns rows`);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("fetch-ads-data error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
