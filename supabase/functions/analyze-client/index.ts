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
}

interface MetaLiveCampaign {
    name: string;
    spend: number;
    clicks: number;
    purchases: number;
    registrations: number;
    messages: number;
    revenue: number;
}

interface MetaLiveData {
    metrics: MetaLiveMetrics;
    campaigns: MetaLiveCampaign[];
    source: "meta_live";
}

async function fetchMetaLiveData(
    accessToken: string,
    adAccountIds: string[],
    timeRange: { since: string; until: string }
): Promise<MetaLiveData> {
    const dateParam = `time_range=${encodeURIComponent(JSON.stringify(timeRange))}`;
    const metrics: MetaLiveMetrics = { spend: 0, impressions: 0, clicks: 0, purchases: 0, registrations: 0, messages: 0, leads: 0, revenue: 0 };
    const allCampaigns: MetaLiveCampaign[] = [];

    // Limit to 5 accounts
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
                                const insUrl = `https://graph.facebook.com/v19.0/${camp.id}/insights?fields=spend,clicks,actions,action_values&${dateParam}&access_token=${accessToken}`;
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

                        allCampaigns.push({
                            name: camp.name,
                            spend,
                            clicks: parseInt(insRow.clicks || "0"),
                            purchases: pAct ? parseInt(pAct.value || "0") : 0,
                            registrations: rActs.reduce((s: number, a: any) => s + parseInt(a.value || "0"), 0),
                            messages: mAct ? parseInt(mAct.value || "0") : 0,
                            revenue: pVal ? parseFloat(pVal.value || "0") : 0,
                        });
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to fetch Meta data for account ${accountId}:`, e);
        }
    }

    metrics.leads = metrics.purchases + metrics.registrations;

    // Sort campaigns by spend desc, top 20
    allCampaigns.sort((a, b) => b.spend - a.spend);

    return { metrics, campaigns: allCampaigns.slice(0, 20), source: "meta_live" };
}

// ─── Build prompt from live Meta data ───

function buildMetaLivePrompt(data: MetaLiveData, days: number): string {
    const m = data.metrics;
    const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) : "0.00";
    const cpc = m.clicks > 0 ? (m.spend / m.clicks).toFixed(2) : "0.00";
    const roas = m.spend > 0 ? (m.revenue / m.spend).toFixed(2) : "0.00";
    const cpPurchase = m.purchases > 0 ? (m.spend / m.purchases).toFixed(2) : "N/A";
    const cpRegistration = m.registrations > 0 ? (m.spend / m.registrations).toFixed(2) : "N/A";

    let metricsSummary = `Platform: META ADS (dados ao vivo da API)
Spend: R$ ${m.spend.toFixed(2)} | Revenue: R$ ${m.revenue.toFixed(2)} | ROAS: ${roas}x
Impressions: ${m.impressions} | Clicks: ${m.clicks} | CTR: ${ctr}% | CPC: R$ ${cpc}
Purchases: ${m.purchases} | Cost per Purchase: R$ ${cpPurchase}
Registrations/Leads: ${m.registrations} | Cost per Registration: R$ ${cpRegistration}
Messages: ${m.messages}
Total Leads (purchases + registrations): ${m.leads}\n\n`;

    let campaignsSummary = "";
    for (const c of data.campaigns) {
        const cpa = (c.purchases + c.registrations) > 0 ? (c.spend / (c.purchases + c.registrations)).toFixed(2) : "N/A";
        const campRoas = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : "0.00";
        campaignsSummary += `[META] ${c.name}
Spend: R$ ${c.spend.toFixed(2)} | Clicks: ${c.clicks} | Purchases: ${c.purchases} | Registrations: ${c.registrations} | Messages: ${c.messages} | Revenue: R$ ${c.revenue.toFixed(2)} | CPA: R$ ${cpa} | ROAS: ${campRoas}x\n\n`;
    }

    return { metricsSummary, campaignsSummary };
}

// ─── Build prompt from database data (fallback) ───

function buildDbPrompt(metricsData: any[], campaignData: any[]): { metricsSummary: string; campaignsSummary: string } {
    const platformMetrics: Record<string, any> = {};
    for (const row of metricsData) {
        if (!platformMetrics[row.platform]) {
            platformMetrics[row.platform] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
        }
        platformMetrics[row.platform].spend += Number(row.spend) || 0;
        platformMetrics[row.platform].impressions += Number(row.impressions) || 0;
        platformMetrics[row.platform].clicks += Number(row.clicks) || 0;
        platformMetrics[row.platform].conversions += Number(row.conversions) || 0;
        platformMetrics[row.platform].revenue += Number(row.revenue) || 0;
    }

    let metricsSummary = "";
    Object.keys(platformMetrics).forEach((platform) => {
        const m = platformMetrics[platform];
        const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) : "0.00";
        const cpc = m.clicks > 0 ? (m.spend / m.clicks).toFixed(2) : "0.00";
        const cpa = m.conversions > 0 ? (m.spend / m.conversions).toFixed(2) : "0.00";
        const roas = m.spend > 0 ? (m.revenue / m.spend).toFixed(2) : "0.00";

        metricsSummary += `Platform: ${platform.toUpperCase()} (dados do banco)
Spend: R$ ${m.spend.toFixed(2)} | Revenue: R$ ${m.revenue.toFixed(2)} | ROAS: ${roas}x
Impressions: ${m.impressions} | Clicks: ${m.clicks} | CTR: ${ctr}% | CPC: R$ ${cpc}
Conversions: ${m.conversions} | CPA: R$ ${cpa}\n\n`;
    });

    const campAgg: Record<string, any> = {};
    if (campaignData) {
        for (const row of campaignData) {
            const key = `${row.platform}_${row.campaign_name}`;
            if (!campAgg[key]) {
                campAgg[key] = { name: row.campaign_name, platform: row.platform, spend: 0, conversions: 0, revenue: 0 };
            }
            campAgg[key].spend += Number(row.spend) || 0;
            campAgg[key].conversions += Number(row.conversions) || 0;
            campAgg[key].revenue += Number(row.revenue) || 0;
        }
    }

    const topCampaigns = Object.values(campAgg).sort((a: any, b: any) => b.spend - a.spend).slice(0, 10);

    let campaignsSummary = "";
    topCampaigns.forEach((c: any) => {
        const cpa = c.conversions > 0 ? (c.spend / c.conversions).toFixed(2) : "0.00";
        const roas = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : "0.00";
        campaignsSummary += `[${c.platform.toUpperCase()}] ${c.name}
Spend: R$ ${c.spend.toFixed(2)} | Conversions: ${c.conversions} | CPA: R$ ${cpa} | ROAS: ${roas}x\n\n`;
    });

    return { metricsSummary, campaignsSummary };
}

// ─── AI response handler ───

async function handleAIResponse(messageContent: string, client_id: string, supabase: any) {
    let parsedInsights = [];
    try {
        const startIdx = messageContent.indexOf("[");
        const endIdx = messageContent.lastIndexOf("]") + 1;
        if (startIdx === -1 || endIdx === 0) throw new Error("No JSON array found in response");
        parsedInsights = JSON.parse(messageContent.substring(startIdx, endIdx));
    } catch (e) {
        console.error("Failed to parse AI response:", messageContent);
        throw new Error("AI response was not valid JSON");
    }

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
        const tasksToInsert = parsedInsights.map((insight: any) => ({
            client_id: taskClientId,
            title: insight.title,
            description: insight.description,
            status: "TODO",
            auto_generated: true,
        }));
        const { error: insErr } = await supabase.from("optimization_tasks").insert(tasksToInsert);
        if (insErr) console.error("Failed to insert tasks:", insErr);
    } else {
        console.warn(`Skipping optimization_tasks insert: no matching link for client_id=${client_id}`);
    }

    return new Response(JSON.stringify({ insights: parsedInsights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// ─── Call Anthropic ───

async function callAnthropic(prompt: string, anthropicKey: string): Promise<string> {
    const body = JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
    });
    const headers = {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
    };

    let res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body });

    // Fallback model if not found
    if (!res.ok) {
        const errText = await res.text();
        console.error("Anthropic API Error:", errText);

        if (errText.includes("not_found")) {
            const fallbackBody = JSON.stringify({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1500,
                messages: [{ role: "user", content: prompt }],
            });
            res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: fallbackBody });
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
    return aiData.content[0].text;
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
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!anthropicKey) throw new Error("Missing Anthropic API Key");

        const supabase = createClient(supabaseUrl, supabaseKey);

        // ─── Role check: only managers/admins can use AI analysis ───
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
                        JSON.stringify({ error: "Acesso negado", insights: [] }),
                        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            }
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        const endDateStr = endDate.toISOString().split("T")[0];
        const startDateStr = startDate.toISOString().split("T")[0];

        let metricsSummary = "";
        let campaignsSummary = "";
        let dataSource = "database";

        // ─── Try live Meta API first ───
        try {
            // 1. Resolve manager_id from client_manager_links
            const { data: link } = await supabase
                .from("client_manager_links")
                .select("manager_id, client_user_id")
                .or(`client_user_id.eq.${client_id},id.eq.${client_id}`)
                .limit(1)
                .maybeSingle();

            if (link?.manager_id) {
                // 2. Get Meta oauth connection for this manager
                const { data: metaConn } = await supabase
                    .from("oauth_connections")
                    .select("access_token")
                    .eq("manager_id", link.manager_id)
                    .eq("provider", "meta_ads")
                    .eq("connected", true)
                    .maybeSingle();

                // 3. Get client's Meta ad accounts
                const clientUserId = link.client_user_id || client_id;
                const { data: metaAccounts } = await supabase
                    .from("client_meta_ad_accounts")
                    .select("ad_account_id")
                    .eq("client_user_id", clientUserId);

                const adAccountIds = (metaAccounts || []).map((a: any) => a.ad_account_id);

                if (metaConn?.access_token && adAccountIds.length > 0) {
                    console.log(`[analyze-client] Fetching live Meta data: ${adAccountIds.length} accounts, ${days} days`);
                    const liveData = await fetchMetaLiveData(
                        metaConn.access_token,
                        adAccountIds,
                        { since: startDateStr, until: endDateStr }
                    );

                    if (liveData.metrics.spend > 0 || liveData.campaigns.length > 0) {
                        const prompt = buildMetaLivePrompt(liveData, days);
                        metricsSummary = prompt.metricsSummary;
                        campaignsSummary = prompt.campaignsSummary;
                        dataSource = "meta_live";
                        console.log(`[analyze-client] Using live Meta data. Spend: R$ ${liveData.metrics.spend.toFixed(2)}, Campaigns: ${liveData.campaigns.length}`);
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
                .select("platform, spend, impressions, clicks, conversions, revenue, date")
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
                .select("campaign_name, platform, spend, clicks, conversions, revenue")
                .eq("client_id", client_id)
                .gte("date", startDateStr)
                .lte("date", endDateStr);

            const dbPrompt = buildDbPrompt(metricsData, campaignData || []);
            metricsSummary = dbPrompt.metricsSummary;
            campaignsSummary = dbPrompt.campaignsSummary;
        }

        // ─── Build final prompt ───
        const prompt = `You are a senior performance marketing analyst specialized in iGaming / betting verticals. Your PRIMARY objective is to help reduce Cost per FTD (First Time Deposit) and increase FTD volume.

Treat "purchases" and "registrations" in the data as proxies for FTD (First Time Deposit). Analyze the following advertising data and provide actionable recommendations in Portuguese (Brazil).

CLIENT DATA - Last ${days} days (source: ${dataSource === "meta_live" ? "API Meta ao vivo" : "banco de dados"}):

OVERALL METRICS:
${metricsSummary || "Sem dados de métricas."}

TOP CAMPAIGNS:
${campaignsSummary || "Sem dados de campanhas."}

YOUR ANALYSIS MUST PRIORITIZE:
1. **Reduzir Custo por FTD**: Identificar campanhas com CPA (custo por conversão) acima da média e recomendar pausar, reduzir budget ou ajustar segmentação. Comparar CPAs entre campanhas.
2. **Aumentar Volume de FTDs**: Identificar campanhas eficientes (baixo CPA, bom volume) e recomendar escalar budget, duplicar para novos públicos ou testar lookalikes.
3. **Realocação de Budget**: Sugerir mover budget de campanhas caras para campanhas eficientes, com valores específicos.
4. **Oportunidades de Escala**: Campanhas com bom ROAS/CPA que ainda têm margem para escalar.

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {
    "title": "short action title (max 10 words) — include campaign name when relevant",
    "description": "detailed explanation in 2-4 sentences. Always include the FULL campaign name (never truncate), specific metrics (R$, %, numbers), comparisons between campaigns, and a clear actionable recommendation. Be precise about what to do and why.",
    "priority": "high" | "medium" | "low",
    "type": "optimization" | "alert" | "opportunity"
  }
]

Rules:
- Generate 3 to 6 insights maximum
- Each insight MUST reference specific numbers from the data
- ALWAYS use the FULL campaign name exactly as shown in the data — never shorten or truncate
- description should be detailed (2-4 sentences) with concrete numbers, comparisons and action steps
- Focus on FTD cost reduction and volume increase — every insight should relate to improving FTD metrics
- high priority = needs immediate action (e.g. campaign burning budget with zero or very high cost FTDs)
- alert = something is going wrong (high CPA, dropping conversions, wasted spend)
- opportunity = potential to scale FTDs (efficient campaigns that can receive more budget)`;

        const messageContent = await callAnthropic(prompt, anthropicKey);
        return handleAIResponse(messageContent, client_id, supabase);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return new Response(JSON.stringify({ error: error.message, insights: [] }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
