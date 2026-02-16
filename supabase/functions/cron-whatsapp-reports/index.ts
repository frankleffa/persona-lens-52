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

// ── Period calculation ─────────────────────────────────

function calculatePeriod(periodType: string): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (periodType) {
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case "last_7_days": {
      const end = new Date(today);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start: fmt(start), end: fmt(end) };
    }
    case "last_30_days": {
      const end = new Date(today);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return { start: fmt(start), end: fmt(end) };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today);
      end.setDate(end.getDate() - 1);
      return { start: fmt(start), end: fmt(end) };
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: fmt(start), end: fmt(end) };
    }
    default:
      return calculatePeriod("last_7_days");
  }
}

function calculatePreviousPeriod(start: string, end: string): { start: string; end: string } {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const prevEnd = new Date(s);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(prevStart), end: fmt(prevEnd) };
}

// ── Metric aggregation ────────────────────────────────

async function fetchMetrics(
  supabase: any,
  clientId: string,
  startDate: string,
  endDate: string
): Promise<MetricData> {
  const { data } = await supabase
    .from("daily_metrics")
    .select("spend, revenue, clicks, impressions, conversions")
    .eq("client_id", clientId)
    .gte("date", startDate)
    .lte("date", endDate);

  const agg: MetricData = {
    spend: 0, revenue: 0, roas: 0, cpa: 0, cpc: 0, cpm: 0,
    clicks: 0, impressions: 0, ctr: 0, conversions: 0, leads: 0, messages: 0,
  };

  if (!data || data.length === 0) return agg;

  for (const row of data) {
    agg.spend += Number(row.spend) || 0;
    agg.revenue += Number(row.revenue) || 0;
    agg.clicks += Number(row.clicks) || 0;
    agg.impressions += Number(row.impressions) || 0;
    agg.conversions += Number(row.conversions) || 0;
  }
  if (agg.spend > 0 && agg.conversions > 0) agg.cpa = agg.spend / agg.conversions;
  if (agg.spend > 0 && agg.revenue > 0) agg.roas = agg.revenue / agg.spend;
  if (agg.impressions > 0) agg.ctr = (agg.clicks / agg.impressions) * 100;
  if (agg.clicks > 0) agg.cpc = agg.spend / agg.clicks;
  if (agg.impressions > 0) agg.cpm = (agg.spend / agg.impressions) * 1000;

  return agg;
}

// ── Report formatter ──────────────────────────────────

