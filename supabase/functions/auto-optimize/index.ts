import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ───

interface AutomationRule {
    id: string;
    client_id: string;
    rule_type: "pause_high_cpa" | "scale_good_performer" | "pause_no_conversion" | "alert_only";
    is_active: boolean;
    condition: Record<string, any>;
    action: Record<string, any>;
}

interface ClientExecContext {
    client_id: string;
    manager_id: string;
    access_token: string;
    primary_metric: string;
    primary_metric_label: string;
    rules: AutomationRule[];
    campaigns: CampaignData[];
}

interface CampaignData {
    campaign_name: string;
    external_campaign_id: string | null;
    daily: DayCampaign[];
    total_spend: number;
    total_primary: number;
    total_revenue: number;
    total_clicks: number;
    cpa: number;
    roas: number;
    first_date: string;
    days_active: number;
}

interface DayCampaign {
    date: string;
    spend: number;
    primary: number;
    revenue: number;
    clicks: number;
}

interface ActionResult {
    action: string;
    campaign_name: string | null;
    external_campaign_id: string | null;
    status: "success" | "error" | "skipped";
    details: Record<string, any>;
    error_message?: string;
}

interface ClientSummary {
    paused: number;
    scaled: number;
    alerts: number;
    skipped: number;
    errors: number;
}

// ─── Safety constants ───

const MAX_ACTIONS_PER_CLIENT = 10;
const MAX_BUDGET_INCREASE_PCT = 30;
const MIN_CAMPAIGN_AGE_HOURS = 48;
const API_DELAY_MS = 500;

// ─── Helpers ───

