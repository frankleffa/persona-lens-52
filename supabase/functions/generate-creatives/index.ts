import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VERTICAL_LABELS: Record<string, string> = {
    ecommerce: "E-commerce",
    igaming: "iGaming / Apostas",
    prediction_market: "Mercado de Previsão (estilo Polymarket/Kalshi no Brasil) — plataforma onde usuários compram/vendem contratos SIM/NÃO sobre o resultado de eventos reais (eleições, esportes, economia, cultura pop, criptomoedas). NÃO é cassino, NÃO é slots, NÃO é roleta, NÃO é jogo de azar de sorte. É um mercado de previsões com mecânica financeira: o preço do contrato reflete a probabilidade do evento. Comunicação deve ser inteligente, analítica, baseada em conhecimento e opinião sobre o mundo — nunca apelar para 'sorte', 'jackpot', 'giros grátis' ou estética de cassino.",
    infoproduto: "Infoproduto / Lançamento",
    leadgen: "Geração de Leads",
    geracao_leads: "Geração de Leads B2B",
    negocio_local: "Negócio Local",
    servicos: "Serviços / Mensagens",
    saas: "SaaS",
    app: "Aplicativo Mobile",
};

interface ReferenceAd {
    ad_name: string;
    campaign_name: string;
    spend: number;
    impressions: number;
    ctr: number;
    cpa: number;
    conversions: number;
    title: string | null;
    body: string | null;
    cta: string | null;
}

