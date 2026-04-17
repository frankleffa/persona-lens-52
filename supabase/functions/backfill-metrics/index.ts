import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractMetaCustomAction(actions: Array<{ action_type: string; value?: string }>, eventName: string | null): number {
  if (!eventName || !actions) return 0;
  const exact = actions.find((a) => a.action_type === eventName);
  if (exact) return parseInt(exact.value || "0");
  // Try with offsite_conversion.custom. prefix for custom event IDs
  const prefixed = actions.find((a) => a.action_type === `offsite_conversion.custom.${eventName}`);
  if (prefixed) return parseInt(prefixed.value || "0");
  // Try without prefix if eventName already has it
  if (eventName.startsWith("offsite_conversion.custom.")) {
    const id = eventName.replace("offsite_conversion.custom.", "");
    const byId = actions.find((a) => a.action_type === id);
    if (byId) return parseInt(byId.value || "0");
  }
  return 0;
}

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

  // Load client analysis config ONCE (FTD event names)
  const { data: clientConfig } = await supabaseAdmin
    .from("client_analysis_config")
    .select("ftd_event_name, registration_event_name, ftd_google_conversion_name")
    .eq("client_id", clientId)
    .maybeSingle();
  const regEventName = (clientConfig as any)?.registration_event_name || null;
  const ftdEventName = clientConfig?.ftd_event_name || null;
  const ftdGoogleConvName = (clientConfig as any)?.ftd_google_conversion_name || null;
  console.log(`[backfill-metrics] Config: ftdEventName=${ftdEventName}, ftdGoogleConvName=${ftdGoogleConvName}`);

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

              // Account-level FTD via named conversion (if configured)
              let acctFtd = 0;
              if (ftdGoogleConvName) {
                try {
                  const ftdQuery = `SELECT metrics.conversions, segments.conversion_action_name FROM customer WHERE segments.date = '${dateStr}' AND segments.conversion_action_name = '${ftdGoogleConvName}'`;
                  const ftdRes = await fetch(
                    `https://googleads.googleapis.com/v16/customers/${cleanId}/googleAds:searchStream`,
                    { method: "POST", headers: { Authorization: `Bearer ${googleAccessToken}`, "developer-token": devToken, "Content-Type": "application/json" }, body: JSON.stringify({ query: ftdQuery }) }
                  );
                  const ftdData = await ftdRes.json();
                  if (Array.isArray(ftdData) && ftdData[0]?.results) {
                    for (const r of ftdData[0].results) acctFtd += Math.round(r.metrics?.conversions || 0);
                  }
                } catch (e) {
                  errors.push(`Google FTD ${customerId} ${dateStr}: ${e}`);
                }
              }

              metricsToUpsert.push({
                client_id: clientId,
                account_id: customerId,
                platform: "google",
                date: dateStr,
                spend, impressions, clicks, conversions, revenue,
                purchases: Math.round(conversions),
                leads: 0,
                messages: 0,
                ftd: acctFtd,
                cost_per_ftd: acctFtd > 0 ? spend / acctFtd : 0,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cpc: clicks > 0 ? spend / clicks : 0,
                cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                cpa: conversions > 0 ? spend / conversions : 0,
                roas: spend > 0 ? revenue / spend : 0,
              });
            }
          }

          // Campaigns
          const campaignQuery = `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date = '${dateStr}' AND campaign.status = 'ENABLED' ORDER BY metrics.cost_micros DESC LIMIT 100`;
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
            // Optional: per-campaign FTD via named conversion
            const campFtdMap: Record<string, number> = {};
            if (ftdGoogleConvName) {
              try {
                const ftdQ = `SELECT campaign.name, metrics.conversions, segments.conversion_action_name FROM campaign WHERE segments.date = '${dateStr}' AND segments.conversion_action_name = '${ftdGoogleConvName}'`;
                const ftdR = await fetch(
                  `https://googleads.googleapis.com/v16/customers/${cleanId}/googleAds:searchStream`,
                  { method: "POST", headers: { Authorization: `Bearer ${googleAccessToken}`, "developer-token": devToken, "Content-Type": "application/json" }, body: JSON.stringify({ query: ftdQ }) }
                );
                const ftdD = await ftdR.json();
                if (Array.isArray(ftdD) && ftdD[0]?.results) {
                  for (const r of ftdD[0].results) {
                    const name = r.campaign?.name || "";
                    campFtdMap[name] = (campFtdMap[name] || 0) + Math.round(r.metrics?.conversions || 0);
                  }
                }
              } catch (e) {
                errors.push(`Google campaign FTD ${customerId} ${dateStr}: ${e}`);
              }
            }

            for (const row of campData[0].results) {
              const cSpend = (row.metrics.costMicros || 0) / 1_000_000;
              const cConv = row.metrics.conversions || 0;
              const cFtd = campFtdMap[row.campaign.name] || 0;
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
                ftd: cFtd,
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
          const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,clicks,actions,action_values,cost_per_action_type,ctr,cpc&time_range={"since":"${dateStr}","until":"${dateStr}"}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${metaConn.access_token}`;
          const res = await fetch(insightsUrl);
          const data = await res.json();

          if (data.data?.[0]) {
            const d = data.data[0];
            const spend = parseFloat(d.spend || "0");
            const impressions = parseInt(d.impressions || "0");
            const clicks = parseInt(d.clicks || "0");

            const actions = d.actions || [];

            const purchaseAct = actions.find((a: { action_type: string }) =>
              a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
            );
            const purchases = parseInt(purchaseAct?.value || "0");

            // Registrations — use custom event if configured
            let registrations = 0;
            if (regEventName) {
              const customRegAct = actions.find((a: { action_type: string }) => a.action_type === regEventName);
              registrations = customRegAct ? parseInt(customRegAct.value || "0") : 0;
            } else {
              const regAction = actions.find((a: { action_type: string }) =>
                a.action_type === "offsite_conversion.fb_pixel_complete_registration"
              ) || actions.find((a: { action_type: string }) =>
                a.action_type === "complete_registration"
              );
              registrations = regAction ? parseInt(regAction.value || "0") : 0;
            }

            const leadAction = actions.find((a: { action_type: string }) =>
              a.action_type === "offsite_conversion.fb_pixel_lead"
            ) || actions.find((a: { action_type: string }) =>
              a.action_type === "lead"
            );
            const leads = leadAction ? parseInt(leadAction.value || "0") : 0;

            const msgAct = actions.find((a: { action_type: string }) =>
              a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
              a.action_type === "onsite_conversion.messaging_first_reply"
            );
            const messages = parseInt(msgAct?.value || "0");

            const conversions = registrations + leads + messages + purchases;

            const purchaseValue = d.action_values?.find((a: { action_type: string }) =>
              a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
            );
            const revenue = parseFloat(purchaseValue?.value || "0");

            const ftdValue = ftdEventName ? extractMetaCustomAction(actions, ftdEventName) : 0;

            metricsToUpsert.push({
              client_id: clientId,
              account_id: accountId,
              platform: "meta",
              date: dateStr,
              spend, impressions, clicks, conversions, revenue,
              purchases, registrations, leads, messages,
              ftd: ftdValue,
              cost_per_ftd: ftdValue > 0 ? spend / ftdValue : 0,
              ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
              cpc: clicks > 0 ? spend / clicks : 0,
              cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
              cpa: conversions > 0 ? spend / conversions : 0,
              roas: spend > 0 ? revenue / spend : 0,
            });
          }

          // Campaigns - fetch list then insights per campaign with proper attribution
          const campListUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,objective&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=100&access_token=${metaConn.access_token}`;
          const campRes = await fetch(campListUrl);
          const campData = await campRes.json();

          if (campData.data) {
            for (const camp of campData.data) {
              try {
                const campInsUrl = `https://graph.facebook.com/v19.0/${camp.id}/insights?fields=spend,clicks,actions,action_values&time_range={"since":"${dateStr}","until":"${dateStr}"}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${metaConn.access_token}`;
                const campInsRes = await fetch(campInsUrl);
                const campInsData = await campInsRes.json();
                const insRow = campInsData.data?.[0];
                if (!insRow) continue;

                const cSpend = parseFloat(insRow.spend || "0");
                const actions = insRow.actions || [];
                const actionValues = insRow.action_values || [];

          // Campaign-level registrations — use custom event if configured
              let registrations = 0;
              if (regEventName) {
                const customRegAct = actions.find((a: { action_type: string }) => a.action_type === regEventName);
                registrations = customRegAct ? parseInt(customRegAct.value || "0") : 0;
              } else {
                const campRegAct = actions.find((a: { action_type: string }) =>
                  a.action_type === "offsite_conversion.fb_pixel_complete_registration"
                ) || actions.find((a: { action_type: string }) =>
                  a.action_type === "complete_registration"
                );
                registrations = campRegAct ? parseInt(campRegAct.value || "0") : 0;
              }

              const campLeadAct = actions.find((a: { action_type: string }) =>
                a.action_type === "offsite_conversion.fb_pixel_lead"
              ) || actions.find((a: { action_type: string }) =>
                a.action_type === "lead"
              );
              const leads = campLeadAct ? parseInt(campLeadAct.value || "0") : 0;

              const msgAct = actions.find((a: { action_type: string }) =>
                a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
                a.action_type === "onsite_conversion.messaging_first_reply"
              );
              const messages = parseInt(msgAct?.value || "0");

              const purchaseVal = actionValues.find((a: { action_type: string }) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
              const cRevenue = parseFloat(purchaseVal?.value || "0");

              const isMessageCampaign = camp.objective === "MESSAGES" || messages > 0;
              const primaryResult = isMessageCampaign ? messages : (registrations + leads);

              const purchaseAct = actions.find((a: { action_type: string }) =>
                a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
              );
              const campPurchases = parseInt(purchaseAct?.value || "0");

              const campFtdValue = ftdEventName ? extractMetaCustomAction(actions, ftdEventName) : 0;

              campaignsToUpsert.push({
                client_id: clientId,
                account_id: accountId,
                platform: "meta",
                date: dateStr,
                campaign_name: camp.name,
                campaign_status: "Ativa",
                spend: cSpend,
                clicks: parseInt(insRow.clicks || "0"),
                conversions: 0,
                registrations, leads, messages,
                purchases: campPurchases,
                revenue: cRevenue,
                cpa: primaryResult > 0 ? cSpend / primaryResult : 0,
                ftd: campFtdValue,
                source: "Meta Ads",
              });
              } catch (campErr) {
                errors.push(`Campaign ${camp.id} date ${dateStr}: ${campErr}`);
              }
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
