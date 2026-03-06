import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ───

interface DailyMetricRow {
  date: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ftd: number;
  cost_per_ftd: number;
  purchases: number;
  registrations: number;
  messages: number;
  leads: number;
}

interface DailyCampaignRow {
  date: string;
  campaign_name: string;
  platform: string;
  spend: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ftd: number;
  leads: number;
  messages: number;
  purchases: number;
}

interface PeriodMetrics {
  spend: number;
  ftd: number;
  cost_per_ftd: number;
  roas: number;
  ctr: number;
  cpc: number;
  impressions: number;
  clicks: number;
  revenue: number;
  purchases: number;
  registrations: number;
  messages: number;
  leads: number;
}

interface Anomaly {
  campaign_name: string;
  metric: string;
  value: number;
  average: number;
  deviation_pct: number;
  type: "spike" | "drop";
}

interface DecliningCampaign {
  campaign_name: string;
  metric: string;
  consecutive_days: number;
  values: number[];
}

interface CampaignPerformance {
  campaign_name: string;
  spend: number;
  ftd: number;
  cost_per_ftd: number;
  roas: number;
  ctr: number;
  trend_7d: "up" | "down" | "stable";
  pct_of_total_spend: number;
}

// ─── Helpers ───

function safeDiv(a: number, b: number, fallback = 0): number {
  return b > 0 ? a / b : fallback;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function aggregateMetrics(rows: DailyMetricRow[]): PeriodMetrics {
  const agg: PeriodMetrics = {
    spend: 0, ftd: 0, cost_per_ftd: 0, roas: 0, ctr: 0, cpc: 0,
    impressions: 0, clicks: 0, revenue: 0, purchases: 0,
    registrations: 0, messages: 0, leads: 0,
  };
  for (const r of rows) {
    agg.spend += Number(r.spend) || 0;
    agg.impressions += Number(r.impressions) || 0;
    agg.clicks += Number(r.clicks) || 0;
    agg.revenue += Number(r.revenue) || 0;
    agg.ftd += Number(r.ftd) || Number(r.purchases) || 0;
    agg.purchases += Number(r.purchases) || 0;
    agg.registrations += Number(r.registrations) || 0;
    agg.messages += Number(r.messages) || 0;
    agg.leads += Number(r.leads) || 0;
  }
  agg.cost_per_ftd = safeDiv(agg.spend, agg.ftd);
  agg.roas = safeDiv(agg.revenue, agg.spend);
  agg.ctr = safeDiv(agg.clicks, agg.impressions) * 100;
  agg.cpc = safeDiv(agg.spend, agg.clicks);
  return agg;
}

function computeVariations(current: PeriodMetrics, previous: PeriodMetrics) {
  return {
    spend: pctChange(current.spend, previous.spend),
    ftd: pctChange(current.ftd, previous.ftd),
    cost_per_ftd: pctChange(current.cost_per_ftd, previous.cost_per_ftd),
    roas: pctChange(current.roas, previous.roas),
    ctr: pctChange(current.ctr, previous.ctr),
    cpc: pctChange(current.cpc, previous.cpc),
    impressions: pctChange(current.impressions, previous.impressions),
    clicks: pctChange(current.clicks, previous.clicks),
    revenue: pctChange(current.revenue, previous.revenue),
  };
}

// ─── Anomaly Detection ───

function detectAnomalies(
  campaigns: DailyCampaignRow[],
  recentDates: string[]
): Anomaly[] {
  // Group by campaign
  const byCampaign: Record<string, DailyCampaignRow[]> = {};
  for (const row of campaigns) {
    const key = row.campaign_name;
    if (!byCampaign[key]) byCampaign[key] = [];
    byCampaign[key].push(row);
  }

  const anomalies: Anomaly[] = [];
  const THRESHOLD = 30; // 30% deviation

  for (const [name, rows] of Object.entries(byCampaign)) {
    // Only check campaigns with enough data
    if (rows.length < 3) continue;

    for (const metric of ["spend", "ftd", "cost_per_ftd"] as const) {
      const values = rows.map((r) => {
        if (metric === "cost_per_ftd") {
          const ftd = Number(r.ftd) || Number(r.purchases) || 0;
          return ftd > 0 ? (Number(r.spend) || 0) / ftd : 0;
        }
        return Number((r as any)[metric]) || 0;
      });

      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      if (avg === 0) continue;

      // Check last day
      const lastRow = rows.find((r) => r.date === recentDates[0]);
      if (!lastRow) continue;

      let lastVal: number;
      if (metric === "cost_per_ftd") {
        const ftd = Number(lastRow.ftd) || Number(lastRow.purchases) || 0;
        lastVal = ftd > 0 ? (Number(lastRow.spend) || 0) / ftd : 0;
      } else {
        lastVal = Number((lastRow as any)[metric]) || 0;
      }

      const devPct = ((lastVal - avg) / avg) * 100;
      if (Math.abs(devPct) > THRESHOLD) {
        anomalies.push({
          campaign_name: name,
          metric,
          value: lastVal,
          average: avg,
          deviation_pct: devPct,
          type: devPct > 0 ? "spike" : "drop",
        });
      }
    }
  }

  // Limit to top 10 most severe
  anomalies.sort((a, b) => Math.abs(b.deviation_pct) - Math.abs(a.deviation_pct));
  return anomalies.slice(0, 10);
}

// ─── Declining Campaigns (3+ consecutive days of worsening) ───

function detectDeclining(campaigns: DailyCampaignRow[]): DecliningCampaign[] {
  const byCampaign: Record<string, DailyCampaignRow[]> = {};
  for (const row of campaigns) {
    if (!byCampaign[row.campaign_name]) byCampaign[row.campaign_name] = [];
    byCampaign[row.campaign_name].push(row);
  }

  const declining: DecliningCampaign[] = [];

  for (const [name, rows] of Object.entries(byCampaign)) {
    // Sort by date ascending
    rows.sort((a, b) => a.date.localeCompare(b.date));
    if (rows.length < 3) continue;

    // Check cost_per_ftd increasing for 3+ consecutive days
    const cpaValues: number[] = rows.map((r) => {
      const ftd = Number(r.ftd) || Number(r.purchases) || 0;
      return ftd > 0 ? (Number(r.spend) || 0) / ftd : 0;
    });

    let consecutive = 0;
    let maxConsecutive = 0;
    let declineValues: number[] = [];
    let tempValues: number[] = [];

    for (let i = 1; i < cpaValues.length; i++) {
      if (cpaValues[i] > cpaValues[i - 1] && cpaValues[i] > 0 && cpaValues[i - 1] > 0) {
        if (consecutive === 0) tempValues = [cpaValues[i - 1]];
        consecutive++;
        tempValues.push(cpaValues[i]);
        if (consecutive > maxConsecutive) {
          maxConsecutive = consecutive;
          declineValues = [...tempValues];
        }
      } else {
        consecutive = 0;
        tempValues = [];
      }
    }

    if (maxConsecutive >= 3) {
      declining.push({
        campaign_name: name,
        metric: "cost_per_ftd",
        consecutive_days: maxConsecutive,
        values: declineValues,
      });
    }
  }

  return declining.slice(0, 5);
}

// ─── Campaign Performance Summary ───

function buildCampaignPerformance(
  campaigns: DailyCampaignRow[],
  recentDates: string[],
  olderDates: string[]
): CampaignPerformance[] {
  // Aggregate by campaign name for current period
  const byCampaign: Record<string, { current: DailyCampaignRow[]; previous: DailyCampaignRow[] }> = {};

  for (const row of campaigns) {
    const key = row.campaign_name;
    if (!byCampaign[key]) byCampaign[key] = { current: [], previous: [] };
    if (recentDates.includes(row.date)) {
      byCampaign[key].current.push(row);
    } else if (olderDates.includes(row.date)) {
      byCampaign[key].previous.push(row);
    }
  }

  const totalSpend = Object.values(byCampaign).reduce((s, { current }) => {
    return s + current.reduce((ss, r) => ss + (Number(r.spend) || 0), 0);
  }, 0);

  const performances: CampaignPerformance[] = [];

  for (const [name, { current, previous }] of Object.entries(byCampaign)) {
    const spend = current.reduce((s, r) => s + (Number(r.spend) || 0), 0);
    const ftd = current.reduce((s, r) => s + (Number(r.ftd) || Number(r.purchases) || 0), 0);
    const revenue = current.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
    const impressions = current.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
    const clicks = current.reduce((s, r) => s + (Number(r.clicks) || 0), 0);

    const prevSpend = previous.reduce((s, r) => s + (Number(r.spend) || 0), 0);
    const prevFtd = previous.reduce((s, r) => s + (Number(r.ftd) || Number(r.purchases) || 0), 0);

    const currCpa = safeDiv(spend, ftd);
    const prevCpa = safeDiv(prevSpend, prevFtd);

    let trend: "up" | "down" | "stable" = "stable";
    if (prevCpa > 0 && currCpa > 0) {
      const cpaDiff = pctChange(currCpa, prevCpa);
      if (cpaDiff < -10) trend = "up"; // CPA dropping = improving
      else if (cpaDiff > 10) trend = "down"; // CPA rising = worsening
    }

    if (spend > 0) {
      performances.push({
        campaign_name: name,
        spend,
        ftd,
        cost_per_ftd: safeDiv(spend, ftd),
        roas: safeDiv(revenue, spend),
        ctr: safeDiv(clicks, impressions) * 100,
        trend_7d: trend,
        pct_of_total_spend: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
      });
    }
  }

  // Sort by spend desc
  performances.sort((a, b) => b.spend - a.spend);
  return performances;
}

// ─── Build Claude Prompt ───

function buildDeepPrompt(
  currentMetrics: PeriodMetrics,
  variations: ReturnType<typeof computeVariations>,
  campaignPerfs: CampaignPerformance[],
  anomalies: Anomaly[],
  declining: DecliningCampaign[],
): string {
  // Top 5 by spend % for budget distribution
  const topByBudget = campaignPerfs.slice(0, 5);

  // Campaign table
  const campaignTable = campaignPerfs
    .map((c) => {
      const trendSymbol = c.trend_7d === "up" ? "↑" : c.trend_7d === "down" ? "↓" : "→";
      return `  - ${c.campaign_name} | Spend: R$${fmt(c.spend)} | FTDs: ${c.ftd} | Cost/FTD: R$${fmt(c.cost_per_ftd)} | ROAS: ${fmt(c.roas)}x | CTR: ${fmt(c.ctr)}% | Trend: ${trendSymbol}`;
    })
    .join("\n");

  // Anomalies list
  const anomalyList = anomalies.length > 0
    ? anomalies
        .map((a) => {
          const dir = a.type === "spike" ? "PICO" : "QUEDA";
          return `  - [${dir}] ${a.campaign_name}: ${a.metric} = ${fmt(a.value)} (média: ${fmt(a.average)}, desvio: ${fmt(a.deviation_pct)}%)`;
        })
        .join("\n")
    : "  Nenhuma anomalia detectada.";

  // Declining list
  const decliningList = declining.length > 0
    ? declining
        .map((d) => `  - ${d.campaign_name}: ${d.metric} piorando há ${d.consecutive_days} dias consecutivos (valores: ${d.values.map((v) => `R$${fmt(v)}`).join(" → ")})`)
        .join("\n")
    : "  Nenhuma campanha em decadência.";

  // Budget distribution
  const budgetDist = topByBudget
    .map((c) => `  - ${c.campaign_name}: ${fmt(c.pct_of_total_spend)}% do budget total (R$${fmt(c.spend)})`)
    .join("\n");

  const sign = (v: number) => (v >= 0 ? "+" : "") + fmt(v) + "%";

  return `Você é um analista sênior de performance marketing especializado em iGaming/Betting.

DADOS DA CONTA (últimos 7 dias vs 7 dias anteriores):
  * Spend total: R$${fmt(currentMetrics.spend)} → variação: ${sign(variations.spend)}
  * FTDs totais: ${currentMetrics.ftd} → variação: ${sign(variations.ftd)}
  * Cost per FTD médio: R$${fmt(currentMetrics.cost_per_ftd)} → variação: ${sign(variations.cost_per_ftd)}
  * ROAS: ${fmt(currentMetrics.roas)}x → variação: ${sign(variations.roas)}
  * CTR médio: ${fmt(currentMetrics.ctr)}% → variação: ${sign(variations.ctr)}
  * CPC médio: R$${fmt(currentMetrics.cpc)} → variação: ${sign(variations.cpc)}

PERFORMANCE POR CAMPANHA (todas ativas):
${campaignTable || "  Sem dados de campanhas."}

ANOMALIAS DETECTADAS:
${anomalyList}

CAMPANHAS EM DECADÊNCIA (3+ dias de piora):
${decliningList}

DISTRIBUIÇÃO DE BUDGET:
${budgetDist || "  Sem dados."}

Analise esses dados e retorne um JSON com essa estrutura EXATA:
{
  "score": 1-10,
  "resumo": "2-3 frases resumindo o estado da conta",
  "alertas_criticos": [
    {
      "titulo": "string curto e direto",
      "descricao": "explicação com números concretos",
      "acao": "o que fazer AGORA, passo a passo",
      "impacto_estimado": "quanto pode economizar ou ganhar",
      "campanha": "nome da campanha afetada ou null se geral"
    }
  ],
  "oportunidades": [
    {
      "titulo": "string",
      "descricao": "com números",
      "acao": "passo a passo",
      "potencial": "estimativa de ganho",
      "campanha": "nome ou null"
    }
  ],
  "otimizacoes": [
    {
      "titulo": "string",
      "descricao": "com números",
      "acao": "passo a passo concreto",
      "prioridade": "alta|media|baixa",
      "campanha": "nome ou null"
    }
  ],
  "tendencia_7d": "melhorando|estavel|piorando",
  "previsao": "se manter esse ritmo, em 7 dias o cost_per_ftd vai para aproximadamente R$X"
}

REGRAS:
- Toda recomendação DEVE ter números concretos (R$, %, quantidade)
- Toda ação deve ser específica (não "otimize o público", mas "reduza a faixa etária de 18-65 para 25-45 e teste")
- Se uma campanha gastou mais de 3x o CPA target sem converter, recomende pausar
- Se ROAS < 1, é alerta crítico
- Se cost_per_ftd subiu > 20% semana contra semana, é alerta
- Máximo 3 alertas críticos, 3 oportunidades, 5 otimizações
- Responda APENAS com o JSON válido, sem markdown, sem explicação adicional`;
}

// ─── Call Anthropic ───

async function callAnthropic(prompt: string, anthropicKey: string): Promise<{ text: string; model: string }> {
  const primaryModel = "claude-sonnet-4-20250514";
  const fallbackModel = "claude-3-5-sonnet-20241022";

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": anthropicKey,
    "anthropic-version": "2023-06-01",
  };

  const body = JSON.stringify({
    model: primaryModel,
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  let res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body });
  let usedModel = primaryModel;

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic API Error:", errText);

    if (errText.includes("not_found")) {
      const fallbackBody = JSON.stringify({
        model: fallbackModel,
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      });
      res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: fallbackBody });
      usedModel = fallbackModel;
    }

    if (!res.ok) {
      const errText2 = await res.text();
      const isLowCredit = errText2.toLowerCase().includes("credit balance is too low");
      throw new Error(
        isLowCredit
          ? "Crédito da API de IA insuficiente. Confirme se a chave ANTHROPIC_API_KEY pertence à conta recarregada."
          : "Falha ao gerar análise com IA. Tente novamente em instantes."
      );
    }
  }

  const aiData = await res.json();
  return { text: aiData.content[0].text, model: usedModel };
}

