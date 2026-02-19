import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  campaigns: Array<{ name: string; status: string; spend: number; clicks: number; conversions: number; revenue: number; cpa: number }>;
}

async function fetchGoogleAdsData(
  accessToken: string,
  customerIds: string[],
  devToken: string,
  dateRange: string,
  googleDateRangeCustom?: string
): Promise<GoogleAdsMetrics> {
  const result: GoogleAdsMetrics = {
    investment: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0,
    cost_per_conversion: 0, ctr: 0, avg_cpc: 0, campaigns: [],
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
        for (const row of data[0].results) {
          const m = row.metrics;
          result.investment += (m.costMicros || 0) / 1_000_000;
          result.clicks += m.clicks || 0;
          result.impressions += m.impressions || 0;
          result.conversions += m.conversions || 0;
          result.revenue += m.conversionsValue || 0;
        }
      }

      const campaignQuery = `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion FROM campaign ${dateClause} AND campaign.status = 'ENABLED' ORDER BY metrics.cost_micros DESC LIMIT 20`;

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
  campaigns: Array<{ name: string; status: string; spend: number; leads: number; purchases: number; registrations: number; messages: number; revenue: number; cpa: number }>;
}

async function fetchMetaAdsData(
  accessToken: string,
  adAccountIds: string[],
  datePreset: string,
  timeRange?: { since: string; until: string }
): Promise<MetaAdsMetrics> {
  const result: MetaAdsMetrics = {
    investment: 0, revenue: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, registrations: 0, messages: 0,
    ctr: 0, cpc: 0, cpa: 0, campaigns: [],
  };

  // Build date parameter: use time_range if provided, otherwise date_preset
  const dateParam = timeRange
    ? `time_range=${encodeURIComponent(JSON.stringify(timeRange))}`
    : `date_preset=${datePreset}`;

  for (const accountId of adAccountIds) {
    try {
      const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,clicks,actions,action_values,cost_per_action_type,ctr,cpc&${dateParam}&access_token=${accessToken}`;
      const res = await fetch(insightsUrl);
      const data = await res.json();

      if (data.data?.[0]) {
        const d = data.data[0];
        result.investment += parseFloat(d.spend || "0");
        result.impressions += parseInt(d.impressions || "0");
        result.clicks += parseInt(d.clicks || "0");

        // Purchases (compras)
        const purchaseAction = d.actions?.find((a: { action_type: string }) => 
          a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
        );
        if (purchaseAction) result.purchases += parseInt(purchaseAction.value || "0");

        // Registrations / leads (cadastros) — soma todos os tipos relevantes
        const registrationActions = d.actions?.filter((a: { action_type: string }) =>
          a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
          a.action_type === "complete_registration" ||
          a.action_type === "lead" ||
          a.action_type === "offsite_conversion.fb_pixel_lead"
        ) || [];
        const regTotal = registrationActions.reduce((sum: number, a: { value?: string }) => sum + parseInt(a.value || "0"), 0);
        if (regTotal > 0) result.registrations += regTotal;

        // Total leads = purchases + registrations (for CPA calculation)
        result.leads = result.purchases + result.registrations;

        const msgAction = d.actions?.find((a: { action_type: string }) => 
          a.action_type === "onsite_conversion.messaging_conversation_started_7d" || 
          a.action_type === "onsite_conversion.messaging_first_reply"
        );
        if (msgAction) result.messages += parseInt(msgAction.value || "0");

        // Revenue from purchase action_values
        const purchaseValue = d.action_values?.find((a: { action_type: string }) => 
          a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
        );
        if (purchaseValue) result.revenue += parseFloat(purchaseValue.value || "0");
      }

      // Fetch only ACTIVE campaigns to reduce API calls
      const campUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,effective_status,objective&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=30&access_token=${accessToken}`;
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
                const insUrl = `https://graph.facebook.com/v19.0/${camp.id}/insights?fields=spend,actions,action_values&${dateParam}&access_token=${accessToken}`;
                const r = await fetch(insUrl);
                const d = await r.json();
                return { camp, insRow: d.data?.[0] || null };
              } catch { return { camp, insRow: null }; }
            })
          );

          for (const { camp, insRow } of batchResults) {
            if (!insRow) continue;
            const spend = parseFloat(insRow.spend || "0");
            if (spend === 0) continue;

            const actions = insRow.actions || [];
            const actionValues = insRow.action_values || [];

            // Purchases (compras)
            const purchaseAct = actions.find((a: any) => 
              a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
            );
            const purchases = parseInt(purchaseAct?.value || "0");

            // Registrations (cadastros) — soma todos os tipos relevantes
            const regActs = actions.filter((a: any) =>
              a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
              a.action_type === "complete_registration" ||
              a.action_type === "lead" ||
              a.action_type === "offsite_conversion.fb_pixel_lead"
            );
            const registrations = regActs.reduce((sum: number, a: any) => sum + parseInt(a.value || "0"), 0);

            const msgAct = actions.find((a: any) =>
              a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
              a.action_type === "onsite_conversion.messaging_first_reply"
            );
            const messages = parseInt(msgAct?.value || "0");

            const purchaseVal = actionValues.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
            const revenue = parseFloat(purchaseVal?.value || "0");

            const isMessageCampaign = camp.objective === "MESSAGES" || messages > 0;
            const leads = purchases + registrations;
            const primaryResult = isMessageCampaign ? messages : (purchases > 0 ? purchases : registrations);

            result.campaigns.push({
              name: camp.name,
              status: "Ativa",
              spend,
              leads,
              purchases,
              registrations,
              messages,
              revenue,
              cpa: primaryResult > 0 ? spend / primaryResult : 0,
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
  if (result.leads > 0) result.cpa = result.investment / result.leads;

  return result;
}

// ---------- GA4 helpers ----------

interface GA4Metrics {
  sessions: number;
  events: number;
  conversion_rate: number;
}

async function fetchGA4Data(
  accessToken: string,
  propertyIds: string[],
  startDate: string,
  endDate: string
): Promise<GA4Metrics> {
  const result: GA4Metrics = { sessions: 0, events: 0, conversion_rate: 0 };

  for (const propertyId of propertyIds) {
    try {
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
      console.error(`GA4 error for ${propertyId}:`, e);
    }
  }

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
  const targetClientId = body.client_id;

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

          result.google_ads = await fetchGoogleAdsData(accessToken, googleAccountIds, devToken, dateRange, googleDateRangeCustom);
        })()
      );
    }

    // Meta Ads
    const metaConn = connections?.find((c) => c.provider === "meta_ads");
    if (metaConn?.access_token && metaAccountIds.length > 0) {
      promises.push(
        (async () => {
          result.meta_ads = await fetchMetaAdsData(metaConn.access_token, metaAccountIds, metaDatePreset, metaTimeRange);
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

    // Consolidate metrics
    const gAds = result.google_ads as GoogleAdsMetrics | null;
    const mAds = result.meta_ads as MetaAdsMetrics | null;
    const ga4 = result.ga4 as GA4Metrics | null;

    const totalInvestment = (gAds?.investment || 0) + (mAds?.investment || 0);
    const totalClicks = (gAds?.clicks || 0) + (mAds?.clicks || 0);
    const totalImpressions = (gAds?.impressions || 0) + (mAds?.impressions || 0);
    const totalLeads = (gAds?.conversions || 0) + (mAds?.leads || 0);
    const totalMessages = mAds?.messages || 0;
    const totalRevenue = (gAds?.revenue || 0) + (mAds?.revenue || 0);

    result.consolidated = {
      investment: totalInvestment,
      revenue: totalRevenue,
      roas: totalInvestment > 0 ? totalRevenue / totalInvestment : 0,
      leads: totalLeads,
      messages: totalMessages,
      cpa: totalLeads > 0 ? totalInvestment / totalLeads : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalInvestment / totalClicks : 0,
      conversion_rate: ga4?.conversion_rate || 0,
      sessions: ga4?.sessions || 0,
      events: ga4?.events || 0,
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
          const hourlyUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=actions&${metaDateParam}&time_increment=1&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&access_token=${metaConn2.access_token}`;
          const hourlyRes = await fetch(hourlyUrl);
          const hourlyData = await hourlyRes.json();

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

              const regActs = actions.filter((a: { action_type: string }) =>
                a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
                a.action_type === "complete_registration" ||
                a.action_type === "lead" ||
                a.action_type === "offsite_conversion.fb_pixel_lead"
              );
              const regHourTotal = regActs.reduce((sum: number, a: { value?: string }) => sum + parseInt(a.value || "0"), 0);
              if (regHourTotal > 0) {
                registrationsByHour[hour] = (registrationsByHour[hour] || 0) + regHourTotal;
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

    result.hourly_conversions = {
      purchases_by_hour: purchasesByHour,
      registrations_by_hour: registrationsByHour,
      messages_by_hour: messagesByHour,
    };

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
      const regActs = actions.filter((a) =>
        a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
        a.action_type === "complete_registration" ||
        a.action_type === "lead" ||
        a.action_type === "offsite_conversion.fb_pixel_lead"
      );
      const regGeoTotal = regActs.reduce((sum, a) => sum + parseInt(a.value || "0"), 0);
      if (regGeoTotal > 0) bucket[key].registrations += regGeoTotal;
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
            const geoUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,actions&${geoDateParam}&breakdowns=${breakdown}&access_token=${metaConn2.access_token}&limit=50`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();
            if (geoData.data) {
              for (const row of geoData.data) {
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
    // CRITICAL FIX: Only persist when fetching TODAY's data.
    // For historical periods (LAST_7_DAYS, LAST_30_DAYS etc.), the data is already
    // correctly stored day-by-day via backfill-metrics and sync-daily-metrics.
    // Persisting an accumulated period total as "today" inflates the dashboard totals.
    const shouldPersist = dateRange === "TODAY" || metaDatePreset === "today";
    const persistClientId = userRole === "client" ? userId : (body.client_id || userId);
    const today = new Date().toISOString().split("T")[0];

    const metricsToUpsert: Array<Record<string, unknown>> = [];

    if (shouldPersist) {
      // Google Ads metrics — save aggregate totals (single row), not divided per account
      // This ensures accurate totals instead of splitting incorrectly across accounts
      if (gAds && googleAccountIds.length > 0) {
        // Save one aggregate row with the first account_id as identifier
        metricsToUpsert.push({
          client_id: persistClientId,
          account_id: googleAccountIds[0],
          platform: "google",
          date: today,
          spend: gAds.investment,
          impressions: gAds.impressions,
          clicks: gAds.clicks,
          conversions: gAds.conversions,
          revenue: gAds.revenue,
          ctr: gAds.ctr,
          cpc: gAds.avg_cpc,
          cpm: gAds.impressions > 0 ? (gAds.investment / gAds.impressions) * 1000 : 0,
          cpa: gAds.cost_per_conversion,
          roas: gAds.investment > 0 ? gAds.revenue / gAds.investment : 0,
        });
      }

      // Meta Ads metrics — save aggregate totals (single row), not divided per account
      if (mAds && metaAccountIds.length > 0) {
        // Save one aggregate row with the first account_id as identifier
        metricsToUpsert.push({
          client_id: persistClientId,
          account_id: metaAccountIds[0],
          platform: "meta",
          date: today,
          spend: mAds.investment,
          impressions: mAds.impressions,
          clicks: mAds.clicks,
          // conversions field stores total leads (purchases + registrations) for Meta
          conversions: mAds.purchases + mAds.registrations,
          revenue: mAds.revenue,
          ctr: mAds.ctr,
          cpc: mAds.cpc,
          cpm: mAds.impressions > 0 ? (mAds.investment / mAds.impressions) * 1000 : 0,
          cpa: mAds.cpa,
          roas: mAds.investment > 0 ? mAds.revenue / mAds.investment : 0,
        });
      }

      if (metricsToUpsert.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("daily_metrics")
          .upsert(metricsToUpsert, { onConflict: "account_id,platform,date" });

        if (upsertError) {
          console.error("Failed to persist daily_metrics:", upsertError);
        } else {
          console.log(`Persisted ${metricsToUpsert.length} daily_metrics rows`);
        }
      }
    } else {
      console.log(`[fetch-ads-data] Skipping persistence — dateRange="${dateRange}", metaDatePreset="${metaDatePreset}". Only TODAY is persisted to avoid inflating historical totals.`);
    }

    // ---------- PERSIST daily_campaigns ----------
    if (shouldPersist) {
      const campaignsToUpsert: Array<Record<string, unknown>> = [];

      if (gAds?.campaigns) {
        for (const c of gAds.campaigns) {
          campaignsToUpsert.push({
            client_id: persistClientId,
            account_id: googleAccountIds[0] || "unknown",
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
            source: "Google Ads",
          });
        }
      }

      if (mAds?.campaigns) {
        for (const c of mAds.campaigns) {
          campaignsToUpsert.push({
            client_id: persistClientId,
            account_id: metaAccountIds[0] || "unknown",
            platform: "meta",
            date: today,
            campaign_name: c.name,
            campaign_status: c.status || "Ativa",
            spend: c.spend,
            clicks: 0,
            conversions: c.purchases, // purchases stored in conversions for Google compat
            leads: c.registrations,   // registrations (cadastros) stored in leads
            purchases: c.purchases,
            registrations: c.registrations,
            messages: c.messages,
            revenue: c.revenue,
            cpa: c.cpa,
            source: "Meta Ads",
          });
        }
      }

      if (campaignsToUpsert.length > 0) {
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
