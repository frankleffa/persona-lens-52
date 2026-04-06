import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ──────────────────────────────────────────────

interface WhatsAppReportMetrics {
  investment: boolean;
  revenue: boolean;
  roas: boolean;
  cpa: boolean;
  cpc: boolean;
  cpm: boolean;
  clicks: boolean;
  impressions: boolean;
  ctr: boolean;
  conversions: boolean;
  leads: boolean;
  messages: boolean;
}

interface MetricData {
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  cpc: number;
  cpm: number;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  leads: number;
  messages: number;
  [key: string]: number; // for dynamic primary metric
}

interface ReportSetting {
  id: string;
  agency_id: string;
  client_id: string;
  phone_number: string | null;
  frequency: string | null;
  weekday: number | null;
  send_time: string | null;
  is_active: boolean;
  metrics: WhatsAppReportMetrics;
  include_comparison: boolean;
  report_period_type: string;
}

// ── Helpers ────────────────────────────────────────────

function formatCurrency(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

function formatNumber(v: number): string {
  return v.toLocaleString("pt-BR");
}

function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(0)}%`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function getActionLabel(action: string): string {
  if (action === "paused_campaign") return "🛑 Pausou";
  if (action === "increased_budget") return "🚀 Escalou";
  if (action === "alert_sent") return "⚠️ Alerta";
  return "⚙️ Autom.";
}

function getScoreEmoji(score: number): string {
  if (score >= 8) return "🟢";
  if (score >= 5) return "🟡";
  return "🔴";
}

function getTrendStr(trend: string): string {
  if (trend === "melhorando") return "🟢 Melhorando";
  if (trend === "piorando") return "🔴 Piorando";
  return "⚪ Estável";
}

function formatDate(date: Date): string {
  const dt = new Date(date);
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Data Fetching ──────────────────────────────────────

async function fetchMetrics(
  supabase: any,
  clientId: string,
  startDate: string,
  endDate: string,
  primaryMetric: string
): Promise<MetricData> {
  const { data } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("client_id", clientId)
    .gte("date", startDate)
    .lte("date", endDate);

  const agg: MetricData = {
    spend: 0, revenue: 0, roas: 0, cpa: 0, cpc: 0, cpm: 0,
    clicks: 0, impressions: 0, ctr: 0, conversions: 0, leads: 0, messages: 0,
  };

  if (!data || data.length === 0) return agg;

  let primaryTotal = 0;

  for (const row of data) {
    agg.spend += Number(row.spend) || 0;
    agg.revenue += Number(row.revenue) || 0;
    agg.clicks += Number(row.clicks) || 0;
    agg.impressions += Number(row.impressions) || 0;
    agg.conversions += Number(row.conversions) || 0;
    agg.leads += Number(row.leads) || 0;
    agg.messages += Number(row.message_started) || 0;

    // Dynamic metric tracking
    primaryTotal += Number(row[primaryMetric]) || 0;
  }

  agg[primaryMetric] = primaryTotal;

  if (agg.spend > 0 && agg.conversions > 0) agg.cpa = agg.spend / agg.conversions;
  if (agg.spend > 0 && agg.revenue > 0) agg.roas = agg.revenue / agg.spend;
  if (agg.impressions > 0) agg.ctr = (agg.clicks / agg.impressions) * 100;
  if (agg.clicks > 0) agg.cpc = agg.spend / agg.clicks;
  if (agg.impressions > 0) agg.cpm = (agg.spend / agg.impressions) * 1000;

  return agg;
}

// ── Report Builder (With AI & Automation) ────────────────

function buildDeepReport(
  dataToday: MetricData,
  dataPrev: MetricData,
  clientName: string,
  config: any,
  analysis: any,
  logs: any[],
  now: Date
): string {
  const primaryKey = config.primary_metric || "purchases";
  const primaryLabel = config.primary_metric_label || "Compras";

  const spend = dataToday.spend;
  const pmTotal = dataToday[primaryKey] || 0;
  const prevPmTotal = dataPrev[primaryKey] || 0;
  const cpaToday = pmTotal > 0 ? spend / pmTotal : 0;
  const cpaPrev = prevPmTotal > 0 ? dataPrev.spend / prevPmTotal : 0;

  const cpaChange = pctChange(cpaToday, cpaPrev);
  const roas = dataToday.roas || 0;

  const todayStr = formatDate(now);
  const lines: string[] = [];

  lines.push(`*📊 Relatório Diário - ${clientName}*`);
  lines.push(`📅 ${todayStr}`);

  // From Analysis
  if (analysis) {
    const score = analysis.score || 0;
    lines.push(`Score da Conta: *${score}/10* ${getScoreEmoji(score)}`);
    lines.push("");
    lines.push(`*📈 Resumo:*`);
    lines.push(analysis.resumo || "Resumo indisponível.");
  } else {
    // Basic fallback header if no deep analysis
    lines.push("");
    lines.push(`*(Sem análise profunda ativa nas últimas 24h)*`);
  }

  lines.push("");
  lines.push(`*💰 Números de Ontem:*`);
  lines.push("");
  lines.push(`Investido: R$ ${formatCurrency(spend)}`);
  lines.push(`${primaryLabel}: ${formatNumber(pmTotal)}`);

  const cpaShow = `Custo/${primaryLabel}: R$ ${formatCurrency(cpaToday)}`;
  const cpaVarShow = cpaChange !== null ? ` ${cpaChange > 0 ? '🔴' : '🟢'} ${formatPct(cpaChange)}` : "";
  lines.push(`${cpaShow}${cpaVarShow}`);

  lines.push(`ROAS: ${roas.toFixed(2)}x`);

  // Target info
  if (config.cpa_target) {
    const target = config.cpa_target;
    if (cpaToday > target) {
      lines.push(`• Status CPA: ⚠️ *Acima* do alvo (R$ ${formatCurrency(target)})`);
    } else if (cpaToday > 0) {
      lines.push(`• Status CPA: ✅ *Dentro* do alvo (R$ ${formatCurrency(target)})`);
    }
  }

  // Alerts
  if (analysis?.alertas_criticos && analysis.alertas_criticos.length > 0) {
    lines.push("");
    lines.push(`*🚨 Alertas (${analysis.alertas_criticos.length}):*`);
    (analysis.alertas_criticos.slice(0, 3)).forEach((a: any) => {
      lines.push(`• ${a.titulo}`);
    });
    if (analysis.alertas_criticos.length > 3) {
      lines.push(`• _+${analysis.alertas_criticos.length - 3} alertas no painel_`);
    }
  } else if (analysis) {
    lines.push("");
    lines.push(`*🚨 Alertas (0):*`);
    lines.push(`• Nenhum alerta crítico`);
  }

  // Automation
  lines.push("");
  lines.push(`*🤖 Ações Automáticas (24h):*`);
  if (logs.length > 0) {
    logs.forEach(l => {
      const label = getActionLabel(l.action);
      const camp = l.campaign_name ? (l.campaign_name.length > 20 ? l.campaign_name.substring(0, 20) + "..." : l.campaign_name) : "Conta";
      lines.push(`• ${label}: ${camp}`);
    });
  } else {
    lines.push(`• Nenhuma ação executada`);
  }

  // Footer / Trend
  if (analysis) {
    lines.push("");
    lines.push(`📊 Tendência: ${getTrendStr(analysis.tendencia_7d)}`);
    if (analysis.previsao) {
      lines.push(`${analysis.previsao}`);
    }
  }

  lines.push("");
  lines.push(`_Próxima análise automática amanhã._`);

  return lines.join("\n");
}

// ── Time matching ──────────────────────────────────────

function isTimeMatch(sendTime: string | null, toleranceMinutes: number = 5): boolean {
  if (!sendTime) return false;
  const now = new Date();
  const [h, m] = sendTime.split(":").map(Number);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const targetMinutes = (h + 3) * 60 + m; // Adjust for GMT-3 (Brazil)
  const adjusted = ((targetMinutes % 1440) + 1440) % 1440;
  const diff = Math.abs(nowMinutes - adjusted);
  return diff <= toleranceMinutes || (1440 - diff) <= toleranceMinutes;
}

// ── Evolution API send helper ─────────────────────────

async function sendViaEvolution(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  phoneNumber: string,
  message: string
): Promise<void> {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const res = await fetch(
    `${evolutionUrl}/message/sendText/${instanceName}`,
    {
      method: "POST",
      headers: {
        apikey: evolutionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: cleanPhone, // using clean phone
        text: message,
      }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Evolution API error: ${res.status} - ${errorBody}`);
  }
  await res.text(); // consume body
}