async function fetchTopReferenceAds(
    accessToken: string,
    adAccountIds: string[],
    timeRange: { since: string; until: string }
): Promise<ReferenceAd[]> {
    const dateParam = `time_range=${encodeURIComponent(JSON.stringify(timeRange))}`;
    const accounts = adAccountIds.slice(0, 5);

    type AdRow = {
        ad_id: string;
        ad_name: string;
        campaign_name: string;
        spend: number;
        impressions: number;
        clicks: number;
        ctr: number;
        conversions: number;
    };
    const rows: AdRow[] = [];

    for (const accountId of accounts) {
        try {
            const adsUrl = `https://graph.facebook.com/v19.0/${accountId}/ads?fields=id,name,campaign{name}&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=80&access_token=${accessToken}`;
            const adsRes = await fetch(adsUrl);
            const adsData = await adsRes.json();
            if (adsData.error || !adsData.data?.length) continue;

            const BATCH = 5;
            for (let i = 0; i < adsData.data.length && i < 50; i += BATCH) {
                const batch = adsData.data.slice(i, i + BATCH);
                const results = await Promise.all(
                    batch.map(async (ad: any) => {
                        try {
                            const insUrl = `https://graph.facebook.com/v19.0/${ad.id}/insights?fields=spend,impressions,clicks,ctr,actions&${dateParam}&use_account_attribution_setting=true&access_token=${accessToken}`;
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
                    if (spend < 30 || impressions < 1000) continue;

                    const clicks = parseInt(insRow.clicks || "0");
                    const ctr = parseFloat(insRow.ctr || "0");

                    const actions = insRow.actions || [];
                    const sumActions = (...types: string[]) => actions
                        .filter((a: any) => types.includes(a.action_type))
                        .reduce((s: number, a: any) => s + (parseInt(a.value || "0") || 0), 0);
                    const conversions =
                        sumActions("offsite_conversion.fb_pixel_purchase", "purchase")
                        + sumActions("offsite_conversion.fb_pixel_complete_registration", "complete_registration")
                        + sumActions("offsite_conversion.fb_pixel_lead", "lead");

                    rows.push({
                        ad_id: ad.id,
                        ad_name: ad.name,
                        campaign_name: ad.campaign?.name || "—",
                        spend,
                        impressions,
                        clicks,
                        ctr,
                        conversions,
                    });
                }
            }
        } catch (e) {
            console.warn(`[generate-creatives] Insights fetch failed for ${accountId}:`, e);
        }
    }

    if (rows.length === 0) return [];

    // Rank by conversions/spend (CPA) when there's conversion data, otherwise by CTR
    const hasConv = rows.some(r => r.conversions > 0);
    const ranked = rows
        .filter(r => hasConv ? r.conversions > 0 : r.ctr > 0)
        .sort((a, b) => {
            if (hasConv) {
                const cpaA = a.spend / a.conversions;
                const cpaB = b.spend / b.conversions;
                return cpaA - cpaB;
            }
            return b.ctr - a.ctr;
        })
        .slice(0, 4);

    // Fetch creative content for top ads
    const enriched: ReferenceAd[] = [];
    for (const r of ranked) {
        let title: string | null = null;
        let body: string | null = null;
        let cta: string | null = null;
        try {
            const creativeUrl = `https://graph.facebook.com/v19.0/${r.ad_id}?fields=creative{title,body,object_story_spec,call_to_action_type}&access_token=${accessToken}`;
            const creativeRes = await fetch(creativeUrl);
            const creativeData = await creativeRes.json();
            const c = creativeData.creative || {};
            title = c.title || c.object_story_spec?.link_data?.name || c.object_story_spec?.video_data?.title || null;
            body = c.body
                || c.object_story_spec?.link_data?.message
                || c.object_story_spec?.video_data?.message
                || null;
            cta = c.call_to_action_type
                || c.object_story_spec?.link_data?.call_to_action?.type
                || c.object_story_spec?.video_data?.call_to_action?.type
                || null;
        } catch (e) {
            console.warn(`[generate-creatives] Creative fetch failed for ${r.ad_id}:`, e);
        }

        enriched.push({
            ad_name: r.ad_name,
            campaign_name: r.campaign_name,
            spend: r.spend,
            impressions: r.impressions,
            ctr: r.ctr,
            cpa: r.conversions > 0 ? r.spend / r.conversions : 0,
            conversions: r.conversions,
            title,
            body,
            cta,
        });
    }

    return enriched;
}

interface CreativeVariant {
    hook: string;
    headline: string;
    primary_text: string;
    cta: string;
    angulo: string;
    por_que_funciona: string;
}

function buildSystemPrompt(verticalLabel: string, primaryMetricLabel: string): string {
    return `Você é um copywriter sênior especializado em ${verticalLabel}, focado em criar criativos de Meta Ads que convertem.

SUA MISSÃO:
Gerar 5 variações de copy NOVAS para substituir criativos saturados ou refrescar o portfólio. Cada variação deve usar um ÂNGULO diferente (não só reescrever a mesma ideia).

ÂNGULOS DISPONÍVEIS (use 5 diferentes):
- curiosidade (gancho que abre loop mental)
- prova_social (pessoas reais, números, depoimentos)
- urgencia (escassez, prazo, momento)
- contraste (antes/depois, com/sem, dor/solução)
- autoridade (especialista, dado, certificação)
- historia (narrativa pessoal, jornada)
- objecao (quebra de objeção comum)
- beneficio_concreto (o que a pessoa ganha em específico)

REGRAS DE QUALIDADE:
- HOOK = primeira linha do anúncio (3 segundos de vídeo / linha 1 do texto). Tem que parar o scroll. Frase curta, impactante. NUNCA começar com saudação ("Olá", "Você sabia").
- HEADLINE = 5-10 palavras. Direto. Foco no benefício/promessa.
- PRIMARY_TEXT = 50-120 palavras. Conta a história curta, lista benefícios concretos, fecha com CTA.
- CTA = um dos padrões Meta: SAIBA_MAIS, CADASTRE_SE, BAIXAR, COMPRAR, INSCREVA_SE, JOGAR_AGORA, RECEBER_OFERTA.
- Português brasileiro, tom direto e humano. Evite clichês ("Não perca essa oportunidade!", "Garanta já o seu!").
- Use os criativos vencedores como REFERÊNCIA de tom, mas NUNCA copie a ideia. Crie variações conceitualmente novas.
- Se a métrica principal é "${primaryMetricLabel}", oriente o CTA pra esse objetivo.

Retorne APENAS um JSON válido (sem markdown, sem backticks):
{
  "variantes": [
    {
      "hook": "(primeira linha que para o scroll, ≤15 palavras)",
      "headline": "(título do anúncio, 5-10 palavras)",
      "primary_text": "(corpo do anúncio, 50-120 palavras)",
      "cta": "(SAIBA_MAIS | CADASTRE_SE | BAIXAR | COMPRAR | INSCREVA_SE | JOGAR_AGORA | RECEBER_OFERTA)",
      "angulo": "(curiosidade | prova_social | urgencia | contraste | autoridade | historia | objecao | beneficio_concreto)",
      "por_que_funciona": "(1-2 frases explicando POR QUE este ângulo deve performar para este vertical/cliente, idealmente referenciando o que aprendemos dos vencedores)"
    }
  ]
}

Gere EXATAMENTE 5 variantes, cada uma com ângulo diferente.`;
}

function buildUserPrompt(
    verticalLabel: string,
    notes: string | null,
    primaryMetricLabel: string,
    referenceAds: ReferenceAd[],
    replacesAdName: string | null,
    contextNote: string | null
): string {
    const refSection = referenceAds.length > 0
        ? `CRIATIVOS VENCEDORES (use como referência de tom e do que ressoa com o público — NÃO copie):

${referenceAds.map((r, i) => `[Vencedor ${i + 1}] "${r.ad_name}" (Campanha: ${r.campaign_name})
- Performance: CTR ${r.ctr.toFixed(2)}%, ${r.conversions} ${primaryMetricLabel}, R$ ${r.spend.toFixed(2)} gastos${r.cpa > 0 ? `, CPA R$ ${r.cpa.toFixed(2)}` : ""}
${r.title ? `- Título: "${r.title}"` : ""}
${r.body ? `- Copy: "${r.body.substring(0, 400)}${r.body.length > 400 ? "..." : ""}"` : ""}
${r.cta ? `- CTA: ${r.cta}` : ""}`).join("\n\n")}

PADRÕES OBSERVADOS NOS VENCEDORES: identifique tom, estrutura, gatilhos que aparecem repetidamente e replique na essência (não na forma).`
        : `Sem criativos vencedores disponíveis no histórico — gere com base apenas no contexto do vertical e nas melhores práticas de ${verticalLabel}.`;

    const replaceSection = replacesAdName
        ? `\n\nESTE LOTE SUBSTITUI O AD: "${replacesAdName}"
Esse criativo está em fadiga (alta exposição, queda de retorno). As novas variações devem evitar reusar exatamente o mesmo ângulo, mas podem manter o tom de marca.`
        : "";

    const contextSection = contextNote
        ? `\n\nCONTEXTO ADICIONAL DO GESTOR:\n${contextNote}`
        : "";

    const notesSection = notes
        ? `\n\nNOTAS DO CLIENTE (briefing/restrições):\n${notes}`
        : "";

    return `VERTICAL: ${verticalLabel}
MÉTRICA PRINCIPAL: ${primaryMetricLabel}
${notesSection}
${replaceSection}
${contextSection}

${refSection}

Gere 5 variantes seguindo o schema. Apenas o JSON.`;
}

async function callAnthropic(systemPrompt: string, userMessage: string, apiKey: string): Promise<{ text: string; model: string }> {
    const PRIMARY_MODEL = "claude-sonnet-4-20250514";
    const FALLBACK_MODEL = "claude-3-5-sonnet-20241022";

    async function tryModel(model: string): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

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
                    max_tokens: 8000,
                    system: systemPrompt,
                    messages: [{ role: "user", content: userMessage }],
                }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: { type: "unknown" } }));
                console.error("[generate-creatives] Anthropic error:", res.status, JSON.stringify(errData));
                if (res.status === 404 || errData?.error?.type === "not_found_error") {
                    throw Object.assign(new Error("model_not_found"), { type: "not_found" });
                }
                if (res.status === 401) throw new Error("Chave Anthropic inválida.");
                if (res.status === 429) throw new Error("Limite de requisições Anthropic atingido.");
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
            const text = await tryModel(FALLBACK_MODEL);
            return { text, model: FALLBACK_MODEL };
        }
        throw e;
    }
}

