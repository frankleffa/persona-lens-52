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

// ─── Benchmarks (numeric ranges for programmatic tagging) ───

interface BenchRange {
    excellent: number;
    good: number;
    higherIsBetter: boolean;
    unit: string;
}

const VERTICAL_BENCHMARKS: Record<string, Record<string, BenchRange>> = {
    ecommerce: {
        ctr: { excellent: 2, good: 1, higherIsBetter: true, unit: "%" },
        roas: { excellent: 3, good: 2, higherIsBetter: true, unit: "x" },
    },
    igaming: {
        ctr: { excellent: 1.5, good: 0.8, higherIsBetter: true, unit: "%" },
        reg_to_ftd: { excellent: 20, good: 10, higherIsBetter: true, unit: "%" },
    },
    leadgen: {
        ctr: { excellent: 1.5, good: 0.8, higherIsBetter: true, unit: "%" },
    },
    servicos: {
        ctr: { excellent: 1.2, good: 0.6, higherIsBetter: true, unit: "%" },
    },
    saas: {
        ctr: { excellent: 1.8, good: 1, higherIsBetter: true, unit: "%" },
        roas: { excellent: 3, good: 2, higherIsBetter: true, unit: "x" },
    },
    infoproduto: {
        ctr: { excellent: 2, good: 1, higherIsBetter: true, unit: "%" },
        roas: { excellent: 5, good: 2, higherIsBetter: true, unit: "x" },
    },
    app: {
        ctr: { excellent: 2, good: 1, higherIsBetter: true, unit: "%" },
    },
};

function statusTag(value: number, range: BenchRange): string {
    if (value <= 0) return "⚪ SEM DADOS";
    if (range.higherIsBetter) {
        if (value >= range.excellent) return "🟢 BOM";
        if (value >= range.good) return "🟡 ATENÇÃO";
        return "🔴 CRÍTICO";
    } else {
        if (value <= range.excellent) return "🟢 BOM";
        if (value <= range.good) return "🟡 ATENÇÃO";
        return "🔴 CRÍTICO";
    }
}

function benchLine(metric: string, label: string, value: number, range: BenchRange): string {
    const v = value.toFixed(range.unit === "x" ? 2 : 2);
    const op = range.higherIsBetter ? "≥" : "≤";
    return `- ${label}: ${v}${range.unit} → ${statusTag(value, range)} (bom ${op} ${range.good}${range.unit} | excelente ${op} ${range.excellent}${range.unit})`;
}

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

// ─── Pre-computed diagnostics for the prompt ───

interface WastedSpend {
    total: number;
    campaignsCount: number;
    details: { name: string; spend: number; roas: number; cpa: number; reason: string }[];
}

function identifyWastedSpend(
    campaigns: CampaignAgg[],
    config: AnalysisConfig,
    periodDays: number
): WastedSpend {
    const details: WastedSpend["details"] = [];
    let total = 0;

    for (const c of campaigns) {
        if (c.spend < 10) continue; // ignore noise
        const reasons: string[] = [];

        // ROAS < 1 on campaigns with revenue tracking
        if (c.revenue > 0 && c.roas < 1) {
            reasons.push(`ROAS ${fmt(c.roas)}x < 1x`);
        }

        // CPA > 2x the target
        if (config.cpa_target && c.primary_metric_total > 0 && c.cost_per_primary > config.cpa_target * 2) {
            reasons.push(`Custo por ${config.primary_metric_label} R$ ${fmt(c.cost_per_primary)} (${fmt(c.cost_per_primary / config.cpa_target, 1)}× o alvo de R$ ${config.cpa_target})`);
        }

        // Spending but zero conversions
        if (c.spend > 50 && c.primary_metric_total === 0) {
            reasons.push(`R$ ${fmt(c.spend)} gastos sem nenhuma ${config.primary_metric_label}`);
        }

        if (reasons.length > 0) {
            details.push({
                name: c.campaign_name,
                spend: c.spend,
                roas: c.roas,
                cpa: c.cost_per_primary,
                reason: reasons.join("; "),
            });
            total += c.spend;
        }
    }

    details.sort((a, b) => b.spend - a.spend);
    return { total, campaignsCount: details.length, details: details.slice(0, 8) };
}

interface ProfitDriver {
    name: string;
    spend: number;
    roas: number;
    cpa: number;
    primary: number;
}

