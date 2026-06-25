/**
 * Inicia o fluxo OAuth (Google Ads / Meta Ads / GA4 / WhatsApp).
 *
 * Hardening vs. versão anterior:
 * - Exige usuário autenticado (antes não validava o JWT, só o embutia).
 * - NÃO coloca mais o token do usuário no parâmetro `state` (vazava em
 *   URL/logs). Em vez disso grava um `oauth_states` opaco e de uso único
 *   (id aleatório, expira em 10 min) e manda só o id. O callback resolve.
 * - Origin é validado contra ALLOWED_ORIGIN quando configurado.
 */
import { handlePreflight } from "../_shared/cors.ts";
import { json, toErrorResponse, readJson, badRequest } from "../_shared/http.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { requireEnv, getEnv } from "../_shared/env.ts";

type Provider = "google_ads" | "meta_ads" | "ga4" | "whatsapp";

const STATE_TTL_MS = 10 * 60 * 1000;

function safeOrigin(req: Request): string {
  const referer = req.headers.get("Referer") || req.headers.get("Origin") || "";
  let origin = "";
  try {
    origin = referer ? new URL(referer).origin : "";
  } catch {
    origin = "";
  }
  const allowed = (getEnv("ALLOWED_ORIGIN") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(origin)) return allowed[0];
  return origin;
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const user = await requireUser(req);
    const { provider } = await readJson<{ provider?: Provider }>(req);
    if (!provider) throw badRequest("provider é obrigatório");

    const origin = safeOrigin(req);
    const redirectUri = `${requireEnv("SUPABASE_URL")}/functions/v1/oauth-callback`;

    // Grava o state opaco de uso único.
    const stateId = crypto.randomUUID();
    const { error: stateErr } = await adminClient().from("oauth_states").insert({
      id: stateId,
      user_id: user.id,
      provider,
      origin,
      expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
    });
    if (stateErr) throw new Error(`Falha ao criar oauth_state: ${stateErr.message}`);

    let url: string;
    switch (provider) {
      case "google_ads":
        url = googleAuthUrl(redirectUri, stateId, "https://www.googleapis.com/auth/adwords");
        break;
      case "ga4":
        url = googleAuthUrl(redirectUri, stateId, "https://www.googleapis.com/auth/analytics.readonly");
        break;
      case "meta_ads":
        url = metaAuthUrl(redirectUri, stateId, "ads_read,ads_management,business_management");
        break;
      case "whatsapp": {
        const waRedirect = requireEnv("META_REDIRECT_URI");
        url = metaAuthUrl(
          waRedirect,
          stateId,
          "whatsapp_business_management,whatsapp_business_messaging,business_management",
        );
        break;
      }
      default:
        throw badRequest("Provider inválido");
    }

    return json(req, { url });
  } catch (err) {
    return toErrorResponse(req, err);
  }
});

function googleAuthUrl(redirectUri: string, state: string, scope: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function metaAuthUrl(redirectUri: string, state: string, scope: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("META_APP_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
  });
  const version = getEnv("META_API_VERSION") ?? "v19.0";
  return `https://www.facebook.com/${version}/dialog/oauth?${params}`;
}