function formatCurrency(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
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

interface MetricDef {
  key: string;
  dataKey: keyof MetricData;
  emoji: string;
  label: string;
  format: (v: number) => string;
}

const PRIMARY_METRICS: MetricDef[] = [
  { key: "investment", dataKey: "spend", emoji: "💰", label: "Investimento", format: formatCurrency },
  { key: "revenue", dataKey: "revenue", emoji: "💵", label: "Receita", format: formatCurrency },
  { key: "roas", dataKey: "roas", emoji: "📈", label: "ROAS", format: (v) => `${v.toFixed(2)}x` },
  { key: "conversions", dataKey: "conversions", emoji: "🎯", label: "Conversões", format: formatNumber },
  { key: "leads", dataKey: "leads", emoji: "📋", label: "Leads", format: formatNumber },
  { key: "messages", dataKey: "messages", emoji: "💬", label: "Mensagens", format: formatNumber },
];

const SECONDARY_METRICS: MetricDef[] = [
  { key: "clicks", dataKey: "clicks", emoji: "🖱", label: "Cliques", format: formatNumber },
  { key: "impressions", dataKey: "impressions", emoji: "👁", label: "Impressões", format: formatNumber },
  { key: "ctr", dataKey: "ctr", emoji: "📊", label: "CTR", format: (v) => `${v.toFixed(2)}%` },
  { key: "cpa", dataKey: "cpa", emoji: "💸", label: "CPA", format: formatCurrency },
  { key: "cpc", dataKey: "cpc", emoji: "🔗", label: "CPC", format: formatCurrency },
  { key: "cpm", dataKey: "cpm", emoji: "📢", label: "CPM", format: formatCurrency },
];

const ALL_METRICS = [...PRIMARY_METRICS, ...SECONDARY_METRICS];
const SEPARATOR = "━━━━━━━━━━━━━━━━━━";

function buildReport(
  data: MetricData,
  selectedMetrics: WhatsAppReportMetrics,
  includeComparison: boolean,
  previousData: MetricData | undefined,
  clientName: string,
  startDate: string,
  endDate: string
): string {
  const lines: string[] = [];
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  lines.push("📊 *Adscape • Resumo de Performance*");
  lines.push("");
  lines.push(`Conta: *${clientName}*`);
  if (startDate === endDate) {
    lines.push(`Período: ${fmtDate(startDate)}`);
  } else {
    lines.push(`Período: ${fmtDate(startDate)} — ${fmtDate(endDate)}`);
  }

  if (selectedMetrics.roas && data.roas != null) {
    lines.push("");
    if (data.roas >= 2) lines.push("🟢 Resultado positivo no período");
    else if (data.roas < 1) lines.push("🔴 Retorno abaixo do investimento");
  }

  const primaryLines: string[] = [];
  for (const def of PRIMARY_METRICS) {
    if (!(selectedMetrics as any)[def.key]) continue;
    primaryLines.push(`${def.emoji} ${def.label}: *${def.format(data[def.dataKey] ?? 0)}*`);
  }
  if (primaryLines.length) {
    lines.push("", SEPARATOR, "", ...primaryLines);
  }

  const secondaryLines: string[] = [];
  for (const def of SECONDARY_METRICS) {
    if (!(selectedMetrics as any)[def.key]) continue;
    secondaryLines.push(`${def.emoji} ${def.label}: *${def.format(data[def.dataKey] ?? 0)}*`);
  }
  if (secondaryLines.length) {
    lines.push("", SEPARATOR, "", "_Outros indicadores:_", ...secondaryLines);
  }

  if (includeComparison && previousData) {
    lines.push("");
    const hasPrev = ALL_METRICS.some(
      (def) => (selectedMetrics as any)[def.key] && (previousData[def.dataKey] ?? 0) > 0
    );
    if (!hasPrev) {
      lines.push("_Comparativo indisponível (sem base anterior)_");
    } else {
      lines.push("_Comparado ao período anterior:_");
      for (const def of ALL_METRICS) {
        if (!(selectedMetrics as any)[def.key]) continue;
        const change = pctChange(data[def.dataKey] ?? 0, previousData[def.dataKey] ?? 0);
        if (change === null) continue;
        lines.push(`• ${def.label}: ${formatPct(change)}`);
      }
    }
  }

  lines.push("", "_Relatório automático • Adscape_");
  return lines.join("\n");
}

// ── Time matching ──────────────────────────────────────

function isTimeMatch(sendTime: string | null, toleranceMinutes: number = 5): boolean {
  if (!sendTime) return false;
  const now = new Date();
  const [h, m] = sendTime.split(":").map(Number);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const targetMinutes = (h + 3) * 60 + m;
  const adjusted = ((targetMinutes % 1440) + 1440) % 1440;
  const diff = Math.abs(nowMinutes - adjusted);
  return diff <= toleranceMinutes || (1440 - diff) <= toleranceMinutes;
}

function isWeekdayMatch(weekday: number | null): boolean {
  if (weekday === null) return false;
  const now = new Date();
  return now.getDay() === weekday;
}

// ── Evolution API send helper ─────────────────────────

async function sendViaEvolution(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  phoneNumber: string,
  message: string
): Promise<void> {
  const res = await fetch(
    `${evolutionUrl}/message/sendText/${instanceName}`,
    {
      method: "POST",
      headers: {
        apikey: evolutionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: phoneNumber,
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
      .select("id, agency_id, client_id, phone_number, frequency, weekday, send_time, is_active, metrics, include_comparison, report_period_type");

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

    // Pre-fetch Evolution connections for all agencies
    const agencyIds = [...new Set(settings.map((s: any) => s.agency_id))];
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

    for (const setting of settings as ReportSetting[]) {
      processed++;

      try {
        if (!forceClientId) {
          if (!isTimeMatch(setting.send_time)) continue;
          if (setting.frequency === "weekly" && !isWeekdayMatch(setting.weekday)) continue;
        }

        if (!setting.phone_number) {
          console.warn(`Skipping ${setting.client_id}: no phone number`);
          continue;
        }

        const instanceName = instanceByAgency[setting.agency_id];
        if (!instanceName) {
          console.warn(`Skipping ${setting.client_id}: no Evolution instance for agency ${setting.agency_id}`);
          continue;
        }

        // Check if already sent today
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const { data: existingLog } = await supabase
          .from("whatsapp_report_logs")
          .select("id")
          .eq("agency_id", setting.agency_id)
          .eq("client_id", setting.client_id)
          .gte("sent_at", todayStart.toISOString())
          .eq("status", "success")
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          console.log(`Skipping ${setting.client_id}: already sent today`);
          continue;
        }

        const periodType = setting.report_period_type || "last_7_days";
        const { start: periodStart, end: periodEnd } = calculatePeriod(periodType);

        const data = await fetchMetrics(supabase, setting.client_id, periodStart, periodEnd);

        let previousData: MetricData | undefined;
        if (setting.include_comparison) {
          const prev = calculatePreviousPeriod(periodStart, periodEnd);
          previousData = await fetchMetrics(supabase, setting.client_id, prev.start, prev.end);
        }

        const { data: linkData } = await supabase
          .from("client_manager_links")
          .select("client_label")
          .eq("client_user_id", setting.client_id)
          .eq("manager_id", setting.agency_id)
          .limit(1)
          .maybeSingle();

        const clientName = linkData?.client_label || "Cliente";

        const message = buildReport(
          data,
          setting.metrics,
          setting.include_comparison,
          previousData,
          clientName,
          periodStart,
          periodEnd
        );

        // Send via Evolution API
        await sendViaEvolution(evolutionUrl, evolutionKey, instanceName, setting.phone_number, message);

        await supabase.from("whatsapp_report_logs").insert({
          agency_id: setting.agency_id,
          client_id: setting.client_id,
          period_start: periodStart,
          period_end: periodEnd,
          status: "success",
          report_period_type: periodType,
        });

        sent++;
        console.log(`✅ Sent report to ${setting.phone_number} for client ${setting.client_id}`);
      } catch (err: any) {
        failed++;
        console.error(`❌ Failed for client ${setting.client_id}:`, err.message);

        try {
          const periodType = setting.report_period_type || "last_7_days";
          const { start: ps, end: pe } = calculatePeriod(periodType);
          await supabase.from("whatsapp_report_logs").insert({
            agency_id: setting.agency_id,
            client_id: setting.client_id,
            period_start: ps,
            period_end: pe,
            status: "error",
            error_message: err.message?.substring(0, 500),
            report_period_type: periodType,
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