function getPrimaryMetricValue(row: any, primaryMetric: string): number {
    return Number(row[primaryMetric]) || 0;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function daysBetween(dateStr: string, now: Date): number {
    const d = new Date(dateStr + "T00:00:00Z");
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Meta API: Pause campaign ───

async function metaPauseCampaign(
    externalCampaignId: string,
    accessToken: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const url = `https://graph.facebook.com/v19.0/${externalCampaignId}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: "PAUSED",
                access_token: accessToken,
            }),
        });

        const data = await res.json();
        if (data.error) {
            return { success: false, error: data.error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ─── Meta API: Update budget ───

async function metaUpdateBudget(
    externalCampaignId: string,
    newDailyBudgetCents: number,
    accessToken: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const url = `https://graph.facebook.com/v19.0/${externalCampaignId}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                daily_budget: Math.round(newDailyBudgetCents),
                access_token: accessToken,
            }),
        });

        const data = await res.json();
        if (data.error) {
            return { success: false, error: data.error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ─── Aggregate campaign data ───

function aggregateCampaignData(
    rows: any[],
    primaryMetric: string,
    now: Date
): CampaignData[] {
    const map: Record<string, CampaignData> = {};

    for (const row of rows) {
        const name = row.campaign_name;
        if (!map[name]) {
            map[name] = {
                campaign_name: name,
                external_campaign_id: row.external_campaign_id || null,
                daily: [],
                total_spend: 0,
                total_primary: 0,
                total_revenue: 0,
                total_clicks: 0,
                cpa: 0,
                roas: 0,
                first_date: row.date,
                days_active: 0,
            };
        }

        const spend = Number(row.spend) || 0;
        const primary = getPrimaryMetricValue(row, primaryMetric);
        const revenue = Number(row.revenue) || 0;
        const clicks = Number(row.clicks) || 0;

        map[name].total_spend += spend;
        map[name].total_primary += primary;
        map[name].total_revenue += revenue;
        map[name].total_clicks += clicks;
        map[name].daily.push({ date: row.date, spend, primary, revenue, clicks });

        // Track earliest date
        if (row.date < map[name].first_date) {
            map[name].first_date = row.date;
        }

        // Update external_campaign_id if we find one
        if (row.external_campaign_id && !map[name].external_campaign_id) {
            map[name].external_campaign_id = row.external_campaign_id;
        }
    }

    const campaigns = Object.values(map);
    for (const c of campaigns) {
        c.cpa = c.total_primary > 0 ? c.total_spend / c.total_primary : 0;
        c.roas = c.total_spend > 0 ? c.total_revenue / c.total_spend : 0;
        c.days_active = daysBetween(c.first_date, now);
        c.daily.sort((a, b) => a.date.localeCompare(b.date));
    }

    return campaigns;
}

// ─── Rule: pause_high_cpa ───

async function executePauseHighCpa(
    rule: AutomationRule,
    ctx: ClientExecContext,
    supabase: any,
    now: Date
): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    const cpaLimit = Number(rule.condition.cpa_limit) || 0;
    const minSpend = Number(rule.condition.min_spend) || 0;
    const lookbackDays = Number(rule.condition.lookback_days) || 7;

    if (cpaLimit <= 0) return results;

    for (const camp of ctx.campaigns) {
        // Filter to lookback window
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
        const cutoffStr = cutoffDate.toISOString().split("T")[0];
        const windowData = camp.daily.filter(d => d.date >= cutoffStr);

        const windowSpend = windowData.reduce((s, d) => s + d.spend, 0);
        const windowPrimary = windowData.reduce((s, d) => s + d.primary, 0);
        const windowCpa = windowPrimary > 0 ? windowSpend / windowPrimary : (windowSpend > 0 ? Infinity : 0);

        // Check conditions
        if (windowCpa <= cpaLimit) continue;
        if (windowSpend < minSpend) continue;

        // SAFETY: never pause campaign < 48h old
        if (camp.days_active < 2) {
            results.push({
                action: "paused_campaign",
                campaign_name: camp.campaign_name,
                external_campaign_id: camp.external_campaign_id,
                status: "skipped",
                details: {
                    reason: "Campanha com menos de 48h de vida",
                    cpa: windowCpa,
                    cpa_limit: cpaLimit,
                    days_active: camp.days_active,
                },
            });
            continue;
        }

        if (!camp.external_campaign_id) {
            results.push({
                action: "paused_campaign",
                campaign_name: camp.campaign_name,
                external_campaign_id: null,
                status: "skipped",
                details: { reason: "Sem external_campaign_id", cpa: windowCpa },
            });
            continue;
        }

        // Execute pause
        await sleep(API_DELAY_MS);
        const { success, error } = await metaPauseCampaign(camp.external_campaign_id, ctx.access_token);

        results.push({
            action: "paused_campaign",
            campaign_name: camp.campaign_name,
            external_campaign_id: camp.external_campaign_id,
            status: success ? "success" : "error",
            details: {
                cpa: Number(windowCpa.toFixed(2)),
                cpa_limit: cpaLimit,
                spend: Number(windowSpend.toFixed(2)),
                primary_metric: windowPrimary,
                lookback_days: lookbackDays,
            },
            error_message: error,
        });
    }

    return results;
}

// ─── Rule: scale_good_performer ───

async function executeScaleGoodPerformer(
    rule: AutomationRule,
    ctx: ClientExecContext,
    supabase: any,
    now: Date
): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    const roasMin = Number(rule.condition.roas_min) || 0;
    const budgetIncreasePct = Math.min(Number(rule.action.budget_increase_pct) || 0, MAX_BUDGET_INCREASE_PCT);
    const maxDailyBudget = Number(rule.action.max_daily_budget) || Infinity;

    if (roasMin <= 0 || budgetIncreasePct <= 0) return results;

    for (const camp of ctx.campaigns) {
        // Need at least 3 days of data
        const last3 = camp.daily.slice(-3);
        if (last3.length < 3) continue;

        // Check ROAS consistency — all 3 days must be above roas_min
        const allAbove = last3.every(d => {
            const dayRoas = d.spend > 0 ? d.revenue / d.spend : 0;
            return dayRoas >= roasMin;
        });

        if (!allAbove) continue;

        if (!camp.external_campaign_id) {
            results.push({
                action: "increased_budget",
                campaign_name: camp.campaign_name,
                external_campaign_id: null,
                status: "skipped",
                details: { reason: "Sem external_campaign_id", roas: camp.roas },
            });
            continue;
        }

        // Calculate current daily budget from average of last 3 days
        const avgDailySpend = last3.reduce((s, d) => s + d.spend, 0) / 3;

        // Calculate new budget
        let newBudget = avgDailySpend * (1 + budgetIncreasePct / 100);

        // HARD CAP: never increase more than 30% regardless of config
        const hardCapBudget = avgDailySpend * (1 + MAX_BUDGET_INCREASE_PCT / 100);
        newBudget = Math.min(newBudget, hardCapBudget);

        // HARD CAP: never exceed max_daily_budget
        newBudget = Math.min(newBudget, maxDailyBudget);

        // Don't bother if increase < 1%
        if (newBudget <= avgDailySpend * 1.01) continue;

        // Meta expects budget in centavos (cents)
        const newBudgetCents = newBudget * 100;

        await sleep(API_DELAY_MS);
        const { success, error } = await metaUpdateBudget(camp.external_campaign_id, newBudgetCents, ctx.access_token);

        results.push({
            action: "increased_budget",
            campaign_name: camp.campaign_name,
            external_campaign_id: camp.external_campaign_id,
            status: success ? "success" : "error",
            details: {
                previous_daily_budget: Number(avgDailySpend.toFixed(2)),
                new_daily_budget: Number(newBudget.toFixed(2)),
                increase_pct: budgetIncreasePct,
                roas_3d: Number(camp.roas.toFixed(2)),
                roas_min: roasMin,
            },
            error_message: error,
        });
    }

    return results;
}