function identifyProfitDrivers(campaigns: CampaignAgg[], config: AnalysisConfig): ProfitDriver[] {
    // Require meaningful spend to avoid tiny-sample noise
    const minSpend = 50;
    const qualifying = campaigns.filter(c => c.spend >= minSpend && c.primary_metric_total > 0);

    // Rank by ROAS when available, else by inverse CPA
    const hasRoas = qualifying.some(c => c.roas > 0);

    const ranked = qualifying
        .slice()
        .sort((a, b) => hasRoas ? (b.roas - a.roas) : (a.cost_per_primary - b.cost_per_primary))
        .filter(c => hasRoas ? c.roas >= 1.5 : (config.cpa_target ? c.cost_per_primary <= config.cpa_target : true))
        .slice(0, 5);

    return ranked.map(c => ({
        name: c.campaign_name,
        spend: c.spend,
        roas: c.roas,
        cpa: c.cost_per_primary,
        primary: c.primary_metric_total,
    }));
}

// ─── Creative fatigue (live Meta API) ───

interface FatigueSignal {
    ad_name: string;
    campaign_name: string;
    frequency: number;
    ctr: number;
    spend: number;
    impressions: number;
    conversions: number;
    severity: "alta" | "media" | "baixa";
    reason: string;
}

interface FatigueReport {
    signals: FatigueSignal[];
    accountAvgCtr: number;
    adsScanned: number;
    skipped: boolean;
    reason?: string;
}

async function fetchMetaCreativeFatigue(
    accessToken: string,
    adAccountIds: string[],
    timeRange: { since: string; until: string }
): Promise<FatigueReport> {
    const dateParam = `time_range=${encodeURIComponent(JSON.stringify(timeRange))}`;
    const accounts = adAccountIds.slice(0, 5);

    type AdRow = {
        ad_name: string;
        campaign_name: string;
        spend: number;
        impressions: number;
        clicks: number;
        frequency: number;
        ctr: number;
        conversions: number;
    };
    const rows: AdRow[] = [];

    for (const accountId of accounts) {
        try {
            const adsUrl = `https://graph.facebook.com/v19.0/${accountId}/ads?fields=name,campaign{name}&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=80&access_token=${accessToken}`;
            const adsRes = await fetch(adsUrl);
            const adsData = await adsRes.json();
            if (adsData.error || !adsData.data?.length) continue;

            const BATCH = 5;
            for (let i = 0; i < adsData.data.length && i < 60; i += BATCH) {
                const batch = adsData.data.slice(i, i + BATCH);
                const results = await Promise.all(
                    batch.map(async (ad: any) => {
                        try {
                            const insUrl = `https://graph.facebook.com/v19.0/${ad.id}/insights?fields=spend,impressions,clicks,frequency,ctr,actions&${dateParam}&use_account_attribution_setting=true&access_token=${accessToken}`;
                            const r = await fetch(insUrl);
                            const d = await r.json();
                            return { ad, insRow: d.data?.[0] || null };
                        } catch {
                            return { ad, insRow: null };
                        }
                    })
                );

                for (const { ad, insRow } of results) {
                    if (!insRow) continue;
                    const spend = parseFloat(insRow.spend || "0");
                    const impressions = parseInt(insRow.impressions || "0");
                    if (spend < 10 || impressions < 500) continue;

                    const clicks = parseInt(insRow.clicks || "0");
                    const frequency = parseFloat(insRow.frequency || "0");
                    const ctr = parseFloat(insRow.ctr || "0");

                    const actions = insRow.actions || [];
                    const sumActions = (...types: string[]) => actions
                        .filter((a: any) => types.includes(a.action_type))
                        .reduce((s: number, a: any) => s + (parseInt(a.value || "0") || 0), 0);
                    const conv =
                        sumActions("offsite_conversion.fb_pixel_purchase", "purchase")
                        + sumActions("offsite_conversion.fb_pixel_complete_registration", "complete_registration")
                        + sumActions("offsite_conversion.fb_pixel_lead", "lead");

                    rows.push({
                        ad_name: ad.name,
                        campaign_name: ad.campaign?.name || "—",
                        spend,
                        impressions,
                        clicks,
                        frequency,
                        ctr,
                        conversions: conv,
                    });
                }
            }
        } catch (e) {
            console.warn(`[deep-analysis] Fatigue fetch failed for ${accountId}:`, e);
        }
    }

    if (rows.length === 0) {
        return { signals: [], accountAvgCtr: 0, adsScanned: 0, skipped: true, reason: "Sem dados de ad-level no período." };
    }

    // Account-wide average CTR (impression-weighted)
    const totalImp = rows.reduce((s, r) => s + r.impressions, 0);
    const totalClk = rows.reduce((s, r) => s + r.clicks, 0);
    const accountAvgCtr = totalImp > 0 ? (totalClk / totalImp) * 100 : 0;

    const signals: FatigueSignal[] = [];
    for (const r of rows) {
        const ctrRatio = accountAvgCtr > 0 ? r.ctr / accountAvgCtr : 1;
        let severity: "alta" | "media" | "baixa" | null = null;
        const reasons: string[] = [];

        if (r.frequency >= 4.0) {
            severity = "alta";
            reasons.push(`frequency ${r.frequency.toFixed(2)} (>4.0 = saturação severa)`);
        } else if (r.frequency >= 3.0 && ctrRatio < 0.7) {
            severity = "alta";
            reasons.push(`frequency ${r.frequency.toFixed(2)} + CTR ${r.ctr.toFixed(2)}% (${(ctrRatio * 100).toFixed(0)}% da média da conta ${accountAvgCtr.toFixed(2)}%)`);
        } else if (r.frequency >= 3.0) {
            severity = "media";
            reasons.push(`frequency ${r.frequency.toFixed(2)} (limite de saturação)`);
        } else if (r.frequency >= 2.0 && ctrRatio < 0.6) {
            severity = "media";
            reasons.push(`frequency ${r.frequency.toFixed(2)} + CTR muito abaixo da média (${(ctrRatio * 100).toFixed(0)}%)`);
        }

        if (r.frequency >= 3.0 && r.conversions === 0 && r.spend >= 50) {
            severity = "alta";
            reasons.push(`R$ ${r.spend.toFixed(2)} sem conversão`);
        }

        if (severity) {
            signals.push({
                ad_name: r.ad_name,
                campaign_name: r.campaign_name,
                frequency: r.frequency,
                ctr: r.ctr,
                spend: r.spend,
                impressions: r.impressions,
                conversions: r.conversions,
                severity,
                reason: reasons.join("; "),
            });
        }
    }

    // Most expensive fatigued ads first
    signals.sort((a, b) => {
        const sevOrder = { alta: 0, media: 1, baixa: 2 };
        if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
        return b.spend - a.spend;
    });

    return { signals: signals.slice(0, 10), accountAvgCtr, adsScanned: rows.length, skipped: false };
}

