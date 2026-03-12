import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- Google Ads mutation helpers ----------

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function executeGoogleAdsAction(
  accessToken: string,
  devToken: string,
  customerId: string,
  action: { type: string; campaign_id: string; value?: number }
): Promise<{ success: boolean; message: string }> {
  const cleanId = customerId.replace(/-/g, "");

  if (action.type === "pause_campaign" || action.type === "enable_campaign") {
    const status = action.type === "pause_campaign" ? "PAUSED" : "ENABLED";
    const res = await fetch(
      `https://googleads.googleapis.com/v16/customers/${cleanId}/campaigns/${action.campaign_id}:mutate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: {
            update: {
              resourceName: `customers/${cleanId}/campaigns/${action.campaign_id}`,
              status,
            },
            updateMask: "status",
          },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      return { success: false, message: `Falha ao ${action.type === "pause_campaign" ? "pausar" : "ativar"} campanha Google: ${JSON.stringify(err)}` };
    }
    return { success: true, message: `Campanha Google ${action.campaign_id} ${action.type === "pause_campaign" ? "pausada" : "ativada"} com sucesso.` };
  }

  if (action.type === "adjust_budget" && action.value !== undefined) {
    const budgetMicros = Math.round(action.value * 1_000_000);
    // First get the campaign's budget resource
    const query = `SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${action.campaign_id}`;
    const searchRes = await fetch(
      `https://googleads.googleapis.com/v16/customers/${cleanId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );
    const searchData = await searchRes.json();
    const budgetResource = searchData?.[0]?.results?.[0]?.campaign?.campaignBudget;
    if (!budgetResource) {
      return { success: false, message: "Não foi possível encontrar o budget da campanha." };
    }

    const res = await fetch(
      `https://googleads.googleapis.com/v16/${budgetResource}:mutate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: {
            update: {
              resourceName: budgetResource,
              amountMicros: budgetMicros.toString(),
            },
            updateMask: "amount_micros",
          },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      return { success: false, message: `Falha ao ajustar budget Google: ${JSON.stringify(err)}` };
    }
    return { success: true, message: `Budget da campanha Google ajustado para R$ ${action.value.toFixed(2)}.` };
  }

  return { success: false, message: `Ação Google Ads não suportada: ${action.type}` };
}

// ---------- Meta Ads mutation helpers ----------

async function executeMetaAdsAction(
  accessToken: string,
  action: { type: string; campaign_id: string; value?: number }
): Promise<{ success: boolean; message: string }> {
  if (action.type === "pause_campaign" || action.type === "enable_campaign") {
    const status = action.type === "pause_campaign" ? "PAUSED" : "ACTIVE";
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${action.campaign_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          access_token: accessToken,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      return { success: false, message: `Falha ao ${action.type === "pause_campaign" ? "pausar" : "ativar"} campanha Meta: ${JSON.stringify(err)}` };
    }
    return { success: true, message: `Campanha Meta ${action.campaign_id} ${action.type === "pause_campaign" ? "pausada" : "ativada"} com sucesso.` };
  }

  if (action.type === "adjust_budget" && action.value !== undefined) {
    // Meta budget is in cents (for BRL)
    const dailyBudget = Math.round(action.value * 100);
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${action.campaign_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daily_budget: dailyBudget.toString(),
          access_token: accessToken,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      return { success: false, message: `Falha ao ajustar budget Meta: ${JSON.stringify(err)}` };
    }
    return { success: true, message: `Budget da campanha Meta ajustado para R$ ${action.value.toFixed(2)}/dia.` };
  }

  return { success: false, message: `Ação Meta Ads não suportada: ${action.type}` };
}

// ---------- Claude AI analysis ----------

interface CampaignData {
  google_ads: unknown;
  meta_ads: unknown;
  ga4: unknown;
  consolidated: unknown;
}

interface AIAction {
  id: string;
  platform: "google_ads" | "meta_ads";
  type: "pause_campaign" | "enable_campaign" | "adjust_budget";
  campaign_id: string;
  campaign_name: string;
  description: string;
  impact: string;
  value?: number;
}

interface AIResponse {
  analysis: string;
  actions: AIAction[];
}

async function analyzeWithClaude(
  campaignData: CampaignData,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<AIResponse> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada. Adicione nas variáveis de ambiente do Supabase.");
  }

  const systemPrompt = `Você é um especialista em marketing digital e otimização de campanhas de Google Ads e Meta Ads.
Você analisa dados de campanhas e pode sugerir e executar ações reais de otimização.

DADOS ATUAIS DAS CAMPANHAS:
${JSON.stringify(campaignData, null, 2)}

REGRAS IMPORTANTES:
1. Sempre responda em português brasileiro
2. Seja direto e objetivo nas análises
3. Quando sugerir otimizações, SEMPRE inclua ações executáveis no formato JSON
4. Cada ação deve ter: id (único), platform, type, campaign_id, campaign_name, description, impact
5. Os types disponíveis são: pause_campaign, enable_campaign, adjust_budget
6. Para adjust_budget, inclua o campo "value" com o novo valor em reais
7. Identifique campanhas com CPA alto demais, CTR baixo, ou que estão gastando sem converter
8. Sugira redistribuição de budget das campanhas ruins para as boas
9. Seja proativo: se ver problemas claros, sugira ações imediatamente

FORMATO DE RESPOSTA:
Sempre retorne um JSON válido com esta estrutura:
{
  "analysis": "Sua análise detalhada aqui em texto corrido...",
  "actions": [
    {
      "id": "action_1",
      "platform": "google_ads" ou "meta_ads",
      "type": "pause_campaign" | "enable_campaign" | "adjust_budget",
      "campaign_id": "ID_da_campanha",
      "campaign_name": "Nome da campanha",
      "description": "O que esta ação faz",
      "impact": "Impacto esperado",
      "value": 100.00
    }
  ]
}

Se não houver ações a sugerir, retorne actions como array vazio.
IMPORTANTE: Retorne APENAS o JSON, sem markdown ou texto adicional.`;

  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Claude API error: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || "{}";

  try {
    // Try to parse as JSON directly
    return JSON.parse(content);
  } catch {
    // If Claude returned markdown-wrapped JSON, extract it
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Return as plain analysis with no actions
    return { analysis: content, actions: [] };
  }
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!ANON_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate user
  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData.user.id;
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Only managers and admins can use AI optimization
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  const userRole = roleData?.[0]?.role || "manager";
  if (userRole === "client") {
    return new Response(JSON.stringify({ error: "Apenas gestores podem usar a otimização por IA" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { action: requestAction, campaign_data, user_message, conversation_history, actions_to_execute } = body;

  try {
    // ACTION: analyze - Send data to Claude and get recommendations
    if (requestAction === "analyze") {
      const aiResponse = await analyzeWithClaude(
        campaign_data || {},
        user_message || "Analise minhas campanhas e sugira otimizações para melhorar o desempenho.",
        conversation_history || []
      );

      return new Response(JSON.stringify(aiResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: execute - Execute approved actions on Google/Meta APIs
    if (requestAction === "execute") {
      if (!actions_to_execute || !Array.isArray(actions_to_execute) || actions_to_execute.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhuma ação para executar" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get OAuth connections
      const { data: connections } = await supabaseAdmin
        .from("oauth_connections")
        .select("*")
        .eq("manager_id", userId)
        .eq("connected", true);

      const googleConn = connections?.find((c) => c.provider === "google_ads");
      const metaConn = connections?.find((c) => c.provider === "meta_ads");
      const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";

      let googleAccessToken = "";
      if (googleConn?.refresh_token) {
        googleAccessToken = await refreshGoogleToken(googleConn.refresh_token);
      }

      const results: Array<{ action_id: string; success: boolean; message: string }> = [];

      // Get active Google account IDs for executing actions
      const { data: googleAccounts } = await supabaseAdmin
        .from("manager_ad_accounts")
        .select("customer_id")
        .eq("manager_id", userId)
        .eq("is_active", true);
      const googleCustomerIds = (googleAccounts || []).map((a) => a.customer_id);

      for (const action of actions_to_execute as AIAction[]) {
        try {
          if (action.platform === "google_ads") {
            if (!googleAccessToken) {
              results.push({ action_id: action.id, success: false, message: "Google Ads não conectado" });
              continue;
            }
            // Use the first active customer ID for mutations
            const customerId = googleCustomerIds[0];
            if (!customerId) {
              results.push({ action_id: action.id, success: false, message: "Nenhuma conta Google Ads ativa" });
              continue;
            }
            const result = await executeGoogleAdsAction(googleAccessToken, devToken, customerId, action);
            results.push({ action_id: action.id, ...result });
          } else if (action.platform === "meta_ads") {
            if (!metaConn?.access_token) {
              results.push({ action_id: action.id, success: false, message: "Meta Ads não conectado" });
              continue;
            }
            const result = await executeMetaAdsAction(metaConn.access_token, action);
            results.push({ action_id: action.id, ...result });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro desconhecido";
          results.push({ action_id: action.id, success: false, message: msg });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use 'analyze' ou 'execute'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ai-optimize error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
