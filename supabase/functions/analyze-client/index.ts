import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Vertical Labels & Benchmarks ───

const VERTICAL_LABELS: Record<string, string> = {
    ecommerce: "E-commerce",
    igaming: "iGaming / Apostas",
    infoproduto: "Infoproduto / Lançamento",
    leadgen: "Geração de Leads",
    servicos: "Serviços / Mensagens",
    saas: "SaaS",
    app: "Aplicativo Mobile",
};

const VERTICAL_BENCHMARKS: Record<string, string> = {
    ecommerce: `- Hook Rate: EXCELENTE > 25% | BOM 15-25% | FRACO < 15%
- Hold Rate: EXCELENTE > 20% | BOM 10-20% | FRACO < 10%
- CTR: EXCELENTE > 2% | BOM 1-2% | FRACO < 1%
- ROAS saudável: > 3x | Aceitável: 2-3x | Prejuízo: < 2x
- Taxa de conversão (click→purchase): > 2.5% é bom`,
    igaming: `- Hook Rate: EXCELENTE > 30% | BOM 20-30% | FRACO < 20%
- Hold Rate: EXCELENTE > 25% | BOM 15-25% | FRACO < 15%
- CTR: EXCELENTE > 1.5% | BOM 0.8-1.5% | FRACO < 0.8%
- Custo/FTD saudável: depende do LTV, mas < R$ 150 geralmente é bom
- Taxa Cadastro→FTD: EXCELENTE > 20% | BOM 10-20% | FRACO < 10%`,
    leadgen: `- Hook Rate: EXCELENTE > 20% | BOM 12-20% | FRACO < 12%
- Hold Rate: EXCELENTE > 18% | BOM 10-18% | FRACO < 10%
- CTR: EXCELENTE > 1.5% | BOM 0.8-1.5% | FRACO < 0.8%
- CPL (Custo por Lead): depende do vertical, mas < R$ 30 geralmente é bom
- Taxa click→lead: > 5% é bom`,
    servicos: `- Hook Rate: EXCELENTE > 20% | BOM 12-20% | FRACO < 12%
- Hold Rate: EXCELENTE > 18% | BOM 10-18% | FRACO < 10%
- CTR: EXCELENTE > 1.2% | BOM 0.6-1.2% | FRACO < 0.6%
- Custo por mensagem: varia por serviço, monitorar tendência`,
    saas: `- Hook Rate: EXCELENTE > 22% | BOM 14-22% | FRACO < 14%
- Hold Rate: EXCELENTE > 20% | BOM 12-20% | FRACO < 12%
- CTR: EXCELENTE > 1.8% | BOM 1-1.8% | FRACO < 1%
- CAC aceitável: depende do LTV/CAC ratio (ideal > 3x)
- Taxa trial→paid: > 15% é bom`,
    infoproduto: `- Hook Rate: EXCELENTE > 28% | BOM 18-28% | FRACO < 18%
- Hold Rate: EXCELENTE > 22% | BOM 12-22% | FRACO < 12%
- CTR: EXCELENTE > 2% | BOM 1-2% | FRACO < 1%
- CPL aceitável: depende do ticket do produto
- ROI de lançamento: > 5x é excelente, > 2x é aceitável`,
    app: `- Hook Rate: EXCELENTE > 25% | BOM 15-25% | FRACO < 15%
- Hold Rate: EXCELENTE > 20% | BOM 10-20% | FRACO < 10%
- CTR: EXCELENTE > 2% | BOM 1-2% | FRACO < 1%
- CPI (Custo por Instalação): varia por categoria
- Retenção D1 > 40% é bom, D7 > 20% é bom`,
};

// ─── Meta API helpers ───

interface MetaLiveMetrics {
    spend: number;
    impressions: number;
    clicks: number;
    purchases: number;
    registrations: number;
    messages: number;
    leads: number;
    revenue: number;
    ftd: number;
}

interface AnalysisClientConfig {
    ftd_event_name: string | null;
    ftd_google_conversion_name: string | null;
    vertical: string;
}

interface MetaLiveCampaign {
    name: string;
    spend: number;
    clicks: number;
    impressions: number;
    purchases: number;
    registrations: number;
    leads: number;
    messages: number;
    revenue: number;
    ftd: number;
}

interface MetaAdCreative {
    campaign_name: string;
    ad_name: string;
    spend: number;
    impressions: number;
    clicks: number;
    video_views_3s: number;
    video_thruplay: number;
    hook_rate: number;
    hold_rate: number;
    ctr: number;
    conversions: number;
    cpa: number;
}

interface MetaLiveData {
    metrics: MetaLiveMetrics;
    campaigns: MetaLiveCampaign[];
    creatives: MetaAdCreative[];
    source: "meta_live";
}

