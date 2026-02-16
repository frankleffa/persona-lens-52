import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL")!;
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all active alerts
    const { data: alerts, error: alertsErr } = await supabase
      .from("account_balance_alerts")
      .select("*")
      .eq("is_active", true);

    if (alertsErr) throw alertsErr;
    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active alerts" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agencyIds = [...new Set(alerts.map((a: any) => a.agency_id))];

    // Get Meta oauth tokens for balance checking
    const { data: oauthConns } = await supabase
      .from("oauth_connections")
      .select("manager_id, access_token")
      .eq("provider", "meta")
      .eq("connected", true)
      .in("manager_id", agencyIds);

    const tokenByAgency: Record<string, string> = {};
    (oauthConns || []).forEach((c: any) => {
      tokenByAgency[c.manager_id] = c.access_token;
    });

    // Get Evolution API instances for sending
    const { data: evoConns } = await supabase
      .from("whatsapp_connections")
      .select("agency_id, instance_name, status, provider")
      .eq("provider", "evolution")
      .eq("status", "connected")
      .in("agency_id", agencyIds);

    const instanceByAgency: Record<string, string> = {};
    (evoConns || []).forEach((c: any) => {
      if (c.instance_name) instanceByAgency[c.agency_id] = c.instance_name;
    });

    const now = new Date();
    const results: any[] = [];

    for (const alert of alerts) {
      const metaToken = tokenByAgency[alert.agency_id];
      if (!metaToken) {
        results.push({ ad_account_id: alert.ad_account_id, skipped: "no_meta_token" });
        continue;
      }

      // Check cooldown (24h)
      if (alert.last_triggered_at) {
        const lastTriggered = new Date(alert.last_triggered_at);
        const hoursDiff = (now.getTime() - lastTriggered.getTime()) / (1000 * 60 * 60);
        if (hoursDiff < 24) {
          results.push({ ad_account_id: alert.ad_account_id, skipped: "cooldown" });
          continue;
        }
      }

      // Fetch balance from Meta API
      try {
        const accountId = alert.ad_account_id.startsWith("act_")
          ? alert.ad_account_id
          : `act_${alert.ad_account_id}`;

        const metaRes = await fetch(
          `https://graph.facebook.com/v21.0/${accountId}?fields=balance,amount_spent&access_token=${metaToken}`
        );
        const metaData = await metaRes.json();

        if (metaData.error) {
          results.push({ ad_account_id: alert.ad_account_id, error: metaData.error.message });
          continue;
        }

        const balanceValue = parseFloat(metaData.balance || "0") / 100;
        const threshold = parseFloat(alert.threshold_value);

        if (balanceValue <= threshold) {
          const instanceName = instanceByAgency[alert.agency_id];
          if (!instanceName) {
            results.push({ ad_account_id: alert.ad_account_id, skipped: "no_evolution_instance" });
            continue;
          }

          const recipientPhone = alert.recipient_phone;
          if (!recipientPhone) {
            results.push({ ad_account_id: alert.ad_account_id, skipped: "no_recipient_phone" });
            continue;
          }

          const message =
            `⚠️ *Alerta Adscape - Saldo Baixo*\n\n` +
            `📋 Conta: ${alert.ad_account_id}\n` +
            `💰 Saldo atual: R$ ${balanceValue.toFixed(2)}\n` +
            `🔻 Limite configurado: R$ ${threshold.toFixed(2)}\n\n` +
            `Ação necessária para manter campanhas ativas.`;

          // Send via Evolution API
          const sendRes = await fetch(
            `${evolutionUrl}/message/sendText/${instanceName}`,
            {
              method: "POST",
              headers: {
                apikey: evolutionKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                number: recipientPhone,
                text: message,
              }),
            }
          );

          if (!sendRes.ok) {
            const errBody = await sendRes.text();
            throw new Error(`Evolution API error: ${sendRes.status} - ${errBody}`);
          }

          // Update last_triggered_at
          await supabase
            .from("account_balance_alerts")
            .update({ last_triggered_at: now.toISOString() })
            .eq("id", alert.id);

          results.push({
            ad_account_id: alert.ad_account_id,
            triggered: true,
            balance: balanceValue,
          });
        } else {
          results.push({
            ad_account_id: alert.ad_account_id,
            ok: true,
            balance: balanceValue,
          });
        }
      } catch (fetchErr: any) {
        results.push({ ad_account_id: alert.ad_account_id, error: fetchErr.message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
