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
  clicks: number;
  impressions: number;
  conversions: number;
  cost_per_conversion: number;
  ctr: number;
  avg_cpc: number;
  campaigns: Array<{ name: string; status: string; spend: number; clicks: number; conversions: number; cpa: number }>;
}

async function fetchGoogleAdsData(
  accessToken: string,
  customerIds: string[],
  devToken: string,
  dateRange: string
): Promise<GoogleAdsMetrics> {
  const result: GoogleAdsMetrics = {
    investment: 0, clicks: 0, impressions: 0, conversions: 0,
    cost_per_conversion: 0, ctr: 0, avg_cpc: 0, campaigns: [],
  };

  for (const customerId of customerIds) {
    const cleanId = customerId.replace(/-/g, "");

    // Account-level metrics
    const query = `SELECT metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.cost_per_conversion, metrics.ctr, metrics.average_cpc FROM customer WHERE segments.date DURING ${dateRange}`;

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
        }
      }

      // Campaign-level data
      const campaignQuery = `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.cost_per_conversion FROM campaign WHERE segments.date DURING ${dateRange} AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 10`;

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
          result.campaigns.push({
            name: row.campaign.name,
            status: row.campaign.status === "ENABLED" ? "Ativa" : "Pausada",
            spend,
            clicks: row.metrics.clicks || 0,
            conversions: row.metrics.conversions || 0,
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
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpa: number;
  campaigns: Array<{ name: string; status: string; spend: number; leads: number; cpa: number }>;
}

async function fetchMetaAdsData(
  accessToken: string,
  adAccountIds: string[],
  datePreset: string
): Promise<MetaAdsMetrics> {
  const result: MetaAdsMetrics = {
    investment: 0, impressions: 0, clicks: 0, leads: 0,
    ctr: 0, cpc: 0, cpa: 0, campaigns: [],
  };

  for (const accountId of adAccountIds) {
    try {
      // Account insights
      const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,clicks,actions,cost_per_action_type,ctr,cpc&date_preset=${datePreset}&access_token=${accessToken}`;
      const res = await fetch(insightsUrl);
      const data = await res.json();

      if (data.data?.[0]) {
        const d = data.data[0];
        result.investment += parseFloat(d.spend || "0");
        result.impressions += parseInt(d.impressions || "0");
        result.clicks += parseInt(d.clicks || "0");

        // Extract leads from actions
        const leadAction = d.actions?.find((a: { action_type: string }) => a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead");
        if (leadAction) result.leads += parseInt(leadAction.value || "0");
      }

      // Campaign insights
      const campUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,insights.fields(spend,actions){date_preset:${datePreset}}&limit=10&access_token=${accessToken}`;
      const campRes = await fetch(campUrl);
      const campData = await campRes.json();

      if (campData.data) {
        for (const camp of campData.data) {
          const spend = parseFloat(camp.insights?.data?.[0]?.spend || "0");
          const leadAct = camp.insights?.data?.[0]?.actions?.find(
            (a: { action_type: string }) => a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead"
          );
          const leads = parseInt(leadAct?.value || "0");

          result.campaigns.push({
            name: camp.name,
            status: camp.status === "ACTIVE" ? "Ativa" : "Pausada",
            spend,
            leads,
            cpa: leads > 0 ? spend / leads : 0,
          });
        }
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

  // Validate user
  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
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

  // Use service role to read tokens (not accessible via RLS SELECT for security reasons)
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: connections, error: connError } = await supabaseAdmin
    .from("oauth_connections")
    .select("*")
    .eq("manager_id", userId)
    .eq("connected", true);

  if (connError) {
    return new Response(JSON.stringify({ error: connError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const dateRange = body.date_range || "LAST_30_DAYS";
  const metaDatePreset = body.meta_date_preset || "last_30d";
  const ga4StartDate = body.ga4_start_date || "30daysAgo";
  const ga4EndDate = body.ga4_end_date || "today";
  const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";

  const result: Record<string, unknown> = {
    google_ads: null,
    meta_ads: null,
    ga4: null,
    consolidated: null,
  };

  try {
    // Fetch in parallel
    const promises: Promise<void>[] = [];

    // Google Ads
    const googleConn = connections?.find((c) => c.provider === "google_ads");
    if (googleConn?.refresh_token) {
      promises.push(
        (async () => {
          const accessToken = await refreshGoogleToken(googleConn.refresh_token);
          // Update token in DB
          await supabaseAdmin.from("oauth_connections").update({
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          }).eq("id", googleConn.id);

          const selectedAccounts = (googleConn.account_data as Array<{ id: string; selected: boolean }>)
            ?.filter((a) => a.selected)
            .map((a) => a.id) || [];

          if (selectedAccounts.length > 0) {
            result.google_ads = await fetchGoogleAdsData(accessToken, selectedAccounts, devToken, dateRange);
          }
        })()
      );
    }

    // Meta Ads
    const metaConn = connections?.find((c) => c.provider === "meta_ads");
    if (metaConn?.access_token) {
      promises.push(
        (async () => {
          const selectedAccounts = (metaConn.account_data as Array<{ id: string; selected: boolean }>)
            ?.filter((a) => a.selected)
            .map((a) => a.id) || [];

          if (selectedAccounts.length > 0) {
            result.meta_ads = await fetchMetaAdsData(metaConn.access_token, selectedAccounts, metaDatePreset);
          }
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

          const selectedProps = (ga4Conn.account_data as Array<{ id: string; selected: boolean }>)
            ?.filter((a) => a.selected)
            .map((a) => a.id) || [];

          if (selectedProps.length > 0) {
            result.ga4 = await fetchGA4Data(accessToken, selectedProps, ga4StartDate, ga4EndDate);
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

    result.consolidated = {
      investment: totalInvestment,
      revenue: 0, // Revenue requires manual input or e-commerce integration
      roas: 0,
      leads: totalLeads,
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