// ─── Build System Prompt (persona + methodology + output schema) ───

function buildDeepSystemPrompt(config: AnalysisConfig): string {
    const verticalLabel = VERTICAL_LABELS[config.vertical] || config.vertical;

    return `Você é um analista sênior de performance marketing digital especializado em ${verticalLabel}.

SEU TRABALHO É DAR CLAREZA, NÃO VOLUME.
O gestor tem 60 segundos para decidir o que fazer hoje. Ele não precisa de 15 observações — precisa de UM diagnóstico claro e as 3 ações que movem o ponteiro esta semana, quantificadas em R$.

FILOSOFIA:
- Diagnostique CAUSAS, não métricas. Se o CPA está alto, explique POR QUE (público saturado, criativo fraco, landing com fricção).
- Toda recomendação tem impacto projetado em R$. Sem projeção numérica, a recomendação é descartada.
- Use os dados JÁ PRÉ-CALCULADOS que recebe (status vs benchmark, ralo de dinheiro, máquinas de lucro). Não recalcule — cite diretamente.
- Se os dados não suportam uma recomendação, diga "dados insuficientes" em vez de inventar.
- Nome COMPLETO das campanhas, sempre. Nunca abrevie.

PRIORIDADE DE ANÁLISE:
1. RALO DE DINHEIRO (wasted spend) — quanto está queimando em campanhas ruins, quanto pode ser realocado.
2. MÁQUINAS DE LUCRO — as campanhas que pagam a conta. O que elas têm em comum? Como escalar?
3. QUEDAS E ANOMALIAS — variações semana-sobre-semana, campanhas em decadência.
4. GARGALOS DO FUNIL — onde o tráfego vaza (CTR? Click→Cadastro? Cadastro→FTD?).

REGRAS DURAS:
- Campanha com ROAS < 1 e spend > R$ 10 = alerta crítico com ação de pausa/redução.
- Campanha gastando > R$ 50 sem nenhuma ${config.primary_metric_label} = pausa imediata.
- Variação > ±20% WoW em métrica-chave = mencionar no veredito.
- Se o resumo das métricas mostra "🔴 CRÍTICO" em benchmark, essa métrica DEVE aparecer no veredito.
- Se houver ad com FADIGA severidade ALTA, gerar alerta específico citando o nome do ad com ação "renovar criativo" ou "pausar". NÃO inventar fadiga se a seção mostrar "não analisada".
- Para fadiga MÉDIA, incluir como otimização (não como alerta crítico).

FORMATO DE SAÍDA:

Retorne APENAS um JSON válido (sem markdown, sem backticks, sem texto antes ou depois):
{
  "veredito": "(UMA frase de até 25 palavras: o estado geral + a causa raiz principal. Ex: 'Você queima R$ 420/dia em 3 campanhas com ROAS<1 enquanto suas 2 campeãs têm budget subdimensionado — o problema é alocação, não criativo.')",
  "top_3_acoes": [
    {
      "acao": "(ação específica e executável HOJE — ex: 'Pausar campanha X e realocar R$ 200/dia para campanha Y')",
      "impacto_rs": "(projeção em R$ — ex: '+R$ 1.200 de receita/semana' ou 'economia de R$ 840/mês')",
      "complexidade": "(baixa | media | alta)",
      "prazo": "(hoje | 48h | esta_semana)"
    }
  ],
  "score": (inteiro 1-10 — 7+ = saudável, 5-6 = atenção, <5 = crítico),
  "resumo": "(2-3 frases com números reforçando o veredito)",
  "alertas_criticos": [
    {
      "titulo": "(frase curta)",
      "descricao": "(2-4 frases com POR QUE e números em R$/%)",
      "acao": "(passo específico)",
      "impacto_estimado": "(R$ ou %)",
      "campanha": "(nome completo ou null)",
      "external_campaign_id": "(ID ou null)",
      "platform": "(meta | google | null)"
    }
  ],
  "oportunidades": [
    {
      "titulo": "(string)",
      "descricao": "(2-4 frases)",
      "acao": "(passo concreto)",
      "potencial": "(R$ ou %)",
      "campanha": "(nome ou null)",
      "external_campaign_id": "(ID ou null)",
      "platform": "(meta | google | null)"
    }
  ],
  "otimizacoes": [
    {
      "titulo": "(string)",
      "descricao": "(2-4 frases)",
      "acao": "(passo concreto)",
      "prioridade": "(alta|media|baixa)",
      "campanha": "(nome ou null)",
      "external_campaign_id": "(ID ou null)",
      "platform": "(meta | google | null)"
    }
  ],
  "plano_acao": [
    {
      "etapa": "(ex: 'Impressão → Clique', 'Cadastro → FTD', 'ROI e Retorno', 'Budget e Escala')",
      "diagnostico": "(2-3 frases com números)",
      "status": "(critico|atencao|saudavel)",
      "taxa_atual": "(valor)",
      "benchmark": "(referência)",
      "acoes": ["(ação com COMO + impacto em R$)"]
    }
  ],
  "tendencia_7d": "(melhorando|estavel|piorando)",
  "previsao": "(projeção 7d em R$ para custo por ${config.primary_metric_label} e ROAS, se os padrões atuais continuarem)"
}

LIMITES DE QUANTIDADE (para clareza, não despeje):
- top_3_acoes: EXATAMENTE 3 (ordene por impacto em R$ decrescente). Se não houver 3 ações com impacto quantificável, repita só as que fazem sentido.
- alertas_criticos: máximo 3 (só o que é realmente crítico — ROAS<1, spend sem conversão, queda >20% WoW).
- oportunidades: máximo 3 (coisas prontas para escalar).
- otimizacoes: máximo 5 (melhorias concretas e específicas).
- plano_acao: 3 a 5 etapas (inclua "ROI e Retorno"; inclua "Budget e Escala" se houver ralo/máquina de lucro).

Todos os textos em português brasileiro. Números sempre com R$ e %.`;
}