async function fetchMetaLiveData(
    accessToken: string,
    adAccountIds: string[],
    timeRange: { since: string; until: string },
    clientConfig?: AnalysisClientConfig | null
): Promise<MetaLiveData> {
    const dateParam = `time_range=${encodeURIComponent(JSON.stringify(timeRange))}`;
    const metrics: MetaLiveMetrics = { spend: 0, impressions: 0, clicks: 0, purchases: 0, registrations: 0, messages: 0, leads: 0, revenue: 0, ftd: 0 };
    const allCampaigns: MetaLiveCampaign[] = [];
    const allCreatives: MetaAdCreative[] = [];
    const ftdEventName = clientConfig?.ftd_event_name || null;

    const accounts = adAccountIds.slice(0, 5);

    for (const accountId of accounts) {
        try {
            // Account-level insights
            const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,clicks,actions,action_values&${dateParam}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${accessToken}`;
            const res = await fetch(insightsUrl);
            const data = await res.json();

            if (data.error) {
                console.error(`Meta API error for ${accountId}:`, data.error.message);
                continue;
            }

            if (data.data?.[0]) {
                const d = data.data[0];
                metrics.spend += parseFloat(d.spend || "0");
                metrics.impressions += parseInt(d.impressions || "0");
                metrics.clicks += parseInt(d.clicks || "0");

                const purchaseAct = d.actions?.find((a: any) =>
                    a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
                );
                metrics.purchases += purchaseAct ? parseInt(purchaseAct.value || "0") : 0;

                const regAct = d.actions?.find((a: any) =>
                    a.action_type === "offsite_conversion.fb_pixel_complete_registration"
                ) || d.actions?.find((a: any) =>
                    a.action_type === "complete_registration"
                );
                metrics.registrations += regAct ? parseInt(regAct.value || "0") : 0;

                const leadAct = d.actions?.find((a: any) =>
                    a.action_type === "offsite_conversion.fb_pixel_lead"
                ) || d.actions?.find((a: any) =>
                    a.action_type === "lead"
                );
                metrics.leads = (metrics.leads || 0) + (leadAct ? parseInt(leadAct.value || "0") : 0);

                const msgAct = d.actions?.find((a: any) =>
                    a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
                    a.action_type === "onsite_conversion.messaging_first_reply"
                );
                metrics.messages += msgAct ? parseInt(msgAct.value || "0") : 0;

                const purchaseVal = d.action_values?.find((a: any) =>
                    a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
                );
                metrics.revenue += purchaseVal ? parseFloat(purchaseVal.value || "0") : 0;

                if (ftdEventName) {
                    const ftdAct = d.actions?.find((a: any) => a.action_type === ftdEventName);
                    metrics.ftd += ftdAct ? parseInt(ftdAct.value || "0") : 0;
                }
            }

            // Campaign-level insights (top 20 ACTIVE by spend)
            const campUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,effective_status&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=30&access_token=${accessToken}`;
            const campRes = await fetch(campUrl);
            const campData = await campRes.json();

            if (campData.data && campData.data.length > 0) {
                const BATCH = 5;
                for (let i = 0; i < campData.data.length && i < 20; i += BATCH) {
                    const batch = campData.data.slice(i, i + BATCH);
                    const results = await Promise.all(
                        batch.map(async (camp: any) => {
                            try {
                                const insUrl = `https://graph.facebook.com/v19.0/${camp.id}/insights?fields=spend,impressions,clicks,actions,action_values&${dateParam}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${accessToken}`;
                                const r = await fetch(insUrl);
                                const d = await r.json();
                                return { camp, insRow: d.data?.[0] || null };
                            } catch {
                                return { camp, insRow: null };
                            }
                        })
                    );

                    for (const { camp, insRow } of results) {
                        if (!insRow) continue;
                        const spend = parseFloat(insRow.spend || "0");
                        if (spend === 0) continue;

                        const actions = insRow.actions || [];
                        const actionValues = insRow.action_values || [];

                        const pAct = actions.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
                        const rAct = actions.find((a: any) =>
                            a.action_type === "offsite_conversion.fb_pixel_complete_registration"
                        ) || actions.find((a: any) =>
                            a.action_type === "complete_registration"
                        );
                        const lAct = actions.find((a: any) =>
                            a.action_type === "offsite_conversion.fb_pixel_lead"
                        ) || actions.find((a: any) =>
                            a.action_type === "lead"
                        );
                        const mAct = actions.find((a: any) =>
                            a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
                            a.action_type === "onsite_conversion.messaging_first_reply"
                        );
                        const pVal = actionValues.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
                        const ftdVal = ftdEventName ? actions.find((a: any) => a.action_type === ftdEventName) : null;

                        allCampaigns.push({
                            name: camp.name,
                            spend,
                            clicks: parseInt(insRow.clicks || "0"),
                            impressions: parseInt(insRow.impressions || "0"),
                            purchases: pAct ? parseInt(pAct.value || "0") : 0,
                            registrations: rAct ? parseInt(rAct.value || "0") : 0,
                            leads: lAct ? parseInt(lAct.value || "0") : 0,
                            messages: mAct ? parseInt(mAct.value || "0") : 0,
                            revenue: pVal ? parseFloat(pVal.value || "0") : 0,
                            ftd: ftdVal ? parseInt(ftdVal.value || "0") : 0,
                        });
                    }
                }
            }

            // ─── Ad-level creative metrics (video hook/hold rates) ───
            try {
                const adsUrl = `https://graph.facebook.com/v19.0/${accountId}/ads?fields=name,campaign{name}&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=50&access_token=${accessToken}`;
                const adsRes = await fetch(adsUrl);
                const adsData = await adsRes.json();

                if (adsData.data && adsData.data.length > 0) {
                    const adBATCH = 5;
                    for (let i = 0; i < adsData.data.length && i < 30; i += adBATCH) {
                        const adBatch = adsData.data.slice(i, i + adBATCH);
                        const adResults = await Promise.all(
                            adBatch.map(async (ad: any) => {
                                try {
                                    const adInsUrl = `https://graph.facebook.com/v19.0/${ad.id}/insights?fields=spend,impressions,clicks,actions,video_avg_time_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions,cost_per_action_type&${dateParam}&use_account_attribution_setting=true&action_report_time=mixed&access_token=${accessToken}`;
                                    const r = await fetch(adInsUrl);
                                    const d = await r.json();
                                    return { ad, insRow: d.data?.[0] || null };
                                } catch {
                                    return { ad, insRow: null };
                                }
                            })
                        );

                        for (const { ad, insRow } of adResults) {
                            if (!insRow) continue;
                            const adSpend = parseFloat(insRow.spend || "0");
                            if (adSpend === 0) continue;

                            const adImpressions = parseInt(insRow.impressions || "0");
                            const adClicks = parseInt(insRow.clicks || "0");

                            // Video 3-second views (hook rate denominator)
                            const video3sAction = insRow.actions?.find((a: any) => a.action_type === "video_view");
                            const video3sViews = video3sAction ? parseInt(video3sAction.value || "0") : 0;

                            // ThruPlay (hold rate numerator)
                            const thruplayAction = insRow.video_thruplay_watched_actions?.find((a: any) => a.action_type === "video_view");
                            const thruplayViews = thruplayAction ? parseInt(thruplayAction.value || "0") : 0;

                            // Hook Rate = 3s video views / impressions
                            const hookRate = adImpressions > 0 ? (video3sViews / adImpressions) * 100 : 0;
                            // Hold Rate = ThruPlay / 3s views
                            const holdRate = video3sViews > 0 ? (thruplayViews / video3sViews) * 100 : 0;
                            // CTR
                            const ctr = adImpressions > 0 ? (adClicks / adImpressions) * 100 : 0;

                            // Conversions (purchases + registrations)
                            const adActions = insRow.actions || [];
                            const adPurchases = adActions.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
                            const adRegAct = adActions.find((a: any) =>
                                a.action_type === "offsite_conversion.fb_pixel_complete_registration"
                            ) || adActions.find((a: any) =>
                                a.action_type === "complete_registration"
                            );
                            const adLeadAct = adActions.find((a: any) =>
                                a.action_type === "offsite_conversion.fb_pixel_lead"
                            ) || adActions.find((a: any) =>
                                a.action_type === "lead"
                            );
                            const totalConversions = (adPurchases ? parseInt(adPurchases.value || "0") : 0) +
                                (adRegAct ? parseInt(adRegAct.value || "0") : 0) +
                                (adLeadAct ? parseInt(adLeadAct.value || "0") : 0);

                            // Only include ads with video data or significant spend
                            if (video3sViews > 0 || adSpend > 10) {
                                allCreatives.push({
                                    campaign_name: ad.campaign?.name || "Unknown",
                                    ad_name: ad.name,
                                    spend: adSpend,
                                    impressions: adImpressions,
                                    clicks: adClicks,
                                    video_views_3s: video3sViews,
                                    video_thruplay: thruplayViews,
                                    hook_rate: hookRate,
                                    hold_rate: holdRate,
                                    ctr,
                                    conversions: totalConversions,
                                    cpa: totalConversions > 0 ? adSpend / totalConversions : 0,
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn(`[analyze-client] Failed to fetch ad creative metrics for ${accountId}:`, e);
            }
        } catch (e) {
            console.error(`Failed to fetch Meta data for account ${accountId}:`, e);
        }
    }

    // Do NOT override leads with registrations — they are separate metrics
    allCampaigns.sort((a, b) => b.spend - a.spend);
    allCreatives.sort((a, b) => b.spend - a.spend);

    return { metrics, campaigns: allCampaigns.slice(0, 20), creatives: allCreatives.slice(0, 30), source: "meta_live" };
}

// ─── Build prompt from live Meta data ───

function buildMetaLivePrompt(data: MetaLiveData, days: number): { metricsSummary: string; campaignsSummary: string; creativeSummary: string } {
    const m = data.metrics;
    const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) : "0.00";
    const cpc = m.clicks > 0 ? (m.spend / m.clicks).toFixed(2) : "0.00";
    const roas = m.spend > 0 ? (m.revenue / m.spend).toFixed(2) : "0.00";
    const cpPurchase = m.purchases > 0 ? (m.spend / m.purchases).toFixed(2) : "N/A";
    const cpRegistration = m.registrations > 0 ? (m.spend / m.registrations).toFixed(2) : "N/A";
    const cpFtd = m.ftd > 0 ? (m.spend / m.ftd).toFixed(2) : "N/A";
    const regToFtdRate = m.registrations > 0 ? ((m.ftd / m.registrations) * 100).toFixed(1) : "N/A";
    const clickToRegRate = m.clicks > 0 ? ((m.registrations / m.clicks) * 100).toFixed(2) : "N/A";

    let metricsSummary = `Platform: META ADS (dados ao vivo da API)
Spend: R$ ${m.spend.toFixed(2)} | Revenue: R$ ${m.revenue.toFixed(2)} | ROAS: ${roas}x
Impressions: ${m.impressions} | Clicks: ${m.clicks} | CTR: ${ctr}% | CPC: R$ ${cpc}
Purchases: ${m.purchases} | Cost per Purchase: R$ ${cpPurchase}
Registrations/Leads: ${m.registrations} | Cost per Registration: R$ ${cpRegistration}
FTDs (First Time Deposits): ${m.ftd} | Cost per FTD: R$ ${cpFtd}
Messages: ${m.messages}
Total Leads (purchases + registrations): ${m.leads}

FUNIL COMPLETO:
1. Impressões: ${m.impressions}
2. Cliques: ${m.clicks} | CTR (Imp→Click): ${ctr}%
3. Cadastros: ${m.registrations} | Taxa Click→Cadastro: ${clickToRegRate}% | Custo/Cadastro: R$ ${cpRegistration}
4. FTDs: ${m.ftd} | Taxa Cadastro→FTD: ${regToFtdRate}% | Custo/FTD: R$ ${cpFtd}\n\n`;

    let campaignsSummary = "";
    for (const c of data.campaigns) {
        const cpa = (c.purchases + c.registrations) > 0 ? (c.spend / (c.purchases + c.registrations)).toFixed(2) : "N/A";
        const campRoas = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : "0.00";
        const campCpFtd = c.ftd > 0 ? (c.spend / c.ftd).toFixed(2) : "N/A";
        const campRegToFtd = c.registrations > 0 ? ((c.ftd / c.registrations) * 100).toFixed(1) : "N/A";
        const campCtr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00";
        const campClickToReg = c.clicks > 0 ? ((c.registrations / c.clicks) * 100).toFixed(2) : "N/A";
        campaignsSummary += `[META] ${c.name}
Spend: R$ ${c.spend.toFixed(2)} | Impressions: ${c.impressions} | Clicks: ${c.clicks} | CTR: ${campCtr}% | Click→Reg: ${campClickToReg}%
Purchases: ${c.purchases} | Registrations: ${c.registrations} | FTDs: ${c.ftd} | Conv.Reg→FTD: ${campRegToFtd}%
Revenue: R$ ${c.revenue.toFixed(2)} | CPA: R$ ${cpa} | Cost/FTD: R$ ${campCpFtd} | ROAS: ${campRoas}x\n\n`;
    }

    let creativeSummary = "";
    if (data.creatives.length > 0) {
        creativeSummary = "ANÁLISE DE CRIATIVOS (anúncios individuais com métricas de vídeo):\n\n";
        for (const c of data.creatives) {
            creativeSummary += `[AD] ${c.ad_name} (Campanha: ${c.campaign_name})
Spend: R$ ${c.spend.toFixed(2)} | Impressions: ${c.impressions} | Clicks: ${c.clicks} | CTR: ${c.ctr.toFixed(2)}%
Video 3s Views: ${c.video_views_3s} | ThruPlay: ${c.video_thruplay}
Hook Rate (3s/Imp): ${c.hook_rate.toFixed(1)}% | Hold Rate (ThruPlay/3s): ${c.hold_rate.toFixed(1)}%
Conversions: ${c.conversions} | CPA: ${c.cpa > 0 ? `R$ ${c.cpa.toFixed(2)}` : "N/A"}\n\n`;
        }
    }

    return { metricsSummary, campaignsSummary, creativeSummary };
}

// ─── Build prompt from database data (fallback) ───

function buildDbPrompt(metricsData: any[], campaignData: any[]): { metricsSummary: string; campaignsSummary: string; creativeSummary: string } {
    const platformMetrics: Record<string, any> = {};
    let totalRegistrations = 0, totalFtd = 0, totalSpendAll = 0, totalClicks = 0, totalImpressions = 0;
    for (const row of metricsData) {
        if (!platformMetrics[row.platform]) {
            platformMetrics[row.platform] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, registrations: 0, ftd: 0 };
        }
        platformMetrics[row.platform].spend += Number(row.spend) || 0;
        platformMetrics[row.platform].impressions += Number(row.impressions) || 0;
        platformMetrics[row.platform].clicks += Number(row.clicks) || 0;
        platformMetrics[row.platform].conversions += Number(row.conversions) || 0;
        platformMetrics[row.platform].revenue += Number(row.revenue) || 0;
        platformMetrics[row.platform].registrations += Number(row.registrations) || 0;
        platformMetrics[row.platform].ftd += Number(row.ftd) || 0;
        totalRegistrations += Number(row.registrations) || 0;
        totalFtd += Number(row.ftd) || 0;
        totalSpendAll += Number(row.spend) || 0;
        totalClicks += Number(row.clicks) || 0;
        totalImpressions += Number(row.impressions) || 0;
    }

    let metricsSummary = "";
    Object.keys(platformMetrics).forEach((platform) => {
        const m = platformMetrics[platform];
        const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) : "0.00";
        const cpc = m.clicks > 0 ? (m.spend / m.clicks).toFixed(2) : "0.00";
        const cpa = m.conversions > 0 ? (m.spend / m.conversions).toFixed(2) : "0.00";
        const roas = m.spend > 0 ? (m.revenue / m.spend).toFixed(2) : "0.00";
        const cpFtd = m.ftd > 0 ? (m.spend / m.ftd).toFixed(2) : "N/A";
        const cpReg = m.registrations > 0 ? (m.spend / m.registrations).toFixed(2) : "N/A";

        metricsSummary += `Platform: ${platform.toUpperCase()} (dados do banco)
Spend: R$ ${m.spend.toFixed(2)} | Revenue: R$ ${m.revenue.toFixed(2)} | ROAS: ${roas}x
Impressions: ${m.impressions} | Clicks: ${m.clicks} | CTR: ${ctr}% | CPC: R$ ${cpc}
Conversions: ${m.conversions} | CPA: R$ ${cpa}
Registrations: ${m.registrations} | Cost/Registration: R$ ${cpReg}
FTDs: ${m.ftd} | Cost/FTD: R$ ${cpFtd}\n\n`;
    });

    const regToFtdRate = totalRegistrations > 0 ? ((totalFtd / totalRegistrations) * 100).toFixed(1) : "N/A";
    const cpRegAll = totalRegistrations > 0 ? (totalSpendAll / totalRegistrations).toFixed(2) : "N/A";
    const cpFtdAll = totalFtd > 0 ? (totalSpendAll / totalFtd).toFixed(2) : "N/A";
    const clickToRegRate = totalClicks > 0 ? ((totalRegistrations / totalClicks) * 100).toFixed(2) : "N/A";
    const ctrAll = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "N/A";

    metricsSummary += `FUNIL COMPLETO (consolidado):
1. Impressões: ${totalImpressions} 
2. Cliques: ${totalClicks} | CTR: ${ctrAll}%
3. Cadastros: ${totalRegistrations} | Taxa Click→Cadastro: ${clickToRegRate}% | Custo/Cadastro: R$ ${cpRegAll}
4. FTDs: ${totalFtd} | Taxa Cadastro→FTD: ${regToFtdRate}% | Custo/FTD: R$ ${cpFtdAll}\n\n`;

    const campAgg: Record<string, any> = {};
    if (campaignData) {
        for (const row of campaignData) {
            const key = `${row.platform}_${row.campaign_name}`;
            if (!campAgg[key]) {
                campAgg[key] = { name: row.campaign_name, platform: row.platform, spend: 0, conversions: 0, revenue: 0, ftd: 0, registrations: 0, leads: 0, messages: 0 };
            }
            campAgg[key].spend += Number(row.spend) || 0;
            campAgg[key].conversions += Number(row.conversions) || 0;
            campAgg[key].revenue += Number(row.revenue) || 0;
            campAgg[key].ftd += Number(row.ftd) || 0;
            campAgg[key].registrations += Number(row.leads) || 0;
            campAgg[key].messages += Number(row.messages) || 0;
        }
    }

    const topCampaigns = Object.values(campAgg).sort((a: any, b: any) => b.spend - a.spend).slice(0, 10);

    let campaignsSummary = "";
    topCampaigns.forEach((c: any) => {
        const cpa = c.conversions > 0 ? (c.spend / c.conversions).toFixed(2) : "0.00";
        const roas = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : "0.00";
        const cpFtd = c.ftd > 0 ? (c.spend / c.ftd).toFixed(2) : "N/A";
        const regToFtd = c.registrations > 0 ? ((c.ftd / c.registrations) * 100).toFixed(1) : "N/A";
        campaignsSummary += `[${c.platform.toUpperCase()}] ${c.name}
Spend: R$ ${c.spend.toFixed(2)} | Conversions: ${c.conversions} | CPA: R$ ${cpa} | ROAS: ${roas}x | FTDs: ${c.ftd} | Conv.Reg→FTD: ${regToFtd}% | Cost/FTD: R$ ${cpFtd}\n\n`;
    });

    return { metricsSummary, campaignsSummary, creativeSummary: "" };
}

// ─── AI response handler ───

async function handleAIResponse(messageContent: string, client_id: string, supabase: any) {
    // Strip the analysis reasoning block if present (prefill technique)
    let jsonContent = messageContent;
    const analysisEndIdx = messageContent.indexOf("</analysis>");
    if (analysisEndIdx !== -1) {
        jsonContent = messageContent.substring(analysisEndIdx + "</analysis>".length).trim();
    }

    let parsedResponse: any;
    try {
        const startIdx = jsonContent.indexOf("{");
        const endIdx = jsonContent.lastIndexOf("}") + 1;
        if (startIdx === -1 || endIdx === 0) throw new Error("No JSON object found in response");
        parsedResponse = JSON.parse(jsonContent.substring(startIdx, endIdx));
    } catch (e) {
        // Fallback: try parsing as array (old format)
        try {
            const startIdx = jsonContent.indexOf("[");
            const endIdx = jsonContent.lastIndexOf("]") + 1;
            if (startIdx === -1 || endIdx === 0) throw new Error("No JSON found");
            const insights = JSON.parse(jsonContent.substring(startIdx, endIdx));
            parsedResponse = { insights, plano_acao: [] };
        } catch {
            console.error("Failed to parse AI response:", messageContent);
            throw new Error("AI response was not valid JSON");
        }
    }

    const insights = parsedResponse.insights || [];
    const planoAcao = parsedResponse.plano_acao || [];

    // Save insights to optimization_tasks (best-effort)
    const { data: linkById } = await supabase
        .from("client_manager_links").select("id").eq("id", client_id).maybeSingle();

    let taskClientId: string | null = linkById?.id ?? null;

    if (!taskClientId) {
        const { data: linkByUserId } = await supabase
            .from("client_manager_links").select("id").eq("client_user_id", client_id).limit(1).maybeSingle();
        taskClientId = linkByUserId?.id ?? null;
    }

    if (taskClientId) {
        const tasksToInsert = insights.map((insight: any) => ({
            client_id: taskClientId,
            title: insight.title,
            description: insight.description,
            status: "TODO",
            auto_generated: true,
        }));
        const { error: insErr } = await supabase.from("optimization_tasks").insert(tasksToInsert);
        if (insErr) console.error("Failed to insert tasks:", insErr);
    }

    return new Response(JSON.stringify({ insights, plano_acao: planoAcao }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// ─── Call Anthropic Claude ───

async function callAnthropic(systemPrompt: string, messages: { role: string; content: string }[], apiKey: string): Promise<string> {
    const PRIMARY_MODEL = "claude-sonnet-4-20250514";
    const FALLBACK_MODEL = "claude-3-5-sonnet-20241022";

    async function callModel(model: string): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 150000); // 150s

        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
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
                console.error("[analyze-client] Anthropic error:", res.status, errData);

                if (errData?.error?.type === "not_found_error" || res.status === 404) {
                    throw Object.assign(new Error("model_not_found"), { type: "not_found" });
                }
                if (typeof errData?.error?.message === "string" && errData.error.message.includes("credit balance is too low")) {
                    throw new Error("Saldo de créditos Anthropic insuficiente. Verifique sua conta em console.anthropic.com.");
                }
                if (res.status === 429) {
                    throw new Error("Limite de requisições Anthropic atingido. Aguarde alguns segundos e tente novamente.");
                }
                throw new Error(`Anthropic retornou status ${res.status}: ${errData?.error?.message || "erro desconhecido"}`);
            }

            const aiData = await res.json();
            const text = aiData.content?.[0]?.text;
            if (!text) throw new Error("Resposta vazia da IA.");
            return text;
        } finally {
            clearTimeout(timeout);
        }
    }

    try {
        return await callModel(PRIMARY_MODEL);
    } catch (e: any) {
        if (e.type === "not_found") {
            console.warn("[analyze-client] Primary model not found, trying fallback:", FALLBACK_MODEL);
            return await callModel(FALLBACK_MODEL);
        }
        throw e;
    }
}

// ─── Main handler ───

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { client_id, days = 30 } = await req.json();
        if (!client_id) throw new Error("Missing client_id");

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!anthropicApiKey) throw new Error("Missing ANTHROPIC_API_KEY");

        const supabase = createClient(supabaseUrl, supabaseKey);

        // ─── Auth check ───
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ error: "Unauthorized", insights: [] }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (userErr || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized", insights: [] }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─── Role check ───
        const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .limit(1);
        const userRole = roles?.[0]?.role;
        if (userRole === "client") {
            return new Response(
                JSON.stringify({ error: "Acesso negado", insights: [] }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        const endDateStr = endDate.toISOString().split("T")[0];
        const startDateStr = startDate.toISOString().split("T")[0];

        let metricsSummary = "";
        let campaignsSummary = "";
        let creativeSummary = "";
        let dataSource = "database";

        // ─── Fetch client analysis config ───
        const { data: analysisConfig } = await supabase
            .from("client_analysis_config")
            .select("ftd_event_name, ftd_google_conversion_name, vertical, primary_metric, primary_metric_label, cpa_target, roas_target, monthly_budget, cost_per_ftd_target")
            .eq("client_id", client_id)
            .maybeSingle();

        const clientConfig: AnalysisClientConfig | null = analysisConfig ? {
            ftd_event_name: analysisConfig.ftd_event_name,
            ftd_google_conversion_name: analysisConfig.ftd_google_conversion_name,
            vertical: analysisConfig.vertical,
        } : null;

        // Build targets context for the prompt
        let targetsContext = "";
        if (analysisConfig) {
            const parts: string[] = [];
            if (analysisConfig.cpa_target) parts.push(`Meta CPA: R$ ${analysisConfig.cpa_target}`);
            if (analysisConfig.roas_target) parts.push(`Meta ROAS: ${analysisConfig.roas_target}x`);
            if (analysisConfig.monthly_budget) parts.push(`Orçamento mensal: R$ ${analysisConfig.monthly_budget}`);
            if (analysisConfig.cost_per_ftd_target) parts.push(`Meta Custo/FTD: R$ ${analysisConfig.cost_per_ftd_target}`);
            if (parts.length > 0) targetsContext = `\nMETAS DO CLIENTE: ${parts.join(" | ")}\n`;
        }

        // ─── Try live Meta API first ───
        try {
            const { data: link } = await supabase
                .from("client_manager_links")
                .select("manager_id, client_user_id")
                .or(`client_user_id.eq.${client_id},id.eq.${client_id}`)
                .limit(1)
                .maybeSingle();

            if (link?.manager_id) {
                const { data: metaConn } = await supabase
                    .from("oauth_connections")
                    .select("access_token")
                    .eq("manager_id", link.manager_id)
                    .eq("provider", "meta_ads")
                    .eq("connected", true)
                    .maybeSingle();

                const clientUserId = link.client_user_id || client_id;
                const { data: metaAccounts } = await supabase
                    .from("client_meta_ad_accounts")
                    .select("ad_account_id")
                    .eq("client_user_id", clientUserId);

                const adAccountIds = (metaAccounts || []).map((a: any) => a.ad_account_id);

                if (metaConn?.access_token && adAccountIds.length > 0) {
                    console.log(`[analyze-client] Fetching live Meta data with creative metrics: ${adAccountIds.length} accounts, ${days} days`);
                    const liveData = await fetchMetaLiveData(
                        metaConn.access_token,
                        adAccountIds,
                        { since: startDateStr, until: endDateStr },
                        clientConfig
                    );

                    if (liveData.metrics.spend > 0 || liveData.campaigns.length > 0) {
                        const prompt = buildMetaLivePrompt(liveData, days);
                        metricsSummary = prompt.metricsSummary;
                        campaignsSummary = prompt.campaignsSummary;
                        creativeSummary = prompt.creativeSummary;
                        dataSource = "meta_live";
                        console.log(`[analyze-client] Live data: Spend R$ ${liveData.metrics.spend.toFixed(2)}, ${liveData.campaigns.length} campaigns, ${liveData.creatives.length} creatives`);
                    }
                }
            }
        } catch (metaErr) {
            console.warn("[analyze-client] Live Meta fetch failed, falling back to DB:", metaErr);
        }

        // ─── Fallback to database ───
        if (dataSource === "database") {
            console.log("[analyze-client] Using database fallback");

            const { data: metricsData, error: metricsErr } = await supabase
                .from("daily_metrics")
                .select("platform, spend, impressions, clicks, conversions, revenue, date, ftd, cost_per_ftd, purchases, registrations")
                .eq("client_id", client_id)
                .gte("date", startDateStr)
                .lte("date", endDateStr);

            if (metricsErr) throw metricsErr;

            if (!metricsData || metricsData.length === 0) {
                return new Response(
                    JSON.stringify({ error: "Dados insuficientes para análise (mínimo 1 dia)", insights: [] }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { data: campaignDataRaw } = await supabase
                .from("daily_campaigns")
                .select("campaign_name, platform, spend, clicks, conversions, revenue, ftd, leads, messages, purchases, campaign_status")
                .eq("client_id", client_id)
                .gte("date", startDateStr)
                .lte("date", endDateStr);

            // Filter out paused campaigns — status can be "PAUSED", "Pausada", "paused", etc.
            const campaignData = (campaignDataRaw || []).filter((c: any) =>
                !c.campaign_status?.toLowerCase().includes("paus")
            );

            const dbPrompt = buildDbPrompt(metricsData, campaignData);
            metricsSummary = dbPrompt.metricsSummary;
            campaignsSummary = dbPrompt.campaignsSummary;
        }

        // ─── Build system prompt (persona + methodology + output schema) ───
        const verticalLabel = VERTICAL_LABELS[analysisConfig?.vertical || ""] || "performance marketing digital";
        const benchmarks = VERTICAL_BENCHMARKS[analysisConfig?.vertical || ""] || VERTICAL_BENCHMARKS["ecommerce"];

        const systemPrompt = `Você é um analista sênior de performance marketing digital especializado em ${verticalLabel} e otimização de criativos.

SUA FILOSOFIA DE ANÁLISE:
Você não descreve métricas — você diagnostica CAUSAS. Quando uma campanha tem CPA alto, você investiga POR QUE: fadiga de criativo? público saturado? posicionamento errado? funil quebrado? Você sempre responde com números concretos em R$, comparações entre campanhas, e projeções de impacto financeiro.

METODOLOGIA (em ordem de prioridade):

1. ROI/ROAS POR CAMPANHA: Calcule o retorno real de cada campanha. Identifique quais geram lucro e quais geram prejuízo. Projete o impacto de redistribuir budget das campanhas com ROAS ruim para as com ROAS bom, sempre em R$.

2. DIAGNÓSTICO CAUSAL DO FUNIL: Para cada etapa (Impressão→Clique→Conversão), identifique o maior gargalo. Não diga apenas "CTR está baixo" — explique POR QUE está baixo (criativo fraco? público amplo demais? posicionamento Stories vs Feed?).

3. CORRELAÇÃO ENTRE CAMPANHAS: Compare campanhas entre si. Quando uma tem ROAS 3x e outra 0.5x, investigue o que as diferencia (público, criativo, posicionamento, objetivo de campanha). Use essas diferenças para recomendar ações.

4. ANÁLISE DE CRIATIVOS (quando dados disponíveis): Analise hook rate (primeiros 3s) e hold rate (retenção completa). Criativos com bom hook mas baixo hold = conteúdo pós-gancho fraco. Cruze com conversões para encontrar os criativos campeões.

5. OTIMIZAÇÃO DE BUDGET: Recomende valores específicos em R$ para escalar, pausar ou redistribuir. Sempre justifique com base no ROI.

6. QUALIDADE DO TRÁFEGO: Se há muitos cadastros mas poucas conversões finais, o tráfego é de baixa qualidade. Identifique quais campanhas trazem tráfego ruim.

REFERÊNCIAS DE BENCHMARK PARA ${verticalLabel.toUpperCase()}:
${benchmarks}

REGRAS DE QUALIDADE:
- Cada insight deve ter 3-6 frases com diagnóstico causal (POR QUE), números em R$ e %, e nome completo da campanha
- Projeções numéricas em R$ para cada recomendação de mudança de budget
- Use o nome COMPLETO das campanhas, nunca abrevie
- Se Revenue = 0 mas há conversões, sinalize que o rastreamento de receita pode estar incompleto

PROCESSO MENTAL (faça internamente antes de gerar a resposta):
- Calcule ROAS de cada campanha
- Identifique gargalos do funil
- Compare campanhas entre si
- Identifique padrões nos criativos

Retorne APENAS um JSON válido (sem markdown, sem backticks, sem texto antes ou depois) com esta estrutura:
{
  "insights": [
    {
      "title": "título curto e direto (max 15 palavras) — inclua nome da campanha quando relevante",
      "description": "explicação detalhada em 3-6 frases com diagnóstico causal, números em R$ e %, comparações entre campanhas, e projeção de impacto financeiro",
      "priority": "high | medium | low",
      "type": "optimization | alert | opportunity"
    }
  ],
  "plano_acao": [
    {
      "etapa": "Impressão → Clique | Clique → Cadastro | Cadastro → FTD | Criativos | Budget e Escala | ROI e Retorno | Correlação entre Campanhas",
      "diagnostico": "2-4 frases descrevendo o estado atual com números exatos E análise causal",
      "status": "critico | atencao | saudavel",
      "taxa_atual": "X.X%",
      "benchmark": "referência de benchmark para esta etapa",
      "acoes": [
        "ação específica com detalhes de COMO executar e impacto projetado em R$"
      ]
    }
  ]
}

Gere 6 a 15 insights e 4 a 7 itens de plano_acao. Deve incluir uma etapa "ROI e Retorno" e, se houver dados de criativos, uma etapa "Criativos".
Prioridades: high = ação imediata necessária, medium = importante mas não urgente, low = melhoria incremental.
Tipos: alert = algo está errado, optimization = melhoria de performance, opportunity = potencial de escala.
Todos os textos em português brasileiro.`;

        // ─── Build user message (data only) ───
        const userMessage = `DADOS DO CLIENTE — Últimos ${days} dias (fonte: ${dataSource === "meta_live" ? "API Meta ao vivo" : "banco de dados"}):
${targetsContext}

MÉTRICAS CONSOLIDADAS:
${metricsSummary || "Sem dados de métricas."}

CAMPANHAS ATIVAS (campanhas pausadas foram excluídas):
${campaignsSummary || "Sem dados de campanhas."}

${creativeSummary ? `MÉTRICAS DE CRIATIVOS (performance de vídeo por anúncio):
${creativeSummary}` : "Sem dados de criativos/vídeo disponíveis."}

Analise esses dados seguindo sua metodologia. Retorne APENAS o JSON.`;

        // ─── Call AI with system prompt ───
        const messages = [
            { role: "user", content: userMessage },
        ];

        const messageContent = await callAnthropic(systemPrompt, messages, anthropicApiKey);
        return handleAIResponse(messageContent, client_id, supabase);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return new Response(JSON.stringify({ error: error.message, insights: [] }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
