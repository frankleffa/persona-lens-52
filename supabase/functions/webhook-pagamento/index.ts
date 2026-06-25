/**
 * Webhook de pagamento — incrementa o LTV do lead.
 *
 * Hardening vs. versão anterior (aberta, sem idempotência):
 * - Exige assinatura/secret (WEBHOOK_SECRET).
 * - Idempotência: registra o evento em webhook_events (UNIQUE por
 *   client_id + idempotency_key). Reentrada não soma o valor de novo.
 *   A chave vem de x-idempotency-key ou, na falta, do hash do body.
 */
import { handlePreflight } from "../_shared/cors.ts";
import { json, toErrorResponse, badRequest, notFound } from "../_shared/http.ts";
import { verifyWebhookSignature } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const url = new URL(req.url);
    const client_id = url.searchParams.get("client_id");
    if (!client_id) throw badRequest("client_id na URL é obrigatório");

    const rawBody = await req.text();
    await verifyWebhookSignature(req, rawBody, "WEBHOOK_SECRET");

    let payload: { email?: string; valor_pago?: number | string };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw badRequest("Body JSON inválido");
    }
    const { email, valor_pago } = payload;
    if (!email || valor_pago === undefined) throw badRequest("email e valor_pago são obrigatórios");

    const valor = parseFloat(String(valor_pago));
    if (!Number.isFinite(valor)) throw badRequest("valor_pago inválido");

    const idemKey = req.headers.get("x-idempotency-key") || (await sha256Hex(`${client_id}:${rawBody}`));
    const supabase = adminClient();

    // Idempotência: tenta registrar o evento; se já existe, é replay → no-op.
    const { error: evErr } = await supabase
      .from("webhook_events")
      .insert({ client_id, source: "pagamento", idempotency_key: idemKey });
    if (evErr) {
      if (evErr.code === "23505") return json(req, { status: "duplicado" }, 200);
      throw evErr;
    }

    const { data: lead, error: fetchErr } = await supabase
      .from("leads")
      .select("id, ltv_total")
      .eq("email", email)
      .eq("client_id", client_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!lead) throw notFound("Lead não encontrado para este cliente");

    const novoLtv = (parseFloat(lead.ltv_total) || 0) + valor;
    const { error: updErr } = await supabase.from("leads").update({ ltv_total: novoLtv }).eq("id", lead.id);
    if (updErr) throw updErr;

    return json(req, { status: "sucesso", novoLtv }, 200);
  } catch (err) {
    return toErrorResponse(req, err);
  }
});
