import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API = "https://graph.facebook.com/v19.0";

function json(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Call Claude to generate execution plan ───

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<any> {
  const PRIMARY_MODEL = "claude-sonnet-4-20250514";
  const FALLBACK_MODEL = "claude-3-5-sonnet-20241022";

  async function tryModel(model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

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
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: { type: "unknown" } }));
        if (errData?.error?.type === "not_found_error" || res.status === 404) {
          throw Object.assign(new Error("model_not_found"), { type: "not_found" });
        }
        if (res.status === 429) {
          throw new Error("Limite de requisições Anthropic atingido. Aguarde alguns segundos.");
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
    return parseJSON(text);
  } catch (e: any) {
    if (e.type === "not_found") {
      console.warn("[claude-optimize] Fallback to", FALLBACK_MODEL);
      const text = await tryModel(FALLBACK_MODEL);
      return parseJSON(text);
    }
    throw e;
  }
}

function parseJSON(text: string): any {
  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Resposta da IA não contém JSON válido");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);

    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { action, client_id } = body;

    if (!client_id) return json({ error: "client_id é obrigatório" }, 400);

    // Verify access
    const { data: link } = await supabaseAdmin
      .from("client_manager_links")
      .select("id, client_label")
      .eq("client_user_id", client_id)
      .eq("manager_id", userId)
      .maybeSingle();

    if (!link) {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) return json({ error: "Sem permissão" }, 403);
    }

    // ─── ACTION: auto_plan — Claude analyzes ALL recommendations and builds executable plan ───
    if (action === "auto_plan") {
      const { recommendations } = body;
      if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
        return json({ error: "recommendations é obrigatório (array de recomendações da análise)" }, 400);
      }

      // Get current campaigns
      const { data: campaigns } = await supabaseAdmin
        .from("daily_campaigns")
        .select("campaign_name, external_campaign_id, platform, campaign_status, spend, clicks, conversions, leads, messages, purchases, registrations, ftd, account_id")
        .eq("client_id", client_id)
        .order("date", { ascending: false })
        .limit(100);

      const uniqueCampaigns = new Map();
      for (const c of campaigns || []) {
        if (c.external_campaign_id && !uniqueCampaigns.has(c.external_campaign_id)) {
          uniqueCampaigns.set(c.external_campaign_id, c);
        }
      }
      const campaignList = Array.from(uniqueCampaigns.values());

      // Get Meta accounts
      const { data: metaAccounts } = await supabaseAdmin
        .from("client_meta_ad_accounts")
        .select("ad_account_id")
        .eq("client_user_id", client_id);

      const systemPrompt = `Você é um sistema de otimização automática de campanhas de mídia paga.
Seu trabalho é transformar recomendações de análise em ações executáveis via API.

REGRAS CRÍTICAS:
1. Só gere ações para campanhas que EXISTEM na lista abaixo
2. Use SEMPRE o external_campaign_id (ID real) nas ações — NUNCA use o nome da campanha como ID
3. Ações disponíveis: update_status (ACTIVE/PAUSED), update_budget (valor em R$)
4. Para ações que NÃO podem ser executadas via API, use "manual_recommendation"
5. Seja conservador: prefira ações reversíveis
6. NUNCA pause todas as campanhas de uma vez
7. Limite de aumento de budget: máximo 30% por vez
8. Não pause campanhas com menos de 48h de dados
9. Sempre justifique cada ação com dados concretos

CAMPANHAS DISPONÍVEIS:
${JSON.stringify(campaignList.map(c => ({
  name: c.campaign_name,
  id: c.external_campaign_id,
  platform: c.platform,
  status: c.campaign_status,
  spend: c.spend,
  clicks: c.clicks,
  conversions: c.conversions,
  leads: c.leads,
  purchases: c.purchases,
  ftd: c.ftd,
  registrations: c.registrations,
  account_id: c.account_id,
})), null, 2)}

CONTAS META: ${(metaAccounts || []).map(a => a.ad_account_id).join(", ") || "nenhuma"}

Retorne APENAS JSON válido com esta estrutura:
{
  "summary": "Resumo geral do plano de otimização (1-2 frases)",
  "risk_level": "baixo" | "medio" | "alto",
  "expected_impact": "Impacto esperado geral (ex: 'Redução de ~20% no CPA em 3-7 dias')",
  "steps": [
    {
      "order": 1,
      "description": "Descrição humana da ação",
      "action_type": "update_status" | "update_budget" | "manual_recommendation",
      "platform": "meta" | "google",
      "params": {
        "object_id": "ID real da campanha",
        "status": "PAUSED" | "ACTIVE",
        "daily_budget": 100,
        "instruction": "Instrução manual se for manual_recommendation"
      },
      "campaign_name": "Nome da campanha",
      "reversible": true,
      "justification": "Por que esta ação é necessária (com dados)"
    }
  ],
  "warnings": ["Avisos importantes"],
  "total_executable": 3,
  "total_manual": 2
}`;

      const userPrompt = `RECOMENDAÇÕES DA ANÁLISE DE IA PARA OTIMIZAR:

${recommendations.map((r: any, i: number) => `${i + 1}. [${r.type || "optimization"}] ${r.titulo}
   Descrição: ${r.descricao || "N/A"}
   Ação sugerida: ${r.acao || "N/A"}
   Campanha: ${r.campanha || "Geral"}
   Prioridade: ${r.prioridade || "media"}
   ${r.impacto_estimado ? "Impacto estimado: " + r.impacto_estimado : ""}
   ${r.potencial ? "Potencial: " + r.potencial : ""}`).join("\n\n")}

Transforme TODAS essas recomendações em um plano de execução único e coerente.
Priorize ações de alto impacto e reversíveis. Ordene do mais urgente para o menos urgente.`;

      const plan = await callClaude(systemPrompt, userPrompt, anthropicKey);

      // Count executable vs manual
      if (plan.steps) {
        plan.total_executable = plan.steps.filter((s: any) => s.action_type !== "manual_recommendation").length;
        plan.total_manual = plan.steps.filter((s: any) => s.action_type === "manual_recommendation").length;
      }

      return json({ plan });
    }

    // ─── ACTION: execute — Execute approved steps ───
    if (action === "execute") {
      const { steps } = body;
      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        return json({ error: "steps é obrigatório" }, 400);
      }

      // Get Meta token
      const { data: conn } = await supabaseAdmin
        .from("oauth_connections")
        .select("access_token")
        .eq("manager_id", userId)
        .eq("provider", "meta_ads")
        .eq("connected", true)
        .maybeSingle();

      const results: Array<{ step: number; success: boolean; message: string }> = [];

      for (const step of steps) {
        if (step.action_type === "manual_recommendation") {
          results.push({
            step: step.order,
            success: true,
            message: "Recomendação manual — execute manualmente.",
          });
          continue;
        }

        if (step.platform === "meta" && !conn?.access_token) {
          results.push({ step: step.order, success: false, message: "Nenhum token Meta conectado." });
          continue;
        }

        try {
          if (step.platform === "meta") {
            const accessToken = conn!.access_token;

            if (step.action_type === "update_status") {
              const { object_id, status } = step.params || {};
              if (!object_id || !status) {
                results.push({ step: step.order, success: false, message: "object_id e status são obrigatórios." });
                continue;
              }
              const res = await fetch(`${META_API}/${object_id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, access_token: accessToken }),
              });
              const data = await res.json();
              if (data.error) {
                results.push({ step: step.order, success: false, message: data.error.message || "Erro na Meta API" });
              } else {
                results.push({ step: step.order, success: true, message: `Status alterado para ${status}` });
              }
            } else if (step.action_type === "update_budget") {
              const { object_id, daily_budget } = step.params || {};
              if (!object_id || daily_budget === undefined) {
                results.push({ step: step.order, success: false, message: "object_id e daily_budget são obrigatórios." });
                continue;
              }
              const res = await fetch(`${META_API}/${object_id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ daily_budget: Math.round(daily_budget * 100), access_token: accessToken }),
              });
              const data = await res.json();
              if (data.error) {
                results.push({ step: step.order, success: false, message: data.error.message || "Erro na Meta API" });
              } else {
                results.push({ step: step.order, success: true, message: `Budget alterado para R$${daily_budget}` });
              }
            } else {
              results.push({ step: step.order, success: false, message: `Ação ${step.action_type} não implementada.` });
            }
          } else if (step.platform === "google") {
            results.push({ step: step.order, success: false, message: "Google Ads ainda não suportado para execução automática." });
          } else {
            results.push({ step: step.order, success: false, message: `Plataforma ${step.platform} não suportada.` });
          }

          // Log action
          await supabaseAdmin.from("campaign_actions_log").insert({
            client_id,
            manager_id: userId,
            action_type: `claude_auto_${step.action_type}`,
            object_type: step.params?.object_type || "campaign",
            external_object_id: step.params?.object_id || null,
            details: {
              step,
              campaign_name: step.campaign_name,
              ai_driven: true,
              engine: "claude",
              justification: step.justification,
            },
          });
        } catch (e: any) {
          console.error(`[claude-optimize] Step ${step.order} error:`, e);
          results.push({ step: step.order, success: false, message: e.message || "Erro desconhecido" });
        }
      }

      return json({ results });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err: any) {
    console.error("[claude-optimize] Error:", err);
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