function parseVariants(text: string): CreativeVariant[] {
    let cleaned = text.trim()
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?\s*```\s*$/i, "")
        .trim();

    let parsed: any;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("Resposta da IA não contém JSON.");
        parsed = JSON.parse(m[0]);
    }

    const arr = parsed.variantes || parsed.variants || [];
    if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error("IA não retornou variantes.");
    }

    return arr.map((v: any) => ({
        hook: String(v.hook || "").trim(),
        headline: String(v.headline || "").trim(),
        primary_text: String(v.primary_text || "").trim(),
        cta: String(v.cta || "SAIBA_MAIS").trim(),
        angulo: String(v.angulo || "beneficio_concreto").trim(),
        por_que_funciona: String(v.por_que_funciona || "").trim(),
    })).filter(v => v.hook && v.primary_text);
}

console.log("[generate-creatives] boot v2");

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        let body: any = {};
        try {
            body = await req.json();
        } catch {
            return new Response(JSON.stringify({ error: "Body JSON inválido" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { client_id, replaces_ad_name = null, context_note = null } = body;
        if (!client_id) throw new Error("Missing client_id");

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!anthropicApiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

        const supabase = createClient(supabaseUrl, supabaseKey);

        // ─── AUTH ───
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Não autorizado" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (!user) {
            return new Response(JSON.stringify({ error: "Token inválido" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data: roles } = await supabase
            .from("user_roles").select("role").eq("user_id", user.id).limit(1);
        const userRole = roles?.[0]?.role;
        if (userRole === "client") {
            return new Response(JSON.stringify({ error: "Acesso negado." }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data: managerLink } = await supabase
            .from("client_manager_links")
            .select("id, client_user_id, manager_id")
            .or(`client_user_id.eq.${client_id},id.eq.${client_id}`)
            .eq("manager_id", user.id)
            .limit(1)
            .maybeSingle();

        const isAdmin = userRole === "admin";
        if (!managerLink && !isAdmin) {
            return new Response(JSON.stringify({ error: "Você não gerencia este cliente." }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // ─── CONFIG ───
        const { data: config } = await supabase
            .from("client_analysis_config")
            .select("vertical, primary_metric_label, notes")
            .eq("client_id", client_id)
            .maybeSingle();

        const vertical = config?.vertical || "ecommerce";
        const verticalLabel = VERTICAL_LABELS[vertical] || vertical;
        const primaryMetricLabel = config?.primary_metric_label || "Conversões";
        const notes = config?.notes || null;

        // ─── REFERENCE ADS (live Meta) ───
        let referenceAds: ReferenceAd[] = [];
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
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setDate(endDate.getDate() - 14);
                    referenceAds = await fetchTopReferenceAds(
                        metaConn.access_token,
                        adAccountIds,
                        {
                            since: startDate.toISOString().split("T")[0],
                            until: endDate.toISOString().split("T")[0],
                        }
                    );
                }
            }
        } catch (refErr) {
            console.warn("[generate-creatives] Reference fetch failed:", refErr);
        }

        console.log(`[generate-creatives] Client ${client_id} | vertical: ${vertical} | refs: ${referenceAds.length} | replaces: ${replaces_ad_name || "n/a"}`);

        // ─── PROMPT + CALL ───
        const systemPrompt = buildSystemPrompt(verticalLabel, primaryMetricLabel);
        const userPrompt = buildUserPrompt(verticalLabel, notes, primaryMetricLabel, referenceAds, replaces_ad_name, context_note);
        const { text: aiText, model: usedModel } = await callAnthropic(systemPrompt, userPrompt, anthropicApiKey);
        const variants = parseVariants(aiText);

        if (variants.length === 0) {
            throw new Error("IA não retornou variantes utilizáveis.");
        }

        // ─── PERSIST ───
        const referenceSummary = referenceAds.map(r => ({
            ad_name: r.ad_name,
            campaign_name: r.campaign_name,
            ctr: r.ctr,
            conversions: r.conversions,
        }));

        const rowsToInsert = variants.map(v => ({
            client_id,
            generated_by: user.id,
            replaces_ad_name: replaces_ad_name || null,
            hook: v.hook,
            headline: v.headline,
            primary_text: v.primary_text,
            cta: v.cta,
            angulo: v.angulo,
            por_que_funciona: v.por_que_funciona,
            status: "pending",
            reference_ads: referenceSummary,
            context_note: context_note || null,
            modelo_ia: usedModel,
        }));

        const { data: inserted, error: insErr } = await supabase
            .from("creative_suggestions")
            .insert(rowsToInsert)
            .select();

        if (insErr) {
            console.error("[generate-creatives] Insert failed:", insErr);
            throw new Error("Falha ao salvar sugestões: " + insErr.message);
        }

        return new Response(JSON.stringify({
            suggestions: inserted,
            references_used: referenceAds.length,
            modelo_ia: usedModel,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("[generate-creatives] Error:", error);
        const isTimeout = error.name === "AbortError";
        return new Response(
            JSON.stringify({ error: isTimeout ? "Geração demorou demais. Tente de novo." : (error.message || "Erro interno") }),
            { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
