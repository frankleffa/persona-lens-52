import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ───

interface AnalysisConfig {
    vertical: string;
    primary_metric: string;
    primary_metric_label: string;
    cpa_target: number | null;
    roas_target: number | null;
    monthly_budget: number | null;
    notes: string | null;
}

interface PeriodMetrics {
    spend: number;
    primary_metric_total: number;
    cost_per_primary: number;
    revenue: number;
    roas: number;
    clicks: number;
    impressions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    registrations: number;
    ftd: number;
}

interface CampaignAgg {
    campaign_name: string;
    external_campaign_id: string | null;
    platform: string | null;
    campaign_status: string | null;
    spend: number;
    primary_metric_total: number;
    cost_per_primary: number;
    roas: number;
    clicks: number;
    revenue: number;
    registrations: number;
    ftd: number;
    trend_3d: string; // "melhorando" | "estável" | "piorando"
    daily_data: { date: string; primary: number; spend: number }[];
}

interface Anomaly {
    type: string;
    description: string;
}

interface DecayingCampaign {
    campaign_name: string;
    description: string;
}

const VERTICAL_LABELS: Record<string, string> = {
    ecommerce: "E-commerce",
    igaming: "iGaming / Apostas",
    infoproduto: "Infoproduto / Lançamento",
    leadgen: "Geração de Leads",
    servicos: "Serviços / Mensagens",
    saas: "SaaS",
    app: "Aplicativo Mobile",
};

const DEFAULT_CONFIG: AnalysisConfig = {
    vertical: "ecommerce",
    primary_metric: "purchases",
    primary_metric_label: "Compras",
    cpa_target: null,
    roas_target: null,
    monthly_budget: null,
    notes: null,
};

// ─── Helpers ───

function fmt(n: number, decimals = 2): string {
    return n.toFixed(decimals);
}

function pctChange(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? "+∞" : "N/A";
    const pct = ((current - previous) / previous) * 100;
    return (pct >= 0 ? "+" : "") + fmt(pct, 1);
}

function getPrimaryMetricValue(row: any, primaryMetric: string): number {
    const val = Number(row[primaryMetric]) || 0;
    return val;
}

// ─── Calculate consolidated metrics for a set of daily_metrics rows ───

function consolidateMetrics(rows: any[], primaryMetric: string): PeriodMetrics {
    let spend = 0, revenue = 0, clicks = 0, impressions = 0, primaryTotal = 0;
    let registrations = 0, ftd = 0;

    for (const row of rows) {
        spend += Number(row.spend) || 0;
        revenue += Number(row.revenue) || 0;
        clicks += Number(row.clicks) || 0;
        impressions += Number(row.impressions) || 0;
        primaryTotal += getPrimaryMetricValue(row, primaryMetric);
        registrations += Number(row.registrations) || 0;
        ftd += Number(row.ftd) || 0;
    }

    return {
        spend,
        primary_metric_total: primaryTotal,
        cost_per_primary: primaryTotal > 0 ? spend / primaryTotal : 0,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        clicks,
        impressions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        registrations,
        ftd,
    };
}

// ─── Campaign aggregation ───