// ─── Rule: pause_no_conversion ───

async function executePauseNoConversion(
    rule: AutomationRule,
    ctx: ClientExecContext,
    supabase: any,
    now: Date
): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    const minSpend = Number(rule.config.min_spend) || 0;
    const minDays = Number(rule.config.min_days) || 3;

    for (const camp of ctx.campaigns) {
        // Must have at least min_days of data
        if (camp.daily.length < minDays) continue;

        // Last N days
        const lastNDays = camp.daily.slice(-minDays);
        const windowSpend = lastNDays.reduce((s, d) => s + d.spend, 0);
        const windowPrimary = lastNDays.reduce((s, d) => s + d.primary, 0);

        // Only trigger if spent > min_spend and ZERO conversions
        if (windowSpend < minSpend || windowPrimary > 0) continue;

        // SAFETY: never pause campaign < 48h old
        if (camp.days_active < 2) {
            results.push({
                action: "paused_campaign",
                campaign_name: camp.campaign_name,
                external_campaign_id: camp.external_campaign_id,
                status: "skipped",
                details: {
                    reason: "Campanha com menos de 48h de vida",
                    spend: windowSpend,
                    days: minDays,
                },
            });
            continue;
        }

        if (!camp.external_campaign_id) {
            results.push({
                action: "paused_campaign",
                campaign_name: camp.campaign_name,
                external_campaign_id: null,
                status: "skipped",
                details: { reason: "Sem external_campaign_id", spend: windowSpend },
            });
            continue;
        }

        await sleep(API_DELAY_MS);
        const { success, error } = await metaPauseCampaign(camp.external_campaign_id, ctx.access_token);

        results.push({
            action: "paused_campaign",
            campaign_name: camp.campaign_name,
            external_campaign_id: camp.external_campaign_id,
            status: success ? "success" : "error",
            details: {
                spend_in_period: Number(windowSpend.toFixed(2)),
                conversions_in_period: 0,
                min_days: minDays,
                primary_metric: ctx.primary_metric,
            },
            error_message: error,
        });
    }

    return results;
}

// ─── Rule: alert_only ───

function executeAlertOnly(
    rule: AutomationRule,
    ctx: ClientExecContext
): ActionResult[] {
    const results: ActionResult[] = [];
    const metric = rule.config.metric as string;
    const threshold = Number(rule.config.threshold) || 0;
    const direction = (rule.config.direction as string) || "above";

    if (!metric || threshold <= 0) return results;

    for (const camp of ctx.campaigns) {
        let value = 0;

        switch (metric) {
            case "cpa":
                value = camp.cpa;
                break;
            case "roas":
                value = camp.roas;
                break;
            case "spend":
                value = camp.total_spend;
                break;
            case "clicks":
                value = camp.total_clicks;
                break;
            default:
                value = camp.cpa; // default to CPA
        }

        const triggered =
            direction === "above" ? value > threshold : value < threshold;

        if (triggered) {
            results.push({
                action: "alert_sent",
                campaign_name: camp.campaign_name,
                external_campaign_id: camp.external_campaign_id,
                status: "success",
                details: {
                    metric,
                    value: Number(value.toFixed(2)),
                    threshold,
                    direction,
                },
            });
        }
    }

    return results;
}

