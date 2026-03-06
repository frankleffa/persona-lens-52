import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API = "https://graph.facebook.com/v19.0";

// ─── Helpers ───

function json(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function handleMetaError(data: any): { error: string; message: string } | null {
  const err = data?.error;
  if (!err) return null;
  const code = err.code;
  if (code === 190) return { error: "token_expired", message: "Token Meta expirado. Reconecte na página de Conexões." };
  if (code === 32) return { error: "rate_limit", message: "Muitas requisições. Aguarde 1 minuto." };
  if (code === 10 || code === 200) return { error: "permission_denied", message: "Sem permissão para essa conta de anúncios." };
  return { error: "meta_error", message: err.error_user_msg || err.message || "Erro na Meta API." };
}

async function metaPost(url: string, body: Record<string, any>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const metaErr = handleMetaError(data);
  if (metaErr) throw metaErr;
  return data;
}

async function metaGet(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  const metaErr = handleMetaError(data);
  if (metaErr) throw metaErr;
  return data;
}

// ─── Auth & context ───

async function getContext(supabase: any, userId: string, clientId: string) {
  // Verify manager link
  const { data: link, error: linkErr } = await supabase
    .from("client_manager_links")
    .select("id")
    .eq("client_user_id", clientId)
    .eq("manager_id", userId)
    .maybeSingle();

  if (linkErr || !link) {
    // Check admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw { error: "forbidden", message: "Sem permissão para esse cliente." };
  }

  // Get Meta token
  const { data: conn, error: connErr } = await supabase
    .from("oauth_connections")
    .select("access_token")
    .eq("manager_id", userId)
    .eq("provider", "meta_ads")
    .eq("connected", true)
    .maybeSingle();
  if (connErr || !conn?.access_token) throw { error: "no_token", message: "Nenhum token Meta conectado. Vá em Conexões e conecte o Meta Ads." };

  // Get ad account
  const { data: acc, error: accErr } = await supabase
    .from("client_meta_ad_accounts")
    .select("ad_account_id")
    .eq("client_user_id", clientId)
    .limit(1)
    .maybeSingle();
  if (accErr || !acc?.ad_account_id) throw { error: "no_account", message: "Nenhuma conta Meta Ads vinculada a esse cliente." };

  return { accessToken: conn.access_token, adAccountId: acc.ad_account_id };
}

async function logAction(supabase: any, params: { client_id: string; manager_id: string; action_type: string; object_type?: string; external_object_id?: string; details?: Record<string, any> }) {
  await supabase.from("campaign_actions_log").insert({
    client_id: params.client_id,
    manager_id: params.manager_id,
    action_type: params.action_type,
    object_type: params.object_type || null,
    external_object_id: params.external_object_id || null,
    details: params.details || {},
  });
}

// ─── Actions ───

async function createCampaign(ctx: { accessToken: string; adAccountId: string }, data: any) {
  const { name, objective, daily_budget, status, special_ad_categories } = data;
  if (!name || !objective) throw { error: "validation", message: "Nome e objetivo são obrigatórios." };

  const result = await metaPost(`${META_API}/${ctx.adAccountId}/campaigns`, {
    name,
    objective,
    status: status || "PAUSED",
    special_ad_categories: special_ad_categories || [],
    daily_budget: Math.round((daily_budget || 0) * 100),
    access_token: ctx.accessToken,
  });

  return { campaign_id: result.id };
}

async function createAdset(ctx: { accessToken: string; adAccountId: string }, data: any) {
  const { campaign_id, name, optimization_goal, billing_event, targeting, start_time, end_time, status } = data;
  if (!campaign_id || !name || !targeting) throw { error: "validation", message: "campaign_id, nome e targeting são obrigatórios." };

  const t = targeting;
  const targetingSpec: Record<string, any> = {
    age_min: t.age_min || 18,
    age_max: t.age_max || 65,
    genders: t.genders || [],
    geo_locations: t.geo_locations || { countries: ["BR"] },
  };

  if (t.interests && t.interests.length > 0) {
    targetingSpec.flexible_spec = [{ interests: t.interests.map((i: any) => ({ id: i.id, name: i.name })) }];
  }
  if (t.publisher_platforms) targetingSpec.publisher_platforms = t.publisher_platforms;
  if (t.facebook_positions) targetingSpec.facebook_positions = t.facebook_positions;
  if (t.instagram_positions) targetingSpec.instagram_positions = t.instagram_positions;

  const body: Record<string, any> = {
    campaign_id,
    name,
    optimization_goal: optimization_goal || "REACH",
    billing_event: billing_event || "IMPRESSIONS",
    targeting: JSON.stringify(targetingSpec),
    status: status || "PAUSED",
    access_token: ctx.accessToken,
  };
  if (start_time) body.start_time = start_time;
  if (end_time) body.end_time = end_time;

  const result = await metaPost(`${META_API}/${ctx.adAccountId}/adsets`, body);
  return { adset_id: result.id };
}

async function createAd(ctx: { accessToken: string; adAccountId: string }, data: any) {
  const { adset_id, name, page_id, creative, status } = data;
  if (!adset_id || !name || !page_id || !creative?.headline || !creative?.body || !creative?.link_url) {
    throw { error: "validation", message: "adset_id, nome, page_id e creative (headline, body, link_url) são obrigatórios." };
  }

  const linkData: Record<string, any> = {
    link: creative.link_url,
    message: creative.body,
    name: creative.headline,
    call_to_action: { type: creative.call_to_action || "LEARN_MORE", value: { link: creative.link_url } },
  };
  if (creative.description) linkData.description = creative.description;
  if (creative.image_url) linkData.picture = creative.image_url;

  const creativeResult = await metaPost(`${META_API}/${ctx.adAccountId}/adcreatives`, {
    name: `${name} - Creative`,
    object_story_spec: { page_id, link_data: linkData },
    access_token: ctx.accessToken,
  });

  const adResult = await metaPost(`${META_API}/${ctx.adAccountId}/ads`, {
    name,
    adset_id,
    creative: { creative_id: creativeResult.id },
    status: status || "PAUSED",
    access_token: ctx.accessToken,
  });

  return { ad_id: adResult.id, creative_id: creativeResult.id };
}

async function updateStatus(ctx: { accessToken: string }, data: any) {
  const { object_id, status } = data;
  if (!object_id || !status) throw { error: "validation", message: "object_id e status são obrigatórios." };

  await metaPost(`${META_API}/${object_id}`, { status, access_token: ctx.accessToken });
  return { success: true };
}

async function updateBudget(ctx: { accessToken: string }, data: any) {
  const { object_id, daily_budget } = data;
  if (!object_id || daily_budget === undefined) throw { error: "validation", message: "object_id e daily_budget são obrigatórios." };

  await metaPost(`${META_API}/${object_id}`, {
    daily_budget: Math.round(daily_budget * 100),
    access_token: ctx.accessToken,
  });
  return { success: true };
}

async function duplicateCampaign(ctx: { accessToken: string; adAccountId: string }, data: any) {
  const { campaign_id, new_name, budget_multiplier, status } = data;
  if (!campaign_id) throw { error: "validation", message: "campaign_id é obrigatório." };

  const original = await metaGet(
    `${META_API}/${campaign_id}?fields=name,objective,daily_budget,special_ad_categories&access_token=${ctx.accessToken}`
  );

  const multiplier = budget_multiplier || 1.0;
  const newBudget = Math.round((original.daily_budget || 0) * multiplier);

  const result = await metaPost(`${META_API}/${ctx.adAccountId}/campaigns`, {
    name: new_name || `${original.name} (cópia)`,
    objective: original.objective,
    daily_budget: newBudget,
    status: status || "PAUSED",
    special_ad_categories: original.special_ad_categories || [],
    access_token: ctx.accessToken,
  });

  return { new_campaign_id: result.id };
}

async function searchInterests(ctx: { accessToken: string }, data: any) {
  const { query } = data;
  if (!query) throw { error: "validation", message: "query é obrigatório." };

  const result = await metaGet(
    `${META_API}/search?type=adinterest&q=${encodeURIComponent(query)}&limit=20&access_token=${ctx.accessToken}`
  );

  return (result.data || []).map((i: any) => ({
    id: i.id,
    name: i.name,
    audience_size_lower_bound: i.audience_size_lower_bound,
    audience_size_upper_bound: i.audience_size_upper_bound,
  }));
}

async function listPages(ctx: { accessToken: string }) {
  const result = await metaGet(
    `${META_API}/me/accounts?fields=id,name,picture&access_token=${ctx.accessToken}`
  );
  return (result.data || []).map((p: any) => ({ id: p.id, name: p.name, picture: p.picture }));
}

// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const { action, client_id, data } = await req.json();
    if (!action) return json({ error: "validation", message: "action é obrigatório." }, 400);

    // Use service role for DB reads (bypasses RLS for oauth_connections)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Actions that don't need client context
    if (action === "list_pages") {
      const { data: conn } = await supabaseAdmin
        .from("oauth_connections")
        .select("access_token")
        .eq("manager_id", userId)
        .eq("provider", "meta_ads")
        .eq("connected", true)
        .maybeSingle();
      if (!conn?.access_token) return json({ error: "no_token", message: "Nenhum token Meta conectado." }, 400);

      const result = await listPages({ accessToken: conn.access_token });
      return json(result);
    }

    if (action === "search_interests") {
      const { data: conn } = await supabaseAdmin
        .from("oauth_connections")
        .select("access_token")
        .eq("manager_id", userId)
        .eq("provider", "meta_ads")
        .eq("connected", true)
        .maybeSingle();
      if (!conn?.access_token) return json({ error: "no_token", message: "Nenhum token Meta conectado." }, 400);

      const result = await searchInterests({ accessToken: conn.access_token }, data || {});
      return json(result);
    }

    // All other actions need client_id
    if (!client_id) return json({ error: "validation", message: "client_id é obrigatório." }, 400);

    // Verify manager access using user's supabase client (respects RLS)
    const ctx = await getContext(supabaseAdmin, userId, client_id);

    let result: any;
    let objectType = "";

    switch (action) {
      case "create_campaign":
        result = await createCampaign(ctx, data);
        objectType = "campaign";
        await logAction(supabaseAdmin, {
          client_id, manager_id: userId, action_type: "created_campaign",
          object_type: "campaign", external_object_id: result.campaign_id, details: data,
        });
        break;

      case "create_adset":
        result = await createAdset(ctx, data);
        objectType = "adset";
        await logAction(supabaseAdmin, {
          client_id, manager_id: userId, action_type: "created_adset",
          object_type: "adset", external_object_id: result.adset_id, details: data,
        });
        break;

      case "create_ad":
        result = await createAd(ctx, data);
        objectType = "ad";
        await logAction(supabaseAdmin, {
          client_id, manager_id: userId, action_type: "created_ad",
          object_type: "ad", external_object_id: result.ad_id, details: data,
        });
        break;

      case "update_status":
        result = await updateStatus(ctx, data);
        await logAction(supabaseAdmin, {
          client_id, manager_id: userId, action_type: "updated_status",
          object_type: data.object_type || "unknown", external_object_id: data.object_id, details: { status: data.status },
        });
        break;

      case "update_budget":
        result = await updateBudget(ctx, data);
        await logAction(supabaseAdmin, {
          client_id, manager_id: userId, action_type: "updated_budget",
          object_type: "campaign", external_object_id: data.object_id, details: { daily_budget: data.daily_budget },
        });
        break;

      case "duplicate_campaign":
        result = await duplicateCampaign(ctx, data);
        await logAction(supabaseAdmin, {
          client_id, manager_id: userId, action_type: "duplicated_campaign",
          object_type: "campaign", external_object_id: result.new_campaign_id, details: data,
        });
        break;

      default:
        return json({ error: "validation", message: `Ação desconhecida: ${action}` }, 400);
    }

    return json(result);
  } catch (err: any) {
    console.error("[manage-campaigns] Error:", err);
    if (err.error) return json(err, 400);
    return json({ error: "unknown", message: "Erro ao executar ação. Tente novamente." }, 500);
  }
});