function aggregateCampaigns(
    campaignRows: any[],
    primaryMetric: string,
    periodDays: number,
): CampaignAgg[] {
    const map: Record<string, CampaignAgg> = {};

    for (const row of campaignRows) {
        const name = row.campaign_name;
        if (!map[name]) {
            map[name] = {
                campaign_name: name,
                external_campaign_id: row.external_campaign_id || null,
                platform: row.platform || null,
                campaign_status: row.campaign_status || null,
                spend: 0,
                primary_metric_total: 0,
                cost_per_primary: 0,
                roas: 0,
                clicks: 0,
                revenue: 0,
                registrations: 0,
                ftd: 0,
                trend_3d: "estável",
                daily_data: [],
            };
        }
        map[name].spend += Number(row.spend) || 0;
        map[name].clicks += Number(row.clicks) || 0;
        map[name].revenue += Number(row.revenue) || 0;
        map[name].registrations += Number(row.registrations) || 0;
        map[name].ftd += Number(row.ftd) || 0;
        map[name].primary_metric_total += getPrimaryMetricValue(row, primaryMetric);
        map[name].daily_data.push({
            date: row.date,
            primary: getPrimaryMetricValue(row, primaryMetric),
            spend: Number(row.spend) || 0,
        });
    }

    const campaigns = Object.values(map);

    for (const camp of campaigns) {
        camp.cost_per_primary = camp.primary_metric_total > 0
            ? camp.spend / camp.primary_metric_total
            : 0;
        camp.roas = camp.spend > 0 ? camp.revenue / camp.spend : 0;

        // Calculate 3-day trend: compare last 3 days vs previous 3 days
        const sorted = camp.daily_data.sort((a, b) => a.date.localeCompare(b.date));
        if (sorted.length >= 6) {
            const recent3 = sorted.slice(-3);
            const prev3 = sorted.slice(-6, -3);
            const recentPrimary = recent3.reduce((s, d) => s + d.primary, 0);
            const prevPrimary = prev3.reduce((s, d) => s + d.primary, 0);

            if (prevPrimary > 0) {
                const change = ((recentPrimary - prevPrimary) / prevPrimary) * 100;
                if (change > 10) camp.trend_3d = "melhorando";
                else if (change < -10) camp.trend_3d = "piorando";
                else camp.trend_3d = "estável";
            }
        } else if (sorted.length >= 3) {
            // Only have 3+ days but less than 6
            const half = Math.floor(sorted.length / 2);
            const recent = sorted.slice(half);
            const prev = sorted.slice(0, half);
            const recentPrimary = recent.reduce((s, d) => s + d.primary, 0);
            const prevPrimary = prev.reduce((s, d) => s + d.primary, 0);

            if (prevPrimary > 0) {
                const change = ((recentPrimary - prevPrimary) / prevPrimary) * 100;
                if (change > 10) camp.trend_3d = "melhorando";
                else if (change < -10) camp.trend_3d = "piorando";
                else camp.trend_3d = "estável";
            }
        }
    }

    // Sort by spend descending
    campaigns.sort((a, b) => b.spend - a.spend);
    return campaigns;
}

// ─── Anomaly Detection ───

function detectAnomalies(
    dailyMetrics: any[],
    primaryMetric: string,
    config: AnalysisConfig
): Anomaly[] {
    const anomalies: Anomaly[] = [];
    if (dailyMetrics.length < 3) return anomalies;

    const sorted = [...dailyMetrics].sort((a, b) =>
        (a.date as string).localeCompare(b.date as string)
    );
    const lastDay = sorted[sorted.length - 1];

    // Build arrays for each metric across all days
    const spendArr = sorted.map(r => Number(r.spend) || 0);
    const primaryArr = sorted.map(r => getPrimaryMetricValue(r, primaryMetric));
    const clicksArr = sorted.map(r => Number(r.clicks) || 0);
    const impressionsArr = sorted.map(r => Number(r.impressions) || 0);

    function mean(arr: number[]): number {
        return arr.reduce((s, v) => s + v, 0) / arr.length;
    }
    function stddev(arr: number[]): number {
        const m = mean(arr);
        const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
        return Math.sqrt(variance);
    }

    // Check spend spike
    const spendMean = mean(spendArr);
    const spendStd = stddev(spendArr);
    const lastSpend = Number(lastDay.spend) || 0;
    if (spendStd > 0 && Math.abs(lastSpend - spendMean) > 1.5 * spendStd) {
        anomalies.push({
            type: "pico_spend",
            description: `Investimento no último dia (R$ ${fmt(lastSpend)}) desviou significativamente da média (R$ ${fmt(spendMean)} ± R$ ${fmt(spendStd)})`,
        });
    }

    // Check primary metric drop
    const primaryMean = mean(primaryArr);
    const primaryStd = stddev(primaryArr);
    const lastPrimary = getPrimaryMetricValue(lastDay, primaryMetric);
    if (primaryStd > 0 && (primaryMean - lastPrimary) > 1.5 * primaryStd) {
        anomalies.push({
            type: "queda_conversoes",
            description: `${config.primary_metric_label} no último dia (${lastPrimary}) caiu significativamente vs média (${fmt(primaryMean, 1)} ± ${fmt(primaryStd, 1)})`,
        });
    }

    // Check CPA spike
    const cpaArr = sorted.map(r => {
        const p = getPrimaryMetricValue(r, primaryMetric);
        const s = Number(r.spend) || 0;
        return p > 0 ? s / p : 0;
    }).filter(v => v > 0);

    if (cpaArr.length >= 3) {
        const cpaMean = mean(cpaArr);
        const cpaStd = stddev(cpaArr);
        const lastCpa = lastPrimary > 0 ? lastSpend / lastPrimary : 0;
        if (cpaStd > 0 && lastCpa > 0 && (lastCpa - cpaMean) > 1.5 * cpaStd) {
            anomalies.push({
                type: "cpa_disparou",
                description: `Custo por ${config.primary_metric_label} no último dia (R$ ${fmt(lastCpa)}) disparou vs média (R$ ${fmt(cpaMean)} ± R$ ${fmt(cpaStd)})`,
            });
        }
    }

    // Check CTR drop
    const ctrArr = sorted.map(r => {
        const imp = Number(r.impressions) || 0;
        const clk = Number(r.clicks) || 0;
        return imp > 0 ? (clk / imp) * 100 : 0;
    }).filter(v => v > 0);

    if (ctrArr.length >= 3) {
        const ctrMean = mean(ctrArr);
        const ctrStd = stddev(ctrArr);
        const lastImp = Number(lastDay.impressions) || 0;
        const lastClk = Number(lastDay.clicks) || 0;
        const lastCtr = lastImp > 0 ? (lastClk / lastImp) * 100 : 0;
        if (ctrStd > 0 && lastCtr > 0 && (ctrMean - lastCtr) > 1.5 * ctrStd) {
            anomalies.push({
                type: "ctr_caiu",
                description: `CTR no último dia (${fmt(lastCtr)}%) caiu significativamente vs média (${fmt(ctrMean)}% ± ${fmt(ctrStd)}%)`,
            });
        }
    }

    // Check ROAS < 1
    const lastRevenue = Number(lastDay.revenue) || 0;
    if (lastSpend > 0 && lastRevenue / lastSpend < 1) {
        anomalies.push({
            type: "roas_negativo",
            description: `ROAS no último dia (${fmt(lastRevenue / lastSpend)}x) está abaixo de 1.0x — investimento não se paga`,
        });
    }

    return anomalies;
}