// ─── Parse Claude Response ───

function parseAnalysisResponse(text: string): any {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Extract JSON from possible markdown wrapping
    const startObj = text.indexOf("{");
    const endObj = text.lastIndexOf("}") + 1;
    if (startObj !== -1 && endObj > startObj) {
      return JSON.parse(text.substring(startObj, endObj));
    }
    throw new Error("Resposta da IA não é JSON válido");
  }
}

// ─── Main Handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();
    if (!client_id) throw new Error("Missing client_id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("Missing Anthropic API Key");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── Role check ───
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1);
        const userRole = roles?.[0]?.role;
        if (userRole === "client") {
          return new Response(
            JSON.stringify({ error: "Acesso negado" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // ─── Date ranges: last 14 days split into two 7-day periods ───
    const now = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    const recentDates = dates.slice(0, 7);  // Last 7 days
    const olderDates = dates.slice(7, 14);   // Previous 7 days

    const startDate = dates[dates.length - 1];
    const endDate = dates[0];

    // ─── Fetch metrics from DB ───
    const { data: metricsData, error: metricsErr } = await supabase
      .from("daily_metrics")
      .select("date, platform, spend, impressions, clicks, conversions, revenue, ftd, cost_per_ftd, purchases, registrations, messages, leads")
      .eq("client_id", client_id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (metricsErr) throw metricsErr;

    if (!metricsData || metricsData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dados insuficientes para análise profunda (mínimo 1 dia de dados)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Fetch ALL campaigns from DB ───
    const { data: campaignData } = await supabase
      .from("daily_campaigns")
      .select("date, campaign_name, platform, spend, clicks, conversions, revenue, ftd, leads, messages, purchases")
      .eq("client_id", client_id)
      .gte("date", startDate)
      .lte("date", endDate);

    const campaigns = campaignData || [];

    // ─── Split metrics into two periods ───
    const currentRows = metricsData.filter((r: any) => recentDates.includes(r.date));
    const previousRows = metricsData.filter((r: any) => olderDates.includes(r.date));

    const currentMetrics = aggregateMetrics(currentRows);
    const previousMetrics = aggregateMetrics(previousRows);
    const variations = computeVariations(currentMetrics, previousMetrics);

    // ─── Campaign-level analysis ───
    const campaignPerfs = buildCampaignPerformance(campaigns, recentDates, olderDates);
    const anomalies = detectAnomalies(campaigns.filter((c: any) => recentDates.includes(c.date)), recentDates);
    const declining = detectDeclining(campaigns);

    // ─── Build and send prompt to Claude ───
    const prompt = buildDeepPrompt(currentMetrics, variations, campaignPerfs, anomalies, declining);
    console.log(`[deep-analysis] Sending prompt to Claude. Metrics rows: ${metricsData.length}, Campaigns: ${campaigns.length}`);

    const { text: aiText, model: usedModel } = await callAnthropic(prompt, anthropicKey);
    const parsed = parseAnalysisResponse(aiText);

    // ─── Validate response shape ───
    const score = Math.min(10, Math.max(1, Math.round(Number(parsed.score) || 5)));
    const tendencia = ["melhorando", "estavel", "piorando"].includes(parsed.tendencia_7d)
      ? parsed.tendencia_7d
      : "estavel";

    const report = {
      client_id,
      score,
      resumo: String(parsed.resumo || "Análise concluída."),
      tendencia,
      previsao: String(parsed.previsao || ""),
      alertas_criticos: Array.isArray(parsed.alertas_criticos) ? parsed.alertas_criticos.slice(0, 3) : [],
      oportunidades: Array.isArray(parsed.oportunidades) ? parsed.oportunidades.slice(0, 3) : [],
      otimizacoes: Array.isArray(parsed.otimizacoes) ? parsed.otimizacoes.slice(0, 5) : [],
      dados_periodo: {
        current: currentMetrics,
        previous: previousMetrics,
        variations,
        anomalies,
        declining_campaigns: declining,
      },
      modelo_ia: usedModel,
    };

    // ─── Save to analysis_reports ───
    const { data: savedReport, error: saveErr } = await supabase
      .from("analysis_reports")
      .insert(report)
      .select()
      .single();

    if (saveErr) {
      console.error("Failed to save analysis report:", saveErr);
      // Still return the analysis even if save fails
    }

    // ─── Also save key insights to optimization_tasks for backward compat ───
    const allInsights = [
      ...report.alertas_criticos.map((a: any) => ({
        title: a.titulo,
        description: a.descricao,
        priority: "high",
        type: "alert",
      })),
      ...report.oportunidades.map((o: any) => ({
        title: o.titulo,
        description: o.descricao,
        priority: "medium",
        type: "opportunity",
      })),
      ...report.otimizacoes.map((o: any) => ({
        title: o.titulo,
        description: o.descricao,
        priority: o.prioridade === "alta" ? "high" : o.prioridade === "media" ? "medium" : "low",
        type: "optimization",
      })),
    ];

    // Find client link for optimization_tasks
    const { data: link } = await supabase
      .from("client_manager_links")
      .select("id, client_user_id")
      .or(`client_user_id.eq.${client_id},id.eq.${client_id}`)
      .limit(1)
      .maybeSingle();

    if (link?.id) {
      const tasksToInsert = allInsights.map((insight: any) => ({
        client_id: link.id,
        title: insight.title,
        description: insight.description,
        status: "TODO",
        auto_generated: true,
      }));
      if (tasksToInsert.length > 0) {
        const { error: taskErr } = await supabase.from("optimization_tasks").insert(tasksToInsert);
        if (taskErr) console.error("Failed to insert optimization_tasks:", taskErr);
      }
    }

    console.log(`[deep-analysis] Done. Score: ${score}, Trend: ${tendencia}, Model: ${usedModel}`);

    return new Response(
      JSON.stringify({
        report: savedReport || { ...report, id: "unsaved", created_at: new Date().toISOString() },
        // Backward compat
        insights: allInsights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[deep-analysis] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
