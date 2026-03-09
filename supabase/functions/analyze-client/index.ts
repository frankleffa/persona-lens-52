import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
            const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,clicks,actions,action_values&${dateParam}&access_token=${accessToken}`;
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

                const regActs = d.actions?.filter((a: any) =>
                    a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
                    a.action_type === "complete_registration" ||
                    a.action_type === "lead" ||
                    a.action_type === "offsite_conversion.fb_pixel_lead"
                ) || [];
                metrics.registrations += regActs.reduce((s: number, a: any) => s + parseInt(a.value || "0"), 0);

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
                                const insUrl = `https://graph.facebook.com/v19.0/${camp.id}/insights?fields=spend,impressions,clicks,actions,action_values&${dateParam}&access_token=${accessToken}`;
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
                        const rActs = actions.filter((a: any) =>
                            a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
                            a.action_type === "complete_registration" ||
                            a.action_type === "lead" ||
                            a.action_type === "offsite_conversion.fb_pixel_lead"
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
                            registrations: rActs.reduce((s: number, a: any) => s + parseInt(a.value || "0"), 0),
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
                                    const adInsUrl = `https://graph.facebook.com/v19.0/${ad.id}/insights?fields=spend,impressions,clicks,actions,video_avg_time_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions,cost_per_action_type&${dateParam}&access_token=${accessToken}`;
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
                            const adRegs = adActions.filter((a: any) =>
                                a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
                                a.action_type === "complete_registration" ||
                                a.action_type === "lead" ||
                                a.action_type === "offsite_conversion.fb_pixel_lead"
                            );
                            const totalConversions = (adPurchases ? parseInt(adPurchases.value || "0") : 0) +
                                adRegs.reduce((s: number, a: any) => s + parseInt(a.value || "0"), 0);

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

    metrics.leads = metrics.purchases + metrics.registrations;

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
    let parsedResponse: any;
    try {
        const startIdx = messageContent.indexOf("{");
        const endIdx = messageContent.lastIndexOf("}") + 1;
        if (startIdx === -1 || endIdx === 0) throw new Error("No JSON object found in response");
        parsedResponse = JSON.parse(messageContent.substring(startIdx, endIdx));
    } catch (e) {
        // Fallback: try parsing as array (old format)
        try {
            const startIdx = messageContent.indexOf("[");
            const endIdx = messageContent.lastIndexOf("]") + 1;
            if (startIdx === -1 || endIdx === 0) throw new Error("No JSON found");
            const insights = JSON.parse(messageContent.substring(startIdx, endIdx));
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

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
    const PRIMARY_MODEL = "claude-sonnet-4-20250514";
    const FALLBACK_MODEL = "claude-3-5-sonnet-20241022";

    async function callModel(model: string): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);

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
                    max_tokens: 4000,
                    messages: [{ role: "user", content: prompt }],
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

            const { data: campaignData } = await supabase
                .from("daily_campaigns")
                .select("campaign_name, platform, spend, clicks, conversions, revenue, ftd, leads, messages, purchases")
                .eq("client_id", client_id)
                .gte("date", startDateStr)
                .lte("date", endDateStr);

            const dbPrompt = buildDbPrompt(metricsData, campaignData || []);
            metricsSummary = dbPrompt.metricsSummary;
            campaignsSummary = dbPrompt.campaignsSummary;
        }

        // ─── Build final prompt ───
        const prompt = `You are a senior performance marketing analyst specialized in iGaming / betting verticals and creative optimization. Your PRIMARY objective is to provide a COMPLETE, ACTIONABLE analysis with specific HOW-TO recommendations for every stage of the funnel.

Analyze the following advertising data and provide a comprehensive analysis in Portuguese (Brazil).

CLIENT DATA - Last ${days} days (source: ${dataSource === "meta_live" ? "API Meta ao vivo" : "banco de dados"}):
${targetsContext}

OVERALL METRICS:
${metricsSummary || "Sem dados de métricas."}

TOP CAMPAIGNS:
${campaignsSummary || "Sem dados de campanhas."}

${creativeSummary ? `CREATIVE / AD-LEVEL METRICS (Video Performance):
${creativeSummary}

REFERÊNCIAS DE HOOK/HOLD RATE:
- Hook Rate EXCELENTE: > 30% | BOM: 20-30% | FRACO: < 20%
- Hold Rate EXCELENTE: > 25% | BOM: 15-25% | FRACO: < 15%
- CTR EXCELENTE: > 2% | BOM: 1-2% | FRACO: < 1%
` : ""}

YOUR ANALYSIS MUST COVER ALL THESE AREAS:

1. **DIAGNÓSTICO DO FUNIL COMPLETO**: Para cada etapa (Impressão → Clique → Cadastro → FTD), identifique onde está o maior gargalo e qual é a taxa de conversão. Compare entre campanhas.

2. **ANÁLISE DE CRIATIVOS** (se dados de vídeo disponíveis):
   - Hook Rate: O criativo está parando o scroll? Quais anúncios prendem atenção nos primeiros 3 segundos e quais não?
   - Hold Rate: O conteúdo mantém a atenção? Quais vídeos as pessoas assistem até o final?
   - Relação entre Hook/Hold e conversões: Criativos com bom hook mas baixo hold indicam que o conteúdo depois do gancho é fraco.
   - Recomendações específicas de melhoria por criativo.

3. **OTIMIZAÇÃO DE CAMPANHAS**: Quais campanhas escalar, pausar, ajustar budget, com valores específicos.

4. **QUALIDADE DO TRÁFEGO**: Campanhas com muitos cadastros mas poucos FTDs = tráfego de baixa qualidade. Identifique e sugira ações.

5. **PLANO DE AÇÃO POR ETAPA DO FUNIL**: Para cada etapa onde há problema, diga EXATAMENTE o que fazer para melhorar.

Respond ONLY with a valid JSON object (no markdown, no explanation):
{
  "insights": [
    {
      "title": "short action title (max 10 words) — include campaign name when relevant",
      "description": "detailed explanation in 2-4 sentences. ALWAYS use FULL campaign names, specific metrics (R$, %, numbers), comparisons. Be precise.",
      "priority": "high" | "medium" | "low",
      "type": "optimization" | "alert" | "opportunity"
    }
  ],
  "plano_acao": [
    {
      "etapa": "Impressão → Clique" | "Clique → Cadastro" | "Cadastro → FTD" | "Criativos" | "Budget e Escala",
      "diagnostico": "1-2 sentences describing the current state of this funnel stage with exact numbers",
      "status": "critico" | "atencao" | "saudavel",
      "taxa_atual": "X.X%",
      "benchmark": "reference benchmark for this stage",
      "acoes": [
        "Ação específica 1 com detalhes de como executar",
        "Ação específica 2 com detalhes de como executar",
        "Ação específica 3 com detalhes de como executar"
      ]
    }
  ]
}

Rules:
- Generate 4 to 8 insights
- Generate 3 to 5 plano_acao items covering the full funnel
- Each insight MUST reference specific numbers from the data
- ALWAYS use the FULL campaign name exactly as shown — never shorten or truncate
- description should be detailed (2-4 sentences) with concrete numbers, comparisons and action steps
- plano_acao.acoes must be SPECIFIC and ACTIONABLE — not generic advice. Include what to change, how to change it, and expected impact
- If creative/video data is available, MUST include a "Criativos" etapa in plano_acao analyzing hook/hold rates
- high priority = needs immediate action
- alert = something is going wrong
- opportunity = potential to scale`;

        const messageContent = await callAnthropic(prompt, anthropicApiKey);
        return handleAIResponse(messageContent, client_id, supabase);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return new Response(JSON.stringify({ error: error.message, insights: [] }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