// ─── Process one client ───

async function processClient(
    ctx: ClientExecContext,
    supabase: any,
    now: Date
): Promise<{ summary: ClientSummary; results: ActionResult[] }> {
    const summary: ClientSummary = { paused: 0, scaled: 0, alerts: 0, skipped: 0, errors: 0 };
    const allResults: ActionResult[] = [];
    let actionCount = 0;

    for (const rule of ctx.rules) {
        // SAFETY: cap actions per client
        if (actionCount >= MAX_ACTIONS_PER_CLIENT) {
            console.warn(`[auto-optimize] Max actions (${MAX_ACTIONS_PER_CLIENT}) reached for client ${ctx.client_id}`);
            break;
        }

        let results: ActionResult[] = [];

        try {
            switch (rule.rule_type) {
                case "pause_high_cpa":
                    results = await executePauseHighCpa(rule, ctx, supabase, now);
                    break;
                case "scale_good_performer":
                    results = await executeScaleGoodPerformer(rule, ctx, supabase, now);
                    break;
                case "pause_no_conversion":
                    results = await executePauseNoConversion(rule, ctx, supabase, now);
                    break;
                case "alert_only":
                    results = executeAlertOnly(rule, ctx);
                    break;
            }
        } catch (e: any) {
            console.error(`[auto-optimize] Rule ${rule.id} (${rule.rule_type}) error:`, e.message);
            results = [{
                action: rule.rule_type,
                campaign_name: null,
                external_campaign_id: null,
                status: "error",
                details: { rule_type: rule.rule_type },
                error_message: e.message,
            }];
        }

        // Enforce max actions — trim results if needed
        const remaining = MAX_ACTIONS_PER_CLIENT - actionCount;
        const trimmed = results.slice(0, remaining);

        // Log each result
        for (const r of trimmed) {
            try {
                await supabase.from("automation_log").insert({
                    client_id: ctx.client_id,
                    rule_id: rule.id,
                    action: r.action,
                    campaign_name: r.campaign_name,
                    external_campaign_id: r.external_campaign_id,
                    details: r.details,
                    status: r.status,
                    error_message: r.error_message || null,
                });
            } catch (logErr: any) {
                console.error("[auto-optimize] Failed to log action:", logErr.message);
            }

            // Update summary
            if (r.status === "error") {
                summary.errors++;
            } else if (r.status === "skipped") {
                summary.skipped++;
            } else if (r.action === "paused_campaign") {
                summary.paused++;
            } else if (r.action === "increased_budget") {
                summary.scaled++;
            } else if (r.action === "alert_sent") {
                summary.alerts++;
            }

            actionCount++;
        }

        allResults.push(...trimmed);
    }

    return { summary, results: allResults };
}