// ── Main handler ───────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron secret header
  const cronSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL")!;
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let forceClientId: string | null = null;
  try {
    const body = await req.json();
    if (body?.clientId) forceClientId = body.clientId;
  } catch {
    // normal cron invocation
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    let query = supabase
      .from("whatsapp_report_settings")
      .select("id, agency_id, client_id, phone_number, is_active, send_time");

    if (forceClientId) {
      query = query.eq("client_id", forceClientId);
    } else {
      query = query.eq("is_active", true);
    }

    const { data: settings, error: settingsError } = await query;

    if (settingsError) {
      console.error("Error fetching settings:", settingsError.message);
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0, failed: 0, message: "No active settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-fetch Evolution connections
    const agencyIds = [...new Set(settings.map((s: any) => s.agency_id))];
    const { data: evoConns } = await supabase
      .from("whatsapp_connections")
      .select("agency_id, client_id, instance_name, status, provider")
      .eq("provider", "evolution")
      .eq("status", "connected")
      .in("agency_id", agencyIds);

    const instanceByClient: Record<string, string> = {};
    const instanceByAgency: Record<string, string> = {};
    (evoConns || []).forEach((c: any) => {
      if (!c.instance_name) return;
      if (c.client_id) {
        instanceByClient[`${c.agency_id}:${c.client_id}`] = c.instance_name;
      } else {
        instanceByAgency[c.agency_id] = c.instance_name;
      }
    });

    const now = new Date();
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Day before yesterday
    const prevDay = new Date(now);
    prevDay.setDate(prevDay.getDate() - 2);
    const prevStr = prevDay.toISOString().split("T")[0];

    // Yesterday timestamp for 24h lookup
    const twentyFourHoursAgoStr = yesterday.toISOString();

    for (const setting of settings) {
      processed++;

      try {
        if (!forceClientId && !isTimeMatch(setting.send_time)) {
          continue;
        }

        if (!setting.phone_number) {
          console.warn(`Skipping ${setting.client_id}: no phone number`);
          continue;
        }

        const instanceName = instanceByClient[`${setting.agency_id}:${setting.client_id}`] || instanceByAgency[setting.agency_id];
        if (!instanceName) {
          console.warn(`Skipping ${setting.client_id}: no Evolution instance`);
          continue;
        }

        // Fetch client analysis config
        const { data: config } = await supabase
          .from("client_analysis_config")
          .select("*")
          .eq("client_id", setting.client_id)
          .maybeSingle();

        const activeConfig = config || { vertical: "ecommerce", primary_metric: "purchases", primary_metric_label: "Compras" };

        // Fetch recent analysis (últimas 24h)
        const { data: analysis } = await supabase
          .from("analysis_reports")
          .select("*")
          .eq("client_id", setting.client_id)
          .gte("created_at", twentyFourHoursAgoStr)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Fetch automation logs (últimas 24h)
        const { data: logs } = await supabase
          .from("automation_log")
          .select("*")
          .eq("client_id", setting.client_id)
          .gte("created_at", twentyFourHoursAgoStr)
          .order("created_at", { ascending: false })
          .limit(10); // cap at 10 to not blow up the msg

        // Fetch daily metrics
        const dataToday = await fetchMetrics(supabase, setting.client_id, yesterdayStr, yesterdayStr, activeConfig.primary_metric);
        const dataPrev = await fetchMetrics(supabase, setting.client_id, prevStr, prevStr, activeConfig.primary_metric);

        // Fetch client label
        const { data: linkData } = await supabase
          .from("client_manager_links")
          .select("client_label")
          .eq("client_user_id", setting.client_id)
          .limit(1)
          .maybeSingle();
        const clientName = linkData?.client_label || "Cliente";

        // Build dynamic report
        const message = buildDeepReport(
          dataToday,
          dataPrev,
          clientName,
          activeConfig,
          analysis,
          logs || [],
          now
        );

        // Send via Evolution API
        await sendViaEvolution(evolutionUrl, evolutionKey, instanceName, setting.phone_number, message);

        // Log execution
        await supabase.from("whatsapp_report_logs").insert({
          agency_id: setting.agency_id,
          client_id: setting.client_id,
          status: "success",
          period_start: yesterdayStr,
          period_end: yesterdayStr,
          report_period_type: "yesterday",
        });

        sent++;
        console.log(`✅ Sent WhatsApp report to ${setting.phone_number} for client ${setting.client_id}`);
      } catch (err: any) {
        failed++;
        console.error(`❌ Failed for client ${setting.client_id}:`, err.message);

        try {
          await supabase.from("whatsapp_report_logs").insert({
            agency_id: setting.agency_id,
            client_id: setting.client_id,
            status: "error",
            error_message: err.message?.substring(0, 500),
            period_start: yesterdayStr,
            period_end: yesterdayStr,
            report_period_type: "yesterday",
          });
        } catch (logErr: any) {
          console.error("Failed to log error:", logErr.message);
        }
      }
    }
  } catch (globalErr: any) {
    console.error("Global error:", globalErr.message);
  }

  return new Response(
    JSON.stringify({ processed, sent, failed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
