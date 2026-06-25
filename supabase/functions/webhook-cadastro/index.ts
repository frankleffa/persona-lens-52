/**
 * Webhook de cadastro de lead (chamado por plataformas externas).
 *
 * Hardening vs. versão anterior (que era 100% aberta):
 * - Exige assinatura HMAC-SHA256 (x-webhook-signature) ou secret
 *   (x-webhook-secret) batendo com WEBHOOK_SECRET.
 * - Idempotência natural: leads tem UNIQUE(client_id, email); duplicado
 *   retorna "duplicado" em vez de erro silencioso travestido de sucesso.
 */
import { handlePreflight } from "../_shared/cors.ts";
import { json, toErrorResponse, badRequest } from "../_shared/http.ts";
import { verifyWebhookSignature } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const url = new URL(req.url);
    const client_id = url.searchParams.get("client_id");
    if (!client_id) throw badRequest("client_id na URL é obrigatório");

    const rawBody = await req.text();
    await verifyWebhookSignature(req, rawBody, "WEBHOOK_SECRET");

    let payload: { email?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; fbclid?: string };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw badRequest("Body JSON inválido");
    }
    const { email, utm_source, utm_medium, utm_campaign, fbclid } = payload;
    if (!email) throw badRequest("email é obrigatório");

    const final_utm_source = utm_source || (fbclid ? "facebook" : null);

    const { error } = await adminClient().from("leads").insert([{
      client_id,
      email,
      utm_source: final_utm_source,
      utm_medium: utm_medium ?? null,
      utm_campaign: utm_campaign ?? null,
      fbclid: fbclid || null,
    }]);

    if (error) {
      if (error.code === "23505") return json(req, { status: "duplicado" }, 200);
      throw error;
    }
    return json(req, { status: "sucesso" }, 201);
  } catch (err) {
    return toErrorResponse(req, err);
  }
});
