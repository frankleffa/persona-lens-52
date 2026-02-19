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

      for (const clientId of realClientIds) {
        const metricsToUpsert: Array<Record<string, unknown>> = [];
        const campaignsToUpsert: Array<Record<string, unknown>> = [];

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
                      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                      cpc: clicks > 0 ? spend / clicks : 0,
                      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                      cpa: conversions > 0 ? spend / conversions : 0,
                      roas: spend > 0 ? revenue / spend : 0,
                    });
                  }
                }

                // Fetch campaigns
                const campaignQuery = `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date = '${dateStr}' AND campaign.status = 'ENABLED' ORDER BY metrics.cost_micros DESC LIMIT 20`;

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
                const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,clicks,actions,action_values,cost_per_action_type,ctr,cpc&time_range={"since":"${dateStr}","until":"${dateStr}"}&access_token=${metaConn.access_token}`;
                const res = await fetch(insightsUrl);
                const data = await res.json();

                if (data.data?.[0]) {
                  const d = data.data[0];
                  const spend = parseFloat(d.spend || "0");
                  const impressions = parseInt(d.impressions || "0");
                  const clicks = parseInt(d.clicks || "0");

                  const regActions = d.actions?.filter((a: { action_type: string; value?: string }) =>
                    a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
                    a.action_type === "complete_registration" ||
                    a.action_type === "lead" ||
                    a.action_type === "offsite_conversion.fb_pixel_lead"
                  ) || [];
                  const conversions = regActions.reduce((sum: number, a: { value?: string }) => sum + parseInt(a.value || "0"), 0);

                  const purchaseValue = d.action_values?.find((a: { action_type: string }) =>
                    a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
                  );
                  const revenue = parseFloat(purchaseValue?.value || "0");

                  metricsToUpsert.push({
                    client_id: clientId,
                    account_id: accountId,
                    platform: "meta",
                    date: dateStr,
                    spend,
                    impressions,
                    clicks,
                    conversions,
                    revenue,
                    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                    cpc: clicks > 0 ? spend / clicks : 0,
                    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                    cpa: conversions > 0 ? spend / conversions : 0,
                    roas: spend > 0 ? revenue / spend : 0,
                  });
                }

                // Fetch campaigns
                const campUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,objective,insights.fields(spend,actions,action_values){time_range:{"since":"${dateStr}","until":"${dateStr}"}}&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=20&access_token=${metaConn.access_token}`;
                const campRes = await fetch(campUrl);
                const campData = await campRes.json();

                if (campData.data) {
                  for (const camp of campData.data) {
                    const cSpend = parseFloat(camp.insights?.data?.[0]?.spend || "0");
                    const actions = camp.insights?.data?.[0]?.actions || [];

                    const regActs = actions.filter((a: { action_type: string }) =>
                      a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
                      a.action_type === "complete_registration" ||
                      a.action_type === "lead" ||
                      a.action_type === "offsite_conversion.fb_pixel_lead"
                    );
                    const leads = regActs.reduce((sum: number, a: { value?: string }) => sum + parseInt(a.value || "0"), 0);

                    const msgAct = actions.find((a: { action_type: string }) =>
                      a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
                      a.action_type === "onsite_conversion.messaging_first_reply"
                    );
                    const messages = parseInt(msgAct?.value || "0");

                    const actionValues = camp.insights?.data?.[0]?.action_values || [];
                    const purchaseVal = actionValues.find((a: { action_type: string }) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
                    const cRevenue = parseFloat(purchaseVal?.value || "0");

                    // Followers
                    const followAct = actions.find((a: { action_type: string }) =>
                      a.action_type === "follow" || a.action_type === "like"
                    );
                    const followers = parseInt(followAct?.value || "0");

                    // Profile visits (page engagement)
                    const pageEngAct = actions.find((a: { action_type: string }) =>
                      a.action_type === "page_engagement"
                    );
                    const profileVisits = parseInt(pageEngAct?.value || "0");

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
                      leads,
                      messages,
                      followers,
                      profile_visits: profileVisits,
                      revenue: cRevenue,
                      cpa: primaryResult > 0 ? cSpend / primaryResult : 0,
                      source: "Meta Ads",
                    });
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

        // Upsert campaigns
        if (campaignsToUpsert.length > 0) {
          const { error: campError } = await supabaseAdmin
            .from("daily_campaigns")
            .upsert(campaignsToUpsert, { onConflict: "client_id,account_id,platform,date,campaign_name" });

          if (campError) {
            errors.push(`Campaign upsert error for client ${clientId}: ${campError.message}`);
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
