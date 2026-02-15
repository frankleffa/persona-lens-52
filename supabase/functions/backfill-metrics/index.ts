import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";

  let clientId: string;
  let days = 30;

  try {
    const body = await req.json();
    clientId = body.client_id;
    if (body.days) days = Math.min(body.days, 90);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!clientId) {
    return new Response(JSON.stringify({ error: "client_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[backfill-metrics] Starting backfill for client ${clientId}, ${days} days`);

  // Find the manager for this client
  const { data: link } = await supabaseAdmin
    .from("client_manager_links")
    .select("manager_id")
    .eq("client_user_id", clientId)
    .limit(1)
    .single();

  if (!link) {
    return new Response(JSON.stringify({ error: "Client not found or no manager linked" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const managerId = link.manager_id;

  // Get manager's connections
  const { data: connections } = await supabaseAdmin
    .from("oauth_connections")
    .select("*")
    .eq("manager_id", managerId)
    .eq("connected", true);

  if (!connections || connections.length === 0) {
    return new Response(JSON.stringify({ error: "No active connections for manager" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get client's ad accounts
  const { data: clientGoogleAccounts } = await supabaseAdmin
    .from("client_ad_accounts")
    .select("customer_id")
    .eq("client_user_id", clientId);

  const { data: clientMetaAccounts } = await supabaseAdmin
    .from("client_meta_ad_accounts")
    .select("ad_account_id")
    .eq("client_user_id", clientId);

  const googleIds = (clientGoogleAccounts || []).map((a) => a.customer_id);
  const metaIds = (clientMetaAccounts || []).map((a) => a.ad_account_id);

  const googleConn = connections.find((c) => c.provider === "google_ads");
  const metaConn = connections.find((c) => c.provider === "meta_ads");

  let totalMetrics = 0;
  let totalCampaigns = 0;
  const errors: string[] = [];

  // Refresh Google token once if needed
  let googleAccessToken: string | null = null;
  if (googleConn?.refresh_token && googleIds.length > 0) {
    try {
      googleAccessToken = await refreshGoogleToken(googleConn.refresh_token);
    } catch (e) {
      errors.push(`Google token refresh failed: ${e}`);
    }
  }

  // Iterate day by day
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const metricsToUpsert: Array<Record<string, unknown>> = [];
    const campaignsToUpsert: Array<Record<string, unknown>> = [];

    // --- Google Ads ---
    if (googleAccessToken && googleIds.length > 0) {
      for (const customerId of googleIds) {
        try {
          const cleanId = customerId.replace(/-/g, "");

          // Account-level metrics
          const query = `SELECT metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion, metrics.ctr, metrics.average_cpc FROM customer WHERE segments.date = '${dateStr}'`;
          const res = await fetch(
            `https://googleads.googleapis.com/v16/customers/${cleanId}/googleAds:searchStream`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${googleAccessToken}`,
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
              const spend = (m.costMicros || 0) / 1_000_000;
              const clicks = m.clicks || 0;
              const impressions = m.impressions || 0;
              const conversions = m.conversions || 0;
              const revenue = m.conversionsValue || 0;

              metricsToUpsert.push({
                client_id: clientId,
                account_id: customerId,
                platform: "google",
                date: dateStr,
                spend, impressions, clicks, conversions, revenue,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cpc: clicks > 0 ? spend / clicks : 0,
                cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                cpa: conversions > 0 ? spend / conversions : 0,
                roas: spend > 0 ? revenue / spend : 0,
              });
            }
          }

          // Campaigns
          const campaignQuery = `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date = '${dateStr}' AND campaign.status = 'ENABLED' ORDER BY metrics.cost_micros DESC LIMIT 20`;
          const campRes = await fetch(
            `https://googleads.googleapis.com/v16/customers/${cleanId}/googleAds:searchStream`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${googleAccessToken}`,
                "developer-token": devToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query: campaignQuery }),
            }
          );
          const campData = await campRes.json();

          if (Array.isArray(campData) && campData[0]?.results) {
            for (const row of campData[0].results) {
              const cSpend = (row.metrics.costMicros || 0) / 1_000_000;
              const cConv = row.metrics.conversions || 0;
              campaignsToUpsert.push({
                client_id: clientId,
                account_id: customerId,
                platform: "google",
                date: dateStr,
                campaign_name: row.campaign.name,
                campaign_status: "Ativa",
                spend: cSpend,
                clicks: row.metrics.clicks || 0,
                conversions: cConv,
                leads: 0, messages: 0,
                revenue: row.metrics.conversionsValue || 0,
                cpa: cConv > 0 ? cSpend / cConv : 0,
                source: "Google Ads",
              });
            }
          }
        } catch (e) {
          errors.push(`Google ${customerId} date ${dateStr}: ${e}`);
        }
      }
    }

    // --- Meta Ads ---
    if (metaConn?.access_token && metaIds.length > 0) {
      for (const accountId of metaIds) {
        try {
          const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,clicks,actions,action_values,cost_per_action_type,ctr,cpc&time_range={"since":"${dateStr}","until":"${dateStr}"}&access_token=${metaConn.access_token}`;
          const res = await fetch(insightsUrl);
          const data = await res.json();

          if (data.data?.[0]) {
            const d = data.data[0];
            const spend = parseFloat(d.spend || "0");
            const impressions = parseInt(d.impressions || "0");
            const clicks = parseInt(d.clicks || "0");

            const leadAction = d.actions?.find((a: { action_type: string }) =>
              a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead"
            );
            const conversions = parseInt(leadAction?.value || "0");

            const purchaseValue = d.action_values?.find((a: { action_type: string }) =>
              a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
            );
            const revenue = parseFloat(purchaseValue?.value || "0");

            metricsToUpsert.push({
              client_id: clientId,
              account_id: accountId,
              platform: "meta",
              date: dateStr,
              spend, impressions, clicks, conversions, revenue,
              ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
              cpc: clicks > 0 ? spend / clicks : 0,
              cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
              cpa: conversions > 0 ? spend / conversions : 0,
              roas: spend > 0 ? revenue / spend : 0,
            });
          }

          // Campaigns
          const campUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,objective,insights.fields(spend,actions,action_values){time_range:{"since":"${dateStr}","until":"${dateStr}"}}&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=20&access_token=${metaConn.access_token}`;
          const campRes = await fetch(campUrl);
          const campData = await campRes.json();

          if (campData.data) {
            for (const camp of campData.data) {
              const cSpend = parseFloat(camp.insights?.data?.[0]?.spend || "0");
              const actions = camp.insights?.data?.[0]?.actions || [];

              const leadAct = actions.find((a: { action_type: string }) => a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead");
              const leads = parseInt(leadAct?.value || "0");

              const msgAct = actions.find((a: { action_type: string }) =>
                a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
                a.action_type === "onsite_conversion.messaging_first_reply"
              );
              const messages = parseInt(msgAct?.value || "0");

              const actionValues = camp.insights?.data?.[0]?.action_values || [];
              const purchaseVal = actionValues.find((a: { action_type: string }) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
              const cRevenue = parseFloat(purchaseVal?.value || "0");

              const isMessageCampaign = camp.objective === "MESSAGES" || messages > 0;
              const primaryResult = isMessageCampaign ? messages : leads;

              campaignsToUpsert.push({
                client_id: clientId,
                account_id: accountId,
                platform: "meta",
                date: dateStr,
                campaign_name: camp.name,
                campaign_status: "Ativa",
                spend: cSpend,
                clicks: 0,
                conversions: 0,
                leads, messages,
                revenue: cRevenue,
                cpa: primaryResult > 0 ? cSpend / primaryResult : 0,
                source: "Meta Ads",
              });
            }
          }
        } catch (e) {
          errors.push(`Meta ${accountId} date ${dateStr}: ${e}`);
        }
      }
    }

    // Upsert metrics
    if (metricsToUpsert.length > 0) {
      const { error } = await supabaseAdmin
        .from("daily_metrics")
        .upsert(metricsToUpsert, { onConflict: "account_id,platform,date" });
      if (error) {
        errors.push(`Metrics upsert ${dateStr}: ${error.message}`);
      } else {
        totalMetrics += metricsToUpsert.length;
      }
    }

    // Upsert campaigns
    if (campaignsToUpsert.length > 0) {
      const { error } = await supabaseAdmin
        .from("daily_campaigns")
        .upsert(campaignsToUpsert, { onConflict: "client_id,account_id,platform,date,campaign_name" });
      if (error) {
        errors.push(`Campaigns upsert ${dateStr}: ${error.message}`);
      } else {
        totalCampaigns += campaignsToUpsert.length;
      }
    }

    console.log(`[backfill-metrics] Day ${dateStr} done: ${metricsToUpsert.length} metrics, ${campaignsToUpsert.length} campaigns`);
  }

  console.log(`[backfill-metrics] Complete. Metrics: ${totalMetrics}, Campaigns: ${totalCampaigns}, Errors: ${errors.length}`);

  return new Response(
    JSON.stringify({
      success: true,
      days_processed: days,
      metrics_upserted: totalMetrics,
      campaigns_upserted: totalCampaigns,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