// ─── Decaying Campaigns ───

function detectDecayingCampaigns(
    campaignRows: any[],
    primaryMetric: string,
    config: AnalysisConfig
): DecayingCampaign[] {
    const decaying: DecayingCampaign[] = [];

    // Group by campaign
    const campMap: Record<string, any[]> = {};
    for (const row of campaignRows) {
        const name = row.campaign_name;
        if (!campMap[name]) campMap[name] = [];
        campMap[name].push(row);
    }

    for (const [name, rows] of Object.entries(campMap)) {
        const sorted = rows.sort((a, b) =>
            (a.date as string).localeCompare(b.date as string)
        );

        if (sorted.length < 4) continue;

        // Check consecutive days of primary metric decrease
        let consecutiveDecline = 0;
        let maxConsecutiveDecline = 0;

        for (let i = 1; i < sorted.length; i++) {
            const prevPrimary = getPrimaryMetricValue(sorted[i - 1], primaryMetric);
            const currPrimary = getPrimaryMetricValue(sorted[i], primaryMetric);

            if (currPrimary < prevPrimary) {
                consecutiveDecline++;
                maxConsecutiveDecline = Math.max(maxConsecutiveDecline, consecutiveDecline);
            } else {
                consecutiveDecline = 0;
            }
        }

        // Check consecutive days of CPA increase
        let consecutiveCpaIncrease = 0;
        let maxCpaIncrease = 0;

        for (let i = 1; i < sorted.length; i++) {
            const prevP = getPrimaryMetricValue(sorted[i - 1], primaryMetric);
            const currP = getPrimaryMetricValue(sorted[i], primaryMetric);
            const prevS = Number(sorted[i - 1].spend) || 0;
            const currS = Number(sorted[i].spend) || 0;
            const prevCpa = prevP > 0 ? prevS / prevP : 0;
            const currCpa = currP > 0 ? currS / currP : 0;

            if (currCpa > prevCpa && currCpa > 0 && prevCpa > 0) {
                consecutiveCpaIncrease++;
                maxCpaIncrease = Math.max(maxCpaIncrease, consecutiveCpaIncrease);
            } else {
                consecutiveCpaIncrease = 0;
            }
        }

        if (maxConsecutiveDecline >= 3) {
            decaying.push({
                campaign_name: name,
                description: `${maxConsecutiveDecline} dias consecutivos de queda em ${config.primary_metric_label}`,
            });
        } else if (maxCpaIncrease >= 3) {
            decaying.push({
                campaign_name: name,
                description: `${maxCpaIncrease} dias consecutivos de aumento no custo por ${config.primary_metric_label}`,
            });
        }
    }

    return decaying;
}