// ─── Build Data Prompt (client data only) ───

function buildDeepDataPrompt(
    config: AnalysisConfig,
    current: PeriodMetrics,
    previous: PeriodMetrics,
    campaigns: CampaignAgg[],
    anomalies: Anomaly[],
    decaying: DecayingCampaign[],
    wasted: WastedSpend,
    profitDrivers: ProfitDriver[],
    fatigue: FatigueReport
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

    // Vertical benchmark status (pre-tagged so the AI cites, doesn't infer)
    const bench = VERTICAL_BENCHMARKS[config.vertical] || {};
    const benchmarkLines: string[] = [];
    if (bench.ctr) benchmarkLines.push(benchLine("ctr", "CTR", current.ctr, bench.ctr));
    if (bench.roas && current.revenue > 0) benchmarkLines.push(benchLine("roas", "ROAS", current.roas, bench.roas));
    if (bench.reg_to_ftd && current.registrations > 0) {
        const regToFtd = (current.ftd / current.registrations) * 100;
        benchmarkLines.push(benchLine("reg_to_ftd", "Taxa Cadastro→FTD", regToFtd, bench.reg_to_ftd));
    }
    const benchmarkSection = benchmarkLines.length > 0
        ? `\nSTATUS vs BENCHMARK DO VERTICAL (${VERTICAL_LABELS[config.vertical] || config.vertical}):\n${benchmarkLines.join("\n")}`
        : "";

    // Wasted spend (ralo de dinheiro)
    const wastedSection = wasted.campaignsCount > 0
        ? `\n🔴 RALO DE DINHEIRO (${wasted.campaignsCount} campanha${wasted.campaignsCount > 1 ? "s" : ""} queimando R$ ${fmt(wasted.total)} em ${"os últimos 7 dias"}):
${wasted.details.map(d => `- "${d.name}" — R$ ${fmt(d.spend)} gastos | ${d.reason}`).join("\n")}

Estas campanhas são candidatas a PAUSA ou REDUÇÃO IMEDIATA. O capital liberado deve ser realocado para as máquinas de lucro listadas abaixo.`
        : "\n✅ RALO DE DINHEIRO: Nenhuma campanha significativa com ROAS<1, CPA>2×alvo ou gasto sem conversão.";

    // Profit drivers (máquinas de lucro)
    const driversSection = profitDrivers.length > 0
        ? `\n🟢 MÁQUINAS DE LUCRO (campanhas que pagam a conta — ordenadas por retorno):
${profitDrivers.map(p => `- "${p.name}" — R$ ${fmt(p.spend)} gastos, ${p.primary} ${config.primary_metric_label}, ROAS ${fmt(p.roas)}x, Custo/${config.primary_metric_label} R$ ${fmt(p.cpa)}`).join("\n")}

Estas campanhas merecem MAIS BUDGET. Analise o que elas têm em comum (público, criativo, posicionamento) e replique nas piores.`
        : "\n⚠️ MÁQUINAS DE LUCRO: Nenhuma campanha com ROAS≥1.5x e spend≥R$50 identificada. Ponto de atenção.";

    // Creative fatigue (live ad-level Meta data)
    let fatigueSection: string;
    if (fatigue.skipped) {
        fatigueSection = `\nFADIGA DE CRIATIVO: não analisada (${fatigue.reason || "indisponível"}). Não gere alertas de fadiga sem esses dados.`;
    } else if (fatigue.signals.length === 0) {
        fatigueSection = `\n✅ FADIGA DE CRIATIVO: ${fatigue.adsScanned} ads ativos analisados, nenhum com sinais de saturação (frequency<3.0 ou CTR saudável). CTR médio da conta: ${fmt(fatigue.accountAvgCtr)}%.`;
    } else {
        const sevTag = (s: string) => s === "alta" ? "🔴 ALTA" : s === "media" ? "🟡 MÉDIA" : "🟢 BAIXA";
        const totalFatiguedSpend = fatigue.signals.reduce((s, f) => s + f.spend, 0);
        const linhas = fatigue.signals.map(f =>
            `- ${sevTag(f.severity)} | "${f.ad_name}" (Campanha: ${f.campaign_name}) — Frequency ${fmt(f.frequency)}, CTR ${fmt(f.ctr)}%, R$ ${fmt(f.spend)}, ${f.conversions} conv. | Motivo: ${f.reason}`
        ).join("\n");
        fatigueSection = `\n🔥 FADIGA DE CRIATIVO (${fatigue.signals.length} ad${fatigue.signals.length > 1 ? "s" : ""} saturado${fatigue.signals.length > 1 ? "s" : ""} de ${fatigue.adsScanned} analisados — R$ ${fmt(totalFatiguedSpend)} expostos. CTR médio da conta: ${fmt(fatigue.accountAvgCtr)}%):
${linhas}

Para ads com severidade ALTA: recomendar RENOVAR criativo (novo hook, nova copy, nova edição) ou PAUSAR. Frequency ≥3.0 = mesmas pessoas vendo 3+ vezes; ≥4.0 = saturação severa, custo sobe sem retorno.`;
    }

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

Identifique campanhas com taxa cadastro→depósito muito abaixo da média (${fmt(regToFtdRate, 1)}%). Investigue causas: qualidade do tráfego, público inadequado, criativo desalinhado, landing page com fricção.` : "";

    return `PERFIL DO CLIENTE:
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
${benchmarkSection}
${wastedSection}
${driversSection}
${fatigueSection}

PERFORMANCE POR CAMPANHA (apenas campanhas ATIVAS):
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

Analise esses dados seguindo sua metodologia. Retorne APENAS o JSON.`;
}

// ─── Call Anthropic Claude ───

async function callAnthropic(systemPrompt: string, messages: { role: string; content: string }[]): Promise<{ text: string; model: string }> {
    const PRIMARY_MODEL = "claude-sonnet-4-20250514";
    const FALLBACK_MODEL = "claude-3-5-sonnet-20241022";
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

    async function tryModel(model: string): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 150000); // 150s

        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey!,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 16000,
                    system: systemPrompt,
                    messages,
                }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: { type: "unknown" } }));
                console.error("[deep-analysis] Anthropic error:", res.status, JSON.stringify(errData));

                if (res.status === 404 || errData?.error?.type === "not_found_error") {
                    throw Object.assign(new Error("model_not_found"), { type: "not_found" });
                }
                if (res.status === 401) {
                    throw new Error("Chave da Anthropic inválida ou expirada. Verifique ANTHROPIC_API_KEY.");
                }
                if (res.status === 429) {
                    throw new Error("Limite de requisições Anthropic atingido. Aguarde alguns segundos.");
                }
                if (res.status === 529 || res.status === 503) {
                    throw new Error("Anthropic temporariamente sobrecarregada. Tente novamente em instantes.");
                }
                throw new Error(`Anthropic retornou status ${res.status}`);
            }

            const data = await res.json();
            return data.content?.[0]?.text || "";
        } finally {
            clearTimeout(timeout);
        }
    }

    try {
        const text = await tryModel(PRIMARY_MODEL);
        return { text, model: PRIMARY_MODEL };
    } catch (e: any) {
        if (e.type === "not_found") {
            console.warn("[deep-analysis] Fallback to", FALLBACK_MODEL);
            const text = await tryModel(FALLBACK_MODEL);
            return { text, model: FALLBACK_MODEL };
        }
        throw e;
    }
}

// ─── Parse AI JSON response ───

function parseAIResponse(text: string): any {
    // Strip the analysis reasoning block if present (prefill technique)
    let cleaned = text.trim();
    const analysisEndIdx = cleaned.indexOf("</analysis>");
    if (analysisEndIdx !== -1) {
        cleaned = cleaned.substring(analysisEndIdx + "</analysis>".length).trim();
    }

    // Strip markdown code fences if present
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
        const { data: allCampaignsRaw } = await supabase
            .from("daily_campaigns")
            .select("*")
            .eq("client_id", client_id)
            .gte("date", startDateStr)
            .lte("date", endDateStr)
            .order("date", { ascending: true });

        // Filter out paused campaigns — status can be "PAUSED", "Pausada", "paused", etc.
        const allCampaigns = (allCampaignsRaw || []).filter((r: any) =>
            !r.campaign_status?.toLowerCase().includes("paus")
        );

        // ─── 4. SEPARAR PERÍODOS ───
        const currentMetrics = allMetrics.filter((r: any) => r.date >= splitDateStr);
        const previousMetrics = allMetrics.filter((r: any) => r.date < splitDateStr);

        const currentCampaigns = allCampaigns.filter((r: any) => r.date >= splitDateStr);
        const previousCampaigns = allCampaigns.filter((r: any) => r.date < splitDateStr);

        // ─── 5. CALCULAR MÉTRICAS CONSOLIDADAS ───
        const current = consolidateMetrics(currentMetrics, config.primary_metric);
        const previous = consolidateMetrics(previousMetrics, config.primary_metric);

        // ─── 6. ANÁLISE POR CAMPANHA (período atual) ───
        const campaignAnalysis = aggregateCampaigns(currentCampaigns, config.primary_metric, 7);

        // ─── 7. DETECÇÃO DE ANOMALIAS ───
        const anomalies = detectAnomalies(allMetrics, config.primary_metric, config);

        // ─── 8. CAMPANHAS EM DECADÊNCIA ───
        const decayingCampaigns = detectDecayingCampaigns(
            allCampaigns,
            config.primary_metric,
            config
        );

        // ─── 9. DIAGNÓSTICOS PRÉ-COMPUTADOS (ralo de dinheiro + máquinas de lucro) ───
        const wastedSpend = identifyWastedSpend(campaignAnalysis, config, 7);
        const profitDrivers = identifyProfitDrivers(campaignAnalysis, config);

        // ─── 9b. FADIGA DE CRIATIVO (live Meta API, opcional) ───
        let fatigue: FatigueReport = { signals: [], accountAvgCtr: 0, adsScanned: 0, skipped: true, reason: "Sem token Meta conectado." };
        try {
            const targetClientUserId = managerLink?.client_user_id || client_id;
            const managerIdForToken = managerLink?.manager_id || (isAdmin ? user.id : null);

            if (managerIdForToken) {
                const { data: metaConn } = await supabase
                    .from("oauth_connections")
                    .select("access_token")
                    .eq("manager_id", managerIdForToken)
                    .eq("provider", "meta_ads")
                    .eq("connected", true)
                    .maybeSingle();

                const { data: metaAccounts } = await supabase
                    .from("client_meta_ad_accounts")
                    .select("ad_account_id")
                    .eq("client_user_id", targetClientUserId);

                const adAccountIds = (metaAccounts || []).map((a: any) => a.ad_account_id);

                if (metaConn?.access_token && adAccountIds.length > 0) {
                    fatigue = await fetchMetaCreativeFatigue(
                        metaConn.access_token,
                        adAccountIds,
                        { since: splitDateStr, until: endDateStr }
                    );
                }
            }
        } catch (fatigueErr) {
            console.warn("[deep-analysis] Fatigue fetch error:", fatigueErr);
            fatigue = { signals: [], accountAvgCtr: 0, adsScanned: 0, skipped: true, reason: "Erro ao consultar Meta API." };
        }

        // ─── 10. MONTAR PROMPTS ───
        const systemPrompt = buildDeepSystemPrompt(config);
        const dataPrompt = buildDeepDataPrompt(config, current, previous, campaignAnalysis, anomalies, decayingCampaigns, wastedSpend, profitDrivers, fatigue);

        console.log(`[deep-analysis] Prompt built. Metrics days: ${allMetrics.length}, Campaigns: ${campaignAnalysis.length}, Anomalies: ${anomalies.length}, Decaying: ${decayingCampaigns.length}, Wasted: R$ ${wastedSpend.total.toFixed(2)} (${wastedSpend.campaignsCount} camps), ProfitDrivers: ${profitDrivers.length}, FatigueAds: ${fatigue.signals.length}/${fatigue.adsScanned}`);

        // ─── 10. CHAMAR ANTHROPIC CLAUDE ───
        const messages = [
            { role: "user", content: dataPrompt },
        ];
        const { text: aiText, model: usedModel } = await callAnthropic(systemPrompt, messages);

        // ─── 11. PARSE RESPOSTA ───
        const parsed = parseAIResponse(aiText);

        // ─── 12. SALVAR EM analysis_reports ───
        const reportData = {
            client_id,
            veredito: parsed.veredito || null,
            top_3_acoes: parsed.top_3_acoes || [],
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
                wasted_spend_total: wastedSpend.total,
                wasted_campaigns_count: wastedSpend.campaignsCount,
                profit_drivers_count: profitDrivers.length,
                fatigue_skipped: fatigue.skipped,
                fatigue_ads_scanned: fatigue.adsScanned,
                fatigue_ads_count: fatigue.signals.length,
                fatigue_high_severity: fatigue.signals.filter(s => s.severity === "alta").length,
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
