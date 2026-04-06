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

/** Extract a conversion action count by name from Google Ads for a specific customer. */
async function fetchGoogleFTDByConversionName(
  accessToken: string,
  customerId: string,
  conversionName: string,
  devToken: string,
  dateStr: string
): Promise<number> {
  const cleanId = customerId.replace(/-/g, "");
  const query = `SELECT conversion_action.name, metrics.all_conversions FROM conversion_action WHERE conversion_action.name = '${conversionName}' AND segments.date = '${dateStr}'`;
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
      return Math.round(total);
    }
  } catch (e) {
    console.warn(`[google-ftd] Could not fetch FTD for conversion "${conversionName}":`, e);
  }
  return 0;
}

/** Extract a custom Meta action value from an actions array by event name. */
function extractMetaCustomAction(
  actions: Array<{ action_type: string; value?: string }>,
  eventName: string
): number {
  const act = actions?.find((a) => a.action_type === eventName);
  return act ? parseInt(act.value || "0") : 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";

  // Yesterday's date for daily sync
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  console.log(`[sync-daily-metrics] Starting sync for date: ${dateStr}`);

  // Get all managers with active connections
  const { data: connections, error: connErr } = await supabaseAdmin
    .from("oauth_connections")
    .select("*")
    .eq("connected", true);

  if (connErr || !connections) {
    console.error("Failed to fetch connections:", connErr);
    return new Response(JSON.stringify({ error: "Failed to fetch connections" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group connections by manager
  const managerConnections = new Map<string, typeof connections>();
  for (const conn of connections) {
    const existing = managerConnections.get(conn.manager_id) || [];
    existing.push(conn);
    managerConnections.set(conn.manager_id, existing);
  }

  let totalUpserted = 0;
  const errors: string[] = [];

  for (const [managerId, conns] of managerConnections) {
    try {
      // Get all clients for this manager
      const { data: clientLinks } = await supabaseAdmin
        .from("client_manager_links")
        .select("client_user_id")
        .eq("manager_id", managerId);

      const clientIds = clientLinks?.map((l) => l.client_user_id) || [];

      // Filter out demo clients
      const { data: demoLinks } = await supabaseAdmin
        .from("client_manager_links")
        .select("client_user_id")
        .eq("manager_id", managerId)
        .eq("is_demo", true);
      const demoIds = new Set((demoLinks || []).map((l) => l.client_user_id));
      const realClientIds = clientIds.filter((id) => !demoIds.has(id));

      // Load client_analysis_config for all real clients (for FTD event mapping)
      const { data: analysisConfigs } = await supabaseAdmin
        .from("client_analysis_config")
        .select("client_id, ftd_event_name, ftd_google_conversion_name")
        .in("client_id", realClientIds.length > 0 ? realClientIds : ["00000000-0000-0000-0000-000000000000"]);

      const configByClient = new Map<string, { ftd_event_name: string | null; ftd_google_conversion_name: string | null }>();
      for (const cfg of analysisConfigs || []) {
        configByClient.set(cfg.client_id, {
          ftd_event_name: cfg.ftd_event_name || null,
          ftd_google_conversion_name: cfg.ftd_google_conversion_name || null,
        });
      }

      for (const clientId of realClientIds) {
        const metricsToUpsert: Array<Record<string, unknown>> = [];
        const campaignsToUpsert: Array<Record<string, unknown>> = [];

        const clientConfig = configByClient.get(clientId) || { ftd_event_name: null, ftd_google_conversion_name: null };
        const metaFtdEventName = clientConfig.ftd_event_name;
        const googleFtdConvName = clientConfig.ftd_google_conversion_name;

        // Google Ads for this client
        const googleConn = conns.find((c) => c.provider === "google_ads");
        if (googleConn?.refresh_token) {
          const { data: clientGoogleAccounts } = await supabaseAdmin
            .from("client_ad_accounts")
            .select("customer_id")
            .eq("client_user_id", clientId);

          const googleIds = (clientGoogleAccounts || []).map((a) => a.customer_id);

          if (googleIds.length > 0) {
            try {
              const accessToken = await refreshGoogleToken(googleConn.refresh_token);

              for (const customerId of googleIds) {
                const cleanId = customerId.replace(/-/g, "");
                const query = `SELECT metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion, metrics.ctr, metrics.average_cpc FROM customer WHERE segments.date = '${dateStr}'`;

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
                    const spend = (m.costMicros || 0) / 1_000_000;
                    const clicks = m.clicks || 0;
                    const impressions = m.impressions || 0;
                    const conversions = m.conversions || 0;
                    const revenue = m.conversionsValue || 0;

                    // FTD: use custom conversion name if configured, else 0
                    let ftd = 0;
                    let costPerFtd = 0;
                    if (googleFtdConvName) {
                      ftd = await fetchGoogleFTDByConversionName(accessToken, customerId, googleFtdConvName, devToken, dateStr);
                      costPerFtd = ftd > 0 ? spend / ftd : 0;
                    }

                    metricsToUpsert.push({
                      client_id: clientId,
                      account_id: customerId,
                      platform: "google",
                      date: dateStr,
                      spend,
                      impressions,
                      clicks,
                      conversions,
                      revenue,
                      ftd,
                      cost_per_ftd: costPerFtd,
                      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                      cpc: clicks > 0 ? spend / clicks : 0,
                      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                      cpa: conversions > 0 ? spend / conversions : 0,
                      roas: spend > 0 ? revenue / spend : 0,
                    });
                  }
                }

                // Fetch campaigns
                const campaignQuery = `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date = '${dateStr}' AND campaign.status = 'ENABLED' ORDER BY metrics.cost_micros DESC LIMIT 100`;

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
                    const cSpend = (row.metrics.costMicros || 0) / 1_000_000;
                    const cConv = row.metrics.conversions || 0;
                    // FTD at campaign level: if custom conversion name set, we can't easily per-campaign here.
                    // Leave at 0 for campaigns; total is in daily_metrics.
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
                      leads: 0,
                      messages: 0,
                      revenue: row.metrics.conversionsValue || 0,
                      cpa: cConv > 0 ? cSpend / cConv : 0,
                      ftd: 0, // FTD tracked at account level in daily_metrics
                      source: "Google Ads",
                    });
                  }
                }
              }
            } catch (e) {
              errors.push(`Google Ads error for manager ${managerId}, client ${clientId}: ${e}`);
            }
          }
        }

        // Meta Ads for this client
        const metaConn = conns.find((c) => c.provider === "meta_ads");
        if (metaConn?.access_token) {
          const { data: clientMetaAccounts } = await supabaseAdmin
            .from("client_meta_ad_accounts")
            .select("ad_account_id")
            .eq("client_user_id", clientId);

          const metaIds = (clientMetaAccounts || []).map((a) => a.ad_account_id);

          if (metaIds.length > 0) {
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

                  // Registrations — canonical: prefer fb_pixel variant
                  const regAction = d.actions?.find((a: { action_type: string; value?: string }) =>
                    a.action_type === "offsite_conversion.fb_pixel_complete_registration"
                  ) || d.actions?.find((a: { action_type: string; value?: string }) =>
                    a.action_type === "complete_registration"
                  );
                  const registrations = regAction ? parseInt(regAction.value || "0") : 0;

                  // Leads — canonical: prefer fb_pixel variant
                  const leadAction = d.actions?.find((a: { action_type: string; value?: string }) =>
                    a.action_type === "offsite_conversion.fb_pixel_lead"
                  ) || d.actions?.find((a: { action_type: string; value?: string }) =>
                    a.action_type === "lead"
                  );
                  const metaLeads = leadAction ? parseInt(leadAction.value || "0") : 0;

                  const purchaseValue = d.action_values?.find((a: { action_type: string }) =>
                    a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
                  );
                  const revenue = parseFloat(purchaseValue?.value || "0");

                  // Standard purchase event
                  const purchaseAct = d.actions?.find((a: { action_type: string; value?: string }) =>
                    a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
                  );
                  const purchases = parseInt(purchaseAct?.value || "0");

                  const msgAction = d.actions?.find((a: { action_type: string; value?: string }) =>
                    a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
                    a.action_type === "onsite_conversion.messaging_first_reply"
                  );
                  const messages = parseInt(msgAction?.value || "0");

                  // FTD: custom event if configured, else 0 (decoupled from purchases)
                  const ftd = metaFtdEventName
                    ? extractMetaCustomAction(d.actions || [], metaFtdEventName)
                    : 0;
                  const costPerFtd = ftd > 0 ? spend / ftd : 0;

                  metricsToUpsert.push({
                    client_id: clientId,
                    account_id: accountId,
                    platform: "meta",
                    date: dateStr,
                    spend,
                    impressions,
                    clicks,
                    conversions: purchases + registrations,
                    revenue,
                    purchases,
                    registrations,
                    messages,
                    leads: metaLeads,
                    ftd,
                    cost_per_ftd: costPerFtd,
                    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                    cpc: clicks > 0 ? spend / clicks : 0,
                    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                    cpa: registrations > 0 ? spend / registrations : 0,
                    roas: spend > 0 ? revenue / spend : 0,
                  });
                }

                // Fetch campaigns - use separate insights call per campaign for proper attribution params
                const campUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,objective&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=100&access_token=${metaConn.access_token}`;
                const campRes = await fetch(campUrl);
                const campData = await campRes.json();

                if (campData.data) {
                  for (const camp of campData.data) {
                    try {
                      // Fetch insights per campaign with proper attribution params
                      const campInsUrl = `https://graph.facebook.com/v19.0/${camp.id}/insights?fields=spend,clicks,actions,action_values&time_range={"since":"${dateStr}","until":"${dateStr}"}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${metaConn.access_token}`;
                      const campInsRes = await fetch(campInsUrl);
                      const campInsData = await campInsRes.json();
                      const insRow = campInsData.data?.[0];
                      if (!insRow) continue;

                      const cSpend = parseFloat(insRow.spend || "0");
                      const actions = insRow.actions || [];
                      const actionValues = insRow.action_values || [];

                    // Registrations — canonical: prefer fb_pixel variant
                    const campRegAct = actions.find((a: { action_type: string }) =>
                      a.action_type === "offsite_conversion.fb_pixel_complete_registration"
                    ) || actions.find((a: { action_type: string }) =>
                      a.action_type === "complete_registration"
                    );
                    const campRegistrations = campRegAct ? parseInt(campRegAct.value || "0") : 0;

                    // Leads — canonical: prefer fb_pixel variant
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

                    const followAct = actions.find((a: { action_type: string }) =>
                      a.action_type === "follow" ||
                      a.action_type === "like" ||
                      a.action_type === "page_like" ||
                      a.action_type === "onsite_conversion.post_net_like"
                    );
                    let followers = parseInt(followAct?.value || "0");

                    if (followers === 0 && (
                      camp.objective === "OUTCOME_ENGAGEMENT" ||
                      camp.name?.toLowerCase().includes("seguidor")
                    )) {
                      const pageEngFallback = actions.find((a: { action_type: string }) => a.action_type === "page_engagement");
                      followers = parseInt(pageEngFallback?.value || "0");
                    }

                    const pageEngAct = actions.find((a: { action_type: string }) =>
                      a.action_type === "page_engagement"
                    );
                    const profileVisits = parseInt(pageEngAct?.value || "0");

                    const isMessageCampaign = camp.objective === "MESSAGES" || messages > 0;
                    const primaryResult = isMessageCampaign ? messages : leads;

                    const campClicks = parseInt(insRow.clicks || "0");

                    // Standard purchase event for campaign
                    const campPurchaseAct = actions.find((a: { action_type: string }) =>
                      a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
                    );
                    const campPurchases = parseInt(campPurchaseAct?.value || "0");

                    // FTD at campaign level: use custom event if configured, else 0
                    const campFtd = metaFtdEventName
                      ? extractMetaCustomAction(actions, metaFtdEventName)
                      : 0;

                    campaignsToUpsert.push({
                      client_id: clientId,
                      account_id: accountId,
                      platform: "meta",
                      date: dateStr,
                      external_campaign_id: camp.id,
                      campaign_name: camp.name,
                      campaign_status: "Ativa",
                      spend: cSpend,
                      clicks: campClicks,
                      conversions: 0,
                      leads,
                      messages,
                      followers,
                      profile_visits: profileVisits,
                      revenue: cRevenue,
                      cpa: primaryResult > 0 ? cSpend / primaryResult : 0,
                      purchases: campPurchases,
                      registrations: campRegistrations,
                      ftd: campFtd,
                      source: "Meta Ads",
                    });
                    } catch (campErr) {
                      errors.push(`Campaign insights error for ${camp.id}: ${campErr}`);
                    }
                  }
                }
              } catch (e) {
                errors.push(`Meta Ads error for ${accountId}: ${e}`);
              }
            }
          }
        }

        // Upsert all metrics for this client
        if (metricsToUpsert.length > 0) {
          const { error: upsertError } = await supabaseAdmin
            .from("daily_metrics")
            .upsert(metricsToUpsert, { onConflict: "account_id,platform,date" });

          if (upsertError) {
            errors.push(`Upsert error for client ${clientId}: ${upsertError.message}`);
          } else {
            totalUpserted += metricsToUpsert.length;
          }
        }

        // Upsert campaigns - clean slate approach: delete all for client+date, then insert
        if (campaignsToUpsert.length > 0) {
          // Clean slate: delete ALL campaigns for this client + date
          const { error: delErr } = await supabaseAdmin
            .from("daily_campaigns")
            .delete()
            .eq("client_id", clientId)
            .eq("date", dateStr);

          if (delErr) {
            errors.push(`Campaign delete error for client ${clientId}: ${delErr.message}`);
          }

          const { error: insertErr } = await supabaseAdmin
            .from("daily_campaigns")
            .insert(campaignsToUpsert);

          if (insertErr) {
            errors.push(`Campaign insert error for client ${clientId}: ${insertErr.message}`);
          } else {
            console.log(`Persisted ${campaignsToUpsert.length} daily_campaigns rows for client ${clientId}`);
          }
        }
      }
    } catch (e) {
      errors.push(`Manager ${managerId} error: ${e}`);
    }
  }

  console.log(`[sync-daily-metrics] Done. Upserted: ${totalUpserted}, Errors: ${errors.length}`);

  return new Response(
    JSON.stringify({
      success: true,
      date: dateStr,
      upserted: totalUpserted,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
