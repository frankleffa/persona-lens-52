import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { client_id, days = 30 } = await req.json();

        if (!client_id) {
            throw new Error("Missing client_id");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

        if (!anthropicKey) {
            throw new Error("Missing Anthropic API Key");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Calculate start and end dates
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const endDateStr = endDate.toISOString().split("T")[0];
        const startDateStr = startDate.toISOString().split("T")[0];

        // 1. Fetch daily_metrics for this client (grouped by platform logic below)
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

        // Check if client has at least 3 days of data
        const uniqueDates = new Set(metricsData.map((m) => m.date));
        if (uniqueDates.size < 1) {
            return new Response(
                JSON.stringify({ error: "Dados insuficientes para análise (mínimo 1 dia)", insights: [] }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Aggregate metrics by platform
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

            metricsSummary += `Platform: ${platform.toUpperCase()}
Spend: R$ ${m.spend.toFixed(2)} | Revenue: R$ ${m.revenue.toFixed(2)} | ROAS: ${roas}x
Impressions: ${m.impressions} | Clicks: ${m.clicks} | CTR: ${ctr}% | CPC: R$ ${cpc}
Conversions: ${m.conversions} | CPA: R$ ${cpa}\n\n`;
        });

        // 2. Fetch daily_campaigns for this client
        const { data: campaignData, error: campErr } = await supabase
            .from("daily_campaigns")
            .select("campaign_name, platform, spend, clicks, conversions, revenue")
            .eq("client_id", client_id)
            .gte("date", startDateStr)
            .lte("date", endDateStr);

        if (campErr) throw campErr;

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

        // Top 10 by spend
        const topCampaigns = Object.values(campAgg)
            .sort((a, b) => b.spend - a.spend)
            .slice(0, 10);

        let campaignsSummary = "";
        topCampaigns.forEach((c: any) => {
            const cpa = c.conversions > 0 ? (c.spend / c.conversions).toFixed(2) : "0.00";
            const roas = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : "0.00";
            campaignsSummary += `[${c.platform.toUpperCase()}] ${c.name}
Spend: R$ ${c.spend.toFixed(2)} | Conversions: ${c.conversions} | CPA: R$ ${cpa} | ROAS: ${roas}x\n\n`;
        });

        const prompt = `You are a senior performance marketing analyst. Analyze the following advertising data and provide actionable recommendations in Portuguese (Brazil).

CLIENT DATA - Last ${days} days:

OVERALL METRICS:
${metricsSummary || "Sem dados de métricas."}

TOP CAMPAIGNS:
${campaignsSummary || "Sem dados de campanhas."}

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {
    "title": "short action title (max 8 words)",
    "description": "specific explanation with the actual numbers from the data",
    "priority": "high" | "medium" | "low",
    "type": "optimization" | "alert" | "opportunity"
  }
]

Rules:
- Generate 3 to 6 insights maximum
- Each insight must reference specific numbers from the data
- Focus on actionable recommendations, not just observations
- high priority = needs immediate action
- alert = something is going wrong
- opportunity = potential to improve results`;

        // 3. Call Claude API
        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": anthropicKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1500,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            console.error("Anthropic API Error:", errText);

            // Fallback model if requested wasn't valid yet
            if (errText.includes("not_found")) {
                const fallbackRes = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": anthropicKey,
                        "anthropic-version": "2023-06-01",
                    },
                    body: JSON.stringify({
                        model: "claude-3-5-sonnet-20241022",
                        max_tokens: 1500,
                        messages: [{ role: "user", content: prompt }],
                    }),
                });

                if (!fallbackRes.ok) {
                    const fallbackErrText = await fallbackRes.text();
                    console.error("Anthropic fallback API Error:", fallbackErrText);

                    const isLowCredit = fallbackErrText.toLowerCase().includes("credit balance is too low");
                    return new Response(
                        JSON.stringify({
                            error: isLowCredit
                                ? "Crédito da API de IA insuficiente. Confirme se a chave ANTHROPIC_API_KEY pertence à conta recarregada e aguarde alguns minutos para propagação."
                                : "Falha ao gerar análise com IA no provedor atual. Tente novamente em instantes.",
                            error_code: isLowCredit ? "ANTHROPIC_LOW_CREDIT" : "ANTHROPIC_API_ERROR",
                            insights: [],
                        }),
                        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const fbData = await fallbackRes.json();
                const fbMessageContent = fbData.content[0].text;
                return handleAIResponse(fbMessageContent, client_id, supabase);
            }

            const isLowCredit = errText.toLowerCase().includes("credit balance is too low");
            return new Response(
                JSON.stringify({
                    error: isLowCredit
                        ? "Crédito da API de IA insuficiente. Confirme se a chave ANTHROPIC_API_KEY pertence à conta recarregada e aguarde alguns minutos para propagação."
                        : "Falha ao gerar análise com IA no provedor atual. Tente novamente em instantes.",
                    error_code: isLowCredit ? "ANTHROPIC_LOW_CREDIT" : "ANTHROPIC_API_ERROR",
                    insights: [],
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const aiData = await anthropicRes.json();
        const messageContent = aiData.content[0].text;

        return handleAIResponse(messageContent, client_id, supabase);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return new Response(JSON.stringify({ error: error.message, insights: [] }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

async function handleAIResponse(messageContent: string, client_id: string, supabase: any) {
    let parsedInsights = [];
    try {
        const startIdx = messageContent.indexOf("[");
        const endIdx = messageContent.lastIndexOf("]") + 1;
        if (startIdx === -1 || endIdx === 0) {
            throw new Error("No JSON array found in response");
        }
        const cleanJson = messageContent.substring(startIdx, endIdx);
        parsedInsights = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse AI response:", messageContent);
        throw new Error("AI response was not valid JSON");
    }

    // 4. Save insights to optimization_tasks
    const tasksToInsert = parsedInsights.map((insight: any) => ({
        client_id,
        title: insight.title,
        description: insight.description,
        status: "TODO",
        auto_generated: true,
    }));

    const { error: insErr } = await supabase.from("optimization_tasks").insert(tasksToInsert);

    if (insErr) {
        console.error("Failed to insert tasks:", insErr);
        throw insErr;
    }

    return new Response(JSON.stringify({ insights: parsedInsights }), {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
    });
}
