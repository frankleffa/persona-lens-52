/**
 * CORS compartilhado para todas as edge functions.
 * Antes: o mesmo bloco era copiado em ~26 funções.
 *
 * Em produção, prefira restringir a origem via ALLOWED_ORIGIN (CSV) em vez de "*".
 * Webhooks server-to-server podem usar `corsHeaders` direto (origem não importa).
 */

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-secret, x-cron-secret";

function resolveOrigin(req?: Request): string {
  const allowed = (Deno.env.get("ALLOWED_ORIGIN") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return "*";
  const origin = req?.headers.get("origin") ?? "";
  return allowed.includes(origin) ? origin : allowed[0];
}

export function corsHeaders(req?: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(req),
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

/** Responde a preflight OPTIONS. Retorna null se não for OPTIONS. */
export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  return null;
}