// ─── Main handler ───

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        let clientIdFilter: string | null = null;

        try {
            const body = await req.json();
            clientIdFilter = body.client_id || null;
        } catch {
            // Empty body = process all clients
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const now = new Date();

        // ─── 1. Fetch active rules ───
        let rulesQuery = supabase
            .from("automation_rules")
            .select("*")
            .eq("is_active", true);

        if (clientIdFilter) {
            rulesQuery = rulesQuery.eq("client_id", clientIdFilter);
        }

        const { data: allRules, error: rulesErr } = await rulesQuery;
        if (rulesErr) throw rulesErr;

        if (!allRules || allRules.length === 0) {
            return new Response(
                JSON.stringify({
                    total_actions: 0,
                    by_client: {},
                    message: "Nenhuma regra ativa encontrada.",
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Group rules by client_id
        const rulesByClient: Record<string, AutomationRule[]> = {};
        for (const rule of allRules) {
            if (!rulesByClient[rule.client_id]) {
                rulesByClient[rule.client_id] = [];
            }
            rulesByClient[rule.client_id].push(rule);
        }

        const clientIds = Object.keys(rulesByClient);
        console.log(`[auto-optimize] Processing ${clientIds.length} clients with ${allRules.length} active rules`);

        // ─── 2. Process each client ───
        const byClient: Record<string, ClientSummary> = {};
        let totalActions = 0;

        for (const clientId of clientIds) {
            try {
                const rules = rulesByClient[clientId];

                // Determine max lookback from all rules
                let maxLookback = 7;
                for (const r of rules) {
                    const lb = Number(r.config.lookback_days) || 7;
                    const md = Number(r.config.min_days) || 3;
                    maxLookback = Math.max(maxLookback, lb, md);
                }

                // ─── 2a. Fetch client_analysis_config ───
                const { data: analysisConfig } = await supabase
                    .from("client_analysis_config")
                    .select("primary_metric, primary_metric_label")
                    .eq("client_id", clientId)
                    .maybeSingle();

                const primaryMetric = analysisConfig?.primary_metric || "purchases";
                const primaryMetricLabel = analysisConfig?.primary_metric_label || "Compras";

                // ─── 2b. Fetch manager's oauth connection ───
                const { data: link } = await supabase
                    .from("client_manager_links")
                    .select("manager_id, client_user_id")
                    .or(`client_user_id.eq.${clientId},id.eq.${clientId}`)
                    .limit(1)
                    .maybeSingle();

                if (!link?.manager_id) {
                    console.warn(`[auto-optimize] No manager link for client ${clientId}`);
                    byClient[clientId] = { paused: 0, scaled: 0, alerts: 0, skipped: 0, errors: 0 };
                    continue;
                }

                const { data: metaConn } = await supabase
                    .from("oauth_connections")
                    .select("access_token")
                    .eq("manager_id", link.manager_id)
                    .eq("provider", "meta_ads")
                    .eq("connected", true)
                    .maybeSingle();

                if (!metaConn?.access_token) {
                    console.warn(`[auto-optimize] No Meta token for manager of client ${clientId}`);
                    byClient[clientId] = { paused: 0, scaled: 0, alerts: 0, skipped: 0, errors: 0 };
                    continue;
                }

                // ─── 2c. Fetch daily_campaigns ───
                const startDate = new Date(now);
                startDate.setDate(startDate.getDate() - maxLookback);
                const startDateStr = startDate.toISOString().split("T")[0];
                const endDateStr = now.toISOString().split("T")[0];

                const { data: campaignRows } = await supabase
                    .from("daily_campaigns")
                    .select("*")
                    .eq("client_id", clientId)
                    .gte("date", startDateStr)
                    .lte("date", endDateStr)
                    .order("date", { ascending: true });

                if (!campaignRows || campaignRows.length === 0) {
                    console.log(`[auto-optimize] No campaign data for client ${clientId}`);
                    byClient[clientId] = { paused: 0, scaled: 0, alerts: 0, skipped: 0, errors: 0 };
                    continue;
                }

                // ─── 2d. Aggregate campaigns ───
                const campaigns = aggregateCampaignData(campaignRows, primaryMetric, now);

                // ─── 2e. Build context and process ───
                const ctx: ClientExecContext = {
                    client_id: clientId,
                    manager_id: link.manager_id,
                    access_token: metaConn.access_token,
                    primary_metric: primaryMetric,
                    primary_metric_label: primaryMetricLabel,
                    rules,
                    campaigns,
                };

                const { summary, results } = await processClient(ctx, supabase, now);
                byClient[clientId] = summary;
                totalActions += summary.paused + summary.scaled + summary.alerts + summary.errors;

                console.log(
                    `[auto-optimize] Client ${clientId}: paused=${summary.paused}, scaled=${summary.scaled}, alerts=${summary.alerts}, skipped=${summary.skipped}, errors=${summary.errors}`
                );
            } catch (clientErr: any) {
                console.error(`[auto-optimize] Client ${clientId} error:`, clientErr.message);
                byClient[clientId] = { paused: 0, scaled: 0, alerts: 0, skipped: 0, errors: 1 };
            }
        }

        return new Response(
            JSON.stringify({
                total_actions: totalActions,
                clients_processed: clientIds.length,
                by_client: byClient,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        console.error("[auto-optimize] Fatal error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