// ─── Build Dynamic Prompt ───

function buildDeepPrompt(
    config: AnalysisConfig,
    current: PeriodMetrics,
    previous: PeriodMetrics,
    campaigns: CampaignAgg[],
    anomalies: Anomaly[],
    decaying: DecayingCampaign[]
): string {
    const spendPct = pctChange(current.spend, previous.spend);
    const primaryPct = pctChange(current.primary_metric_total, previous.primary_metric_total);
    const cppPct = pctChange(current.cost_per_primary, previous.cost_per_primary);
    const roasPct = pctChange(current.roas, previous.roas);
    const ctrPct = pctChange(current.ctr, previous.ctr);
    const cpcPct = pctChange(current.cpc, previous.cpc);

    // Campaign rows table
    const campaignRows = campaigns.map(c =>
        `| ${c.campaign_name} | ${c.external_campaign_id || "N/A"} | ${c.platform || "?"} | ${c.campaign_status || "?"} | R$ ${fmt(c.spend)} | ${c.primary_metric_total} | R$ ${fmt(c.cost_per_primary)} | ${fmt(c.roas)}x | ${c.clicks} | ${c.trend_3d} |`
    ).join("\n");

    // Budget distribution
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const top5 = campaigns.slice(0, 5);
    const top5Distribution = top5.map(c => {
        const pct = totalSpend > 0 ? ((c.spend / totalSpend) * 100).toFixed(1) : "0";
        return `- ${c.campaign_name}: R$ ${fmt(c.spend)} (${pct}%)`;
    }).join("\n");

    // CPA/ROAS status lines
    const cpaStatusLine = config.cpa_target
        ? `- STATUS CPA: Atual R$ ${fmt(current.cost_per_primary)} vs Alvo R$ ${config.cpa_target} → ${current.cost_per_primary > config.cpa_target ? "⚠️ ACIMA do target" : "✅ DENTRO do target"}`
        : "";
    const roasStatusLine = config.roas_target
        ? `- STATUS ROAS: Atual ${fmt(current.roas)}x vs Alvo ${config.roas_target}x → ${current.roas < config.roas_target ? "⚠️ ABAIXO do target" : "✅ ATINGIDO"}`
        : "";

    // Funnel section: Registrations → FTD (especially for iGaming)
    const totalRegs = current.registrations;
    const totalFtd = current.ftd;
    const regToFtdRate = totalRegs > 0 ? ((totalFtd / totalRegs) * 100) : 0;
    const costPerReg = totalRegs > 0 ? current.spend / totalRegs : 0;
    const costPerFtd = totalFtd > 0 ? current.spend / totalFtd : 0;

    const prevRegToFtdRate = previous.registrations > 0 ? ((previous.ftd / previous.registrations) * 100) : 0;

    const hasFunnelData = totalRegs > 0 || totalFtd > 0;

    // Campaign-level funnel table
    const campaignsWithFunnel = campaigns.filter(c => c.registrations > 0 || c.ftd > 0);
    const funnelCampaignRows = campaignsWithFunnel.map(c => {
        const rate = c.registrations > 0 ? ((c.ftd / c.registrations) * 100).toFixed(1) : "N/A";
        const cpReg = c.registrations > 0 ? fmt(c.spend / c.registrations) : "N/A";
        const cpFtd = c.ftd > 0 ? fmt(c.spend / c.ftd) : "N/A";
        return `| ${c.campaign_name} | ${c.registrations} | ${c.ftd} | ${rate}% | R$ ${cpReg} | R$ ${cpFtd} |`;
    }).join("\n");

    const funnelSection = hasFunnelData ? `FUNIL CADASTRO → DEPÓSITO (FTD):
- Cadastros (Registrations): ${totalRegs} (anterior: ${previous.registrations})
- FTDs (Depósitos): ${totalFtd} (anterior: ${previous.ftd})
- Taxa de conversão Cadastro→FTD: ${fmt(regToFtdRate, 1)}% (anterior: ${fmt(prevRegToFtdRate, 1)}%)
- Custo por Cadastro: R$ ${fmt(costPerReg)}
- Custo por FTD: R$ ${fmt(costPerFtd)}

${funnelCampaignRows ? `POR CAMPANHA (Funil Cadastro→FTD):
| Campanha | Cadastros | FTDs | Conv. Reg→FTD | Custo/Cadastro | Custo/FTD |
|---|---|---|---|---|---|
${funnelCampaignRows}` : ""}

INSTRUÇÃO ESPECIAL FUNIL: Identifique campanhas onde a taxa de conversão cadastro→depósito está muito abaixo da média (${fmt(regToFtdRate, 1)}%). Investigue possíveis causas: qualidade do tráfego, público-alvo inadequado, criativo desalinhado, landing page com fricção, ou problemas no fluxo de cadastro/depósito.` : "";

    return `Você é um analista sênior de performance marketing digital.

PERFIL DO CLIENTE:
- Vertical: ${VERTICAL_LABELS[config.vertical] || config.vertical}
- Métrica principal: ${config.primary_metric_label} (campo: ${config.primary_metric})
${config.cpa_target ? "- CPA alvo: R$ " + config.cpa_target : "- CPA alvo: Não definido"}
${config.roas_target ? "- ROAS alvo: " + config.roas_target + "x" : "- ROAS alvo: Não definido"}
${config.monthly_budget ? "- Budget mensal planejado: R$ " + config.monthly_budget : ""}
${config.notes ? "- Contexto adicional: " + config.notes : ""}

DADOS DA CONTA — Últimos 7 dias vs 7 dias anteriores:
- Investimento: R$ ${fmt(current.spend)} → variação: ${spendPct}%
- ${config.primary_metric_label}: ${current.primary_metric_total} → variação: ${primaryPct}%
- Custo por ${config.primary_metric_label}: R$ ${fmt(current.cost_per_primary)} → variação: ${cppPct}%
- ROAS: ${fmt(current.roas)}x → variação: ${roasPct}%
- CTR: ${fmt(current.ctr)}% → variação: ${ctrPct}%
- CPC: R$ ${fmt(current.cpc)} → variação: ${cpcPct}%
${cpaStatusLine}
${roasStatusLine}

PERFORMANCE POR CAMPANHA (todas ativas no período):
| Campanha | ID Externo | Plataforma | Status | Invest. | ${config.primary_metric_label} | Custo/${config.primary_metric_label} | ROAS | Clicks | Tend.3d |
|---|---|---|---|---|---|---|---|---|---|
${campaignRows || "| Sem dados | - | - | - | - | - | - | - | - | - |"}

${funnelSection}

ANOMALIAS DETECTADAS AUTOMATICAMENTE:
${anomalies.length > 0 ? anomalies.map(a => "- " + a.description).join("\n") : "- Nenhuma anomalia significativa detectada"}

CAMPANHAS EM DECADÊNCIA (3+ dias de piora consecutiva):
${decaying.length > 0 ? decaying.map(c => "- " + c.campaign_name + ": " + c.description).join("\n") : "- Nenhuma campanha em decadência"}

DISTRIBUIÇÃO DE BUDGET:
${top5Distribution || "- Sem dados de distribuição"}

Analise esses dados considerando que o vertical é ${VERTICAL_LABELS[config.vertical] || config.vertical} e a métrica mais importante é ${config.primary_metric_label}.

Adapte suas recomendações para esse vertical:
- Para e-commerce: foque em ROAS, ticket médio, taxa de conversão, sazonalidade
- Para iGaming: foque em Cost per FTD, volume de FTDs, taxa de conversão cadastro→depósito, e identifique campanhas com alta discrepância entre registrations e FTDs
- Para infoproduto: foque em CPL, taxa de conversão da LP, ROI do lançamento
- Para lead gen: foque em CPL, volume e qualidade de leads
- Para serviços: foque em custo por mensagem/lead, taxa de resposta
- Para SaaS: foque em CAC, registrations, trial-to-paid
- Para app: foque em CPI, registrations, retenção D1/D7

Retorne APENAS um JSON válido (sem markdown, sem backticks, sem texto antes ou depois) com essa estrutura EXATA:
{
  "score": (número inteiro de 1 a 10 — nota geral da conta),
  "resumo": "(2-3 frases em português resumindo o estado geral da conta com números)",
  "alertas_criticos": [
    {
      "titulo": "(frase curta e direta em português)",
      "descricao": "(explicação com números concretos em R$, % e quantidades)",
      "acao": "(o que fazer AGORA — passo a passo específico, não genérico)",
      "impacto_estimado": "(quanto pode economizar ou ganhar em R$ ou %)",
      "campanha": "(nome da campanha afetada ou null se geral)",
      "external_campaign_id": "(ID externo da campanha afetada ou null se geral)",
      "platform": "(meta ou google — plataforma da campanha)"
    }
  ],
  "oportunidades": [
    {
      "titulo": "(string)",
      "descricao": "(com números)",
      "acao": "(passo a passo concreto)",
      "potencial": "(estimativa de ganho em R$ ou %)",
      "campanha": "(nome ou null)",
      "external_campaign_id": "(ID externo ou null)",
      "platform": "(meta ou google ou null)"
    }
  ],
  "otimizacoes": [
    {
      "titulo": "(string)",
      "descricao": "(com números)",
      "acao": "(passo a passo concreto e específico)",
      "prioridade": "(alta|media|baixa)",
      "campanha": "(nome ou null)",
      "external_campaign_id": "(ID externo ou null)",
      "platform": "(meta ou google ou null)"
    }
  ],
  "plano_acao": [
    {
      "etapa": "(nome da etapa do funil, ex: 'Impressão → Clique', 'Clique → Cadastro', 'Cadastro → FTD', 'Budget e Escala')",
      "diagnostico": "(1-2 frases descrevendo o estado atual dessa etapa com números exatos)",
      "status": "(critico|atencao|saudavel)",
      "taxa_atual": "(taxa de conversão atual dessa etapa, ex: '1.5%')",
      "benchmark": "(referência de benchmark para essa etapa)",
      "acoes": [
        "(ação específica 1 com detalhes de COMO executar)",
        "(ação específica 2 com detalhes de COMO executar)",
        "(ação específica 3 com detalhes de COMO executar)"
      ]
    }
  ],
  "tendencia_7d": "(melhorando|estavel|piorando)",
  "previsao": "(se manter esse ritmo, em 7 dias o custo por ${config.primary_metric_label} vai para aproximadamente R$ X e o volume será Y)"
}

REGRAS OBRIGATÓRIAS:
- TODA recomendação DEVE ter números concretos (R$, %, quantidade)
- TODA ação deve ser específica (não "otimize o público", mas "reduza a faixa etária de 18-65 para 25-45 na campanha X")
- Se uma campanha gastou mais de 3x o CPA target sem converter, recomende pausar
- Se ROAS < 1, é alerta crítico obrigatório
- Se custo por ${config.primary_metric_label} subiu > 20% semana contra semana, é alerta
- Se há campanha em decadência há 3+ dias, recomende ação
- Máximo: 3 alertas críticos, 3 oportunidades, 5 otimizações
- Gere 3 a 5 itens em plano_acao cobrindo TODO o funil
- plano_acao.acoes devem ser ESPECÍFICAS e ACIONÁVEIS — não conselhos genéricos. Inclua O QUE mudar, COMO mudar e o impacto esperado
- Todos os textos em português brasileiro`;
}

