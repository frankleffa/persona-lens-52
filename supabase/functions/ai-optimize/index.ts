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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { action, client_id, optimization } = body;

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

    // ─── ACTION: plan — AI generates execution plan ───
    if (action === "plan") {
      if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);

      const { titulo, descricao, acao, campanha, prioridade, context_type } = optimization || {};
      if (!titulo) return json({ error: "optimization.titulo é obrigatório" }, 400);

      // Get current campaigns for this client
      const { data: campaigns } = await supabaseAdmin
        .from("daily_campaigns")
        .select("campaign_name, external_campaign_id, platform, campaign_status, spend, clicks, conversions, leads, messages, purchases, registrations, ftd, account_id")
        .eq("client_id", client_id)
        .order("date", { ascending: false })
        .limit(50);

      // Deduplicate campaigns by external_campaign_id (get latest)
      const uniqueCampaigns = new Map();
      for (const c of campaigns || []) {
        if (c.external_campaign_id && !uniqueCampaigns.has(c.external_campaign_id)) {
          uniqueCampaigns.set(c.external_campaign_id, c);
        }
      }
      const campaignList = Array.from(uniqueCampaigns.values());

      // Get Meta accounts for this client
      const { data: metaAccounts } = await supabaseAdmin
        .from("client_meta_ad_accounts")
        .select("ad_account_id")
        .eq("client_user_id", client_id);

      // Get Google accounts
      const { data: googleAccounts } = await supabaseAdmin
        .from("client_ad_accounts")
        .select("customer_id")
        .eq("client_user_id", client_id);

      const systemPrompt = `Você é um especialista em otimização de campanhas de mídia paga (Meta Ads e Google Ads).
Seu objetivo é gerar um PLANO DE EXECUÇÃO CONCRETO para a otimização solicitada.

REGRAS:
1. Cada ação deve ser uma operação executável via API (update_status, update_budget, etc)
2. Use os IDs reais das campanhas quando disponíveis
3. Justifique cada ação com base em dados
4. Seja específico com valores (ex: "reduzir budget de R$100 para R$70" e não "reduzir budget")
5. Sempre inclua riscos e impacto esperado

CAMPANHAS DISPONÍVEIS (dados mais recentes):
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
  account_id: c.account_id,
})), null, 2)}

CONTAS META: ${(metaAccounts || []).map(a => a.ad_account_id).join(", ") || "nenhuma"}
CONTAS GOOGLE: ${(googleAccounts || []).map(a => a.customer_id).join(", ") || "nenhuma"}`;

      const userPrompt = `OTIMIZAÇÃO SOLICITADA:
- Título: ${titulo}
- Descrição: ${descricao || "N/A"}
- Ação sugerida: ${acao || "N/A"}
- Campanha relacionada: ${campanha || "Todas"}
- Prioridade: ${prioridade || "N/A"}
- Tipo de contexto: ${context_type || "optimization"}

Gere o plano de execução usando a tool "create_execution_plan".`;

      const planTool = {
        name: "create_execution_plan",
        description: "Cria um plano de execução com ações concretas para otimização de campanhas",
        input_schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "Resumo do que será feito em 1-2 frases"
            },
            risk_level: {
              type: "string",
              enum: ["baixo", "medio", "alto"],
              description: "Nível de risco da operação"
            },
            expected_impact: {
              type: "string",
              description: "Impacto esperado (ex: 'Redução de ~15% no CPA em 3-5 dias')"
            },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  description: { type: "string", description: "Descrição humana da ação" },
                  action_type: {
                    type: "string",
                    enum: ["update_status", "update_budget", "create_campaign", "create_adset", "duplicate_campaign", "manual_recommendation"],
                    description: "Tipo de ação. Use manual_recommendation quando não é possível executar via API"
                  },
                  platform: { type: "string", enum: ["meta", "google"] },
                  params: {
                    type: "object",
                    description: "Parâmetros para a ação. Para update_status: {object_id, status, object_type}. Para update_budget: {object_id, daily_budget}. Para manual_recommendation: {instruction}",
                    properties: {
                      object_id: { type: "string" },
                      status: { type: "string" },
                      object_type: { type: "string" },
                      daily_budget: { type: "number" },
                      instruction: { type: "string" }
                    }
                  },
                  campaign_name: { type: "string", description: "Nome da campanha afetada" },
                  reversible: { type: "boolean", description: "Se a ação pode ser desfeita" }
                },
                required: ["order", "description", "action_type", "platform"]
              }
            },
            warnings: {
              type: "array",
              items: { type: "string" },
              description: "Avisos importantes antes de executar"
            }
          },
          required: ["summary", "risk_level", "expected_impact", "steps"]
        }
      };

      const PRIMARY_MODEL = "claude-sonnet-4-20250514";
      const FALLBACK_MODEL = "claude-3-5-sonnet-20241022";

      async function requestPlan(model: string) {
        return fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
            tools: [planTool],
            tool_choice: { type: "tool", name: "create_execution_plan" },
          }),
        });
      }

      let aiResponse = await requestPlan(PRIMARY_MODEL);
      if (aiResponse.status === 404) {
        console.warn("[ai-optimize] Fallback para", FALLBACK_MODEL);
        aiResponse = await requestPlan(FALLBACK_MODEL);
      }

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        const errText = await aiResponse.text();
        console.error(`[ai-optimize] Anthropic error ${status}:`, errText);
        if (status === 429) return json({ error: "Limite de requisições Anthropic atingido. Aguarde um momento e tente novamente." }, 429);
        if (status === 402 || status === 400) return json({ error: "Créditos da Anthropic insuficientes ou requisição inválida. Verifique sua conta em console.anthropic.com." }, 402);
        if (status === 401) return json({ error: "ANTHROPIC_API_KEY inválida." }, 500);
        return json({ error: "Erro ao gerar plano de otimização." }, 500);
      }

      const aiData = await aiResponse.json();
      const toolUse = aiData.content?.find((c: any) => c.type === "tool_use");
      if (!toolUse?.input) {
        console.error("[ai-optimize] Nenhum tool_use na resposta:", JSON.stringify(aiData));
        return json({ error: "A IA não retornou um plano válido. Tente novamente." }, 500);
      }

      const plan = toolUse.input;
      return json({ plan });
    }

    // ─── ACTION: execute — Execute approved steps via manage-campaigns ───
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

      const results: Array<{ step: number; success: boolean; message: string; result?: any }> = [];

      for (const step of steps) {
        if (step.action_type === "manual_recommendation") {
          results.push({ step: step.order, success: true, message: "Recomendação manual — não executada automaticamente." });
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
              results.push({ step: step.order, success: false, message: `Ação ${step.action_type} não implementada para execução automática.` });
            }
          } else if (step.platform === "google") {
            results.push({ step: step.order, success: false, message: "Execução automática via Google Ads ainda não suportada. Siga a recomendação manualmente." });
          } else {
            results.push({ step: step.order, success: false, message: `Plataforma ${step.platform} não suportada.` });
          }

          // Log action
          await supabaseAdmin.from("campaign_actions_log").insert({
            client_id,
            manager_id: userId,
            action_type: `ai_optimized_${step.action_type}`,
            object_type: step.params?.object_type || "campaign",
            external_object_id: step.params?.object_id || null,
            details: { step, campaign_name: step.campaign_name, ai_driven: true },
          });
        } catch (e: any) {
          console.error(`[ai-optimize] Step ${step.order} error:`, e);
          results.push({ step: step.order, success: false, message: e.message || "Erro desconhecido" });
        }
      }

      return json({ results });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err: any) {
    console.error("[ai-optimize] Error:", err);
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