// ─── Call Lovable AI Gateway ───

async function callLovableAI(prompt: string, apiKey: string): Promise<{ text: string; model: string }> {
    const MODEL = "google/gemini-2.5-flash";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: "user", content: prompt }],
                stream: false,
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("[deep-analysis] AI Gateway error:", res.status, errText);
            if (res.status === 429) {
                throw new Error("Limite de requisições atingido. Aguarde alguns segundos e tente novamente.");
            }
            if (res.status === 402) {
                throw new Error("Créditos de IA insuficientes. Adicione créditos no workspace.");
            }
            throw new Error(`AI Gateway retornou status ${res.status}`);
        }

        const aiData = await res.json();
        const text = aiData.choices?.[0]?.message?.content;
        if (!text) throw new Error("Resposta vazia da IA.");
        return { text, model: MODEL };
    } finally {
        clearTimeout(timeout);
    }
}

// ─── Parse AI JSON response ───

function parseAIResponse(text: string): any {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```\s*$/i, "").trim();

    // Try direct parse first
    try {
        return JSON.parse(cleaned);
    } catch {
        // Try extracting JSON object with regex
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                console.error("[deep-analysis] Failed to parse extracted JSON:", jsonMatch[0].substring(0, 200));
                throw new Error("Resposta da IA não é JSON válido");
            }
        }
        console.error("[deep-analysis] No JSON found in response:", cleaned.substring(0, 200));
        throw new Error("Resposta da IA não contém JSON");
    }
}

// ─── Main handler ───

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { client_id, days = 14 } = await req.json();
        if (!client_id) throw new Error("Missing client_id");

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableApiKey) throw new Error("Missing LOVABLE_API_KEY");

        const supabase = createClient(supabaseUrl, supabaseKey);

        // ─── 1. AUTENTICAÇÃO ───
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Não autorizado" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (!user) {
            return new Response(
                JSON.stringify({ error: "Token inválido" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check role — only managers/admins
        const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .limit(1);

        const userRole = roles?.[0]?.role;
        if (userRole === "client") {
            return new Response(
                JSON.stringify({ error: "Acesso negado. Apenas gestores e admins podem usar análise profunda." }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify user is manager of this client
        const { data: managerLink } = await supabase
            .from("client_manager_links")
            .select("id, client_user_id, manager_id")
            .or(`client_user_id.eq.${client_id},id.eq.${client_id}`)
            .eq("manager_id", user.id)
            .limit(1)
            .maybeSingle();

        const isAdmin = userRole === "admin";
        if (!managerLink && !isAdmin) {
            return new Response(
                JSON.stringify({ error: "Você não gerencia este cliente." }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─── 2. BUSCAR CONFIG DO CLIENTE ───
        const { data: configData } = await supabase
            .from("client_analysis_config")
            .select("*")
            .eq("client_id", client_id)
            .maybeSingle();

        const config: AnalysisConfig = configData
            ? {
                vertical: configData.vertical || DEFAULT_CONFIG.vertical,
                primary_metric: configData.primary_metric || DEFAULT_CONFIG.primary_metric,
                primary_metric_label: configData.primary_metric_label || DEFAULT_CONFIG.primary_metric_label,
                cpa_target: configData.cpa_target,
                roas_target: configData.roas_target,
                monthly_budget: configData.monthly_budget,
                notes: configData.notes,
            }
            : { ...DEFAULT_CONFIG };

        console.log(`[deep-analysis] Client: ${client_id}, Vertical: ${config.vertical}, Primary: ${config.primary_metric}`);

        // ─── 3. BUSCAR DADOS (14 dias) ───
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 14);
        const endDateStr = endDate.toISOString().split("T")[0];
        const startDateStr = startDate.toISOString().split("T")[0];

        // Split point: 7 days ago
        const splitDate = new Date();
        splitDate.setDate(endDate.getDate() - 7);
        const splitDateStr = splitDate.toISOString().split("T")[0];

        // Fetch daily_metrics
        const { data: allMetrics, error: metricsErr } = await supabase
            .from("daily_metrics")
            .select("*")
            .eq("client_id", client_id)
            .gte("date", startDateStr)
            .lte("date", endDateStr)
            .order("date", { ascending: true });

        if (metricsErr) throw metricsErr;

        if (!allMetrics || allMetrics.length < 3) {
            return new Response(
                JSON.stringify({
                    error: "Dados insuficientes para análise profunda. Aguarde pelo menos 3 dias de coleta.",
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch daily_campaigns
        const { data: allCampaigns } = await supabase
            .from("daily_campaigns")
            .select("*")
            .eq("client_id", client_id)
            .gte("date", startDateStr)
            .lte("date", endDateStr)
            .order("date", { ascending: true });

        // ─── 4. SEPARAR PERÍODOS ───
        const currentMetrics = allMetrics.filter((r: any) => r.date >= splitDateStr);
        const previousMetrics = allMetrics.filter((r: any) => r.date < splitDateStr);

        const currentCampaigns = (allCampaigns || []).filter((r: any) => r.date >= splitDateStr);
        const previousCampaigns = (allCampaigns || []).filter((r: any) => r.date < splitDateStr);

        // ─── 5. CALCULAR MÉTRICAS CONSOLIDADAS ───
        const current = consolidateMetrics(currentMetrics, config.primary_metric);
        const previous = consolidateMetrics(previousMetrics, config.primary_metric);

        // ─── 6. ANÁLISE POR CAMPANHA (período atual) ───
        const campaignAnalysis = aggregateCampaigns(currentCampaigns, config.primary_metric, 7);

        // ─── 7. DETECÇÃO DE ANOMALIAS ───
        const anomalies = detectAnomalies(allMetrics, config.primary_metric, config);

        // ─── 8. CAMPANHAS EM DECADÊNCIA ───
        const decayingCampaigns = detectDecayingCampaigns(
            allCampaigns || [],
            config.primary_metric,
            config
        );

        // ─── 9. MONTAR PROMPT ───
        const prompt = buildDeepPrompt(config, current, previous, campaignAnalysis, anomalies, decayingCampaigns);

        console.log(`[deep-analysis] Prompt built. Metrics days: ${allMetrics.length}, Campaigns: ${campaignAnalysis.length}, Anomalies: ${anomalies.length}, Decaying: ${decayingCampaigns.length}`);

        // ─── 10. CHAMAR ANTHROPIC CLAUDE ───
        const { text: aiText, model: usedModel } = await callAnthropic(prompt, anthropicApiKey);

        // ─── 11. PARSE RESPOSTA ───
        const parsed = parseAIResponse(aiText);

        // ─── 12. SALVAR EM analysis_reports ───
        const reportData = {
            client_id,
            score: parsed.score,
            resumo: parsed.resumo,
            alertas_criticos: parsed.alertas_criticos || [],
            oportunidades: parsed.oportunidades || [],
            otimizacoes: parsed.otimizacoes || [],
            tendencia_7d: parsed.tendencia_7d,
            previsao: parsed.previsao,
            dados_periodo: {
                current,
                previous,
                total_days: allMetrics.length,
                campaigns_count: campaignAnalysis.length,
                anomalies_count: anomalies.length,
                decaying_count: decayingCampaigns.length,
            },
            modelo_ia: usedModel,
            vertical_usado: config.vertical,
            metrica_primaria_usada: config.primary_metric,
            anomalias: anomalies.map(a => ({ type: a.type, description: a.description })),
            campanhas_decadencia: decayingCampaigns.map(d => ({ campaign_name: d.campaign_name, description: d.description })),
            plano_acao: parsed.plano_acao || [],
        };

        const { error: reportErr } = await supabase.from("analysis_reports").insert(reportData);
        if (reportErr) console.error("[deep-analysis] Failed to save report:", reportErr);

        // ─── 13. SALVAR OTIMIZAÇÕES (backward compatibility) ───
        if (parsed.otimizacoes && parsed.otimizacoes.length > 0) {
            // Resolve client_id for optimization_tasks (references client_manager_links.id)
            let taskClientId: string | null = null;

            const { data: linkById } = await supabase
                .from("client_manager_links")
                .select("id")
                .eq("id", client_id)
                .maybeSingle();

            taskClientId = linkById?.id ?? null;

            if (!taskClientId) {
                const { data: linkByUserId } = await supabase
                    .from("client_manager_links")
                    .select("id")
                    .eq("client_user_id", client_id)
                    .limit(1)
                    .maybeSingle();
                taskClientId = linkByUserId?.id ?? null;
            }

            if (taskClientId) {
                const tasksToInsert = parsed.otimizacoes.map((opt: any) => ({
                    client_id: taskClientId,
                    title: opt.titulo,
                    description: `${opt.descricao}\n\nAção: ${opt.acao}\nPrioridade: ${opt.prioridade}${opt.campanha ? "\nCampanha: " + opt.campanha : ""}`,
                    status: "TODO",
                    auto_generated: true,
                }));

                const { error: tasksErr } = await supabase.from("optimization_tasks").insert(tasksToInsert);
                if (tasksErr) console.error("[deep-analysis] Failed to insert tasks:", tasksErr);
            } else {
                console.warn(`[deep-analysis] Skipping optimization_tasks: no matching link for client_id=${client_id}`);
            }
        }

        // ─── 14. RETORNAR RESPOSTA ───
        return new Response(
            JSON.stringify({
                ...parsed,
                anomalias: anomalies,
                campanhas_decadencia: decayingCampaigns,
                dados_periodo: reportData.dados_periodo,
                modelo_ia: usedModel,
                vertical_usado: config.vertical,
                metrica_primaria_usada: config.primary_metric,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        console.error("[deep-analysis] Error:", error);

        const isTimeout = error.name === "AbortError";
        const message = isTimeout
            ? "Análise demorou mais que o esperado. Tente novamente em instantes."
            : error.message || "Erro interno na análise";

        return new Response(
            JSON.stringify({ error: message }),
            {
                status: isTimeout ? 504 : 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
