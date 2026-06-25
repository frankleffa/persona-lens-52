/**
 * Autenticação compartilhada.
 *
 * Contexto: quase todas as funções rodam com `verify_jwt = false` no
 * config.toml, então a verificação É responsabilidade do código. Antes isso
 * era inconsistente (algumas validavam, várias não). Aqui centralizamos:
 *
 * - requireUser(req): exige um JWT válido de usuário (chamadas do app).
 * - requireCronSecret(req): exige o header secreto dos crons (server-to-server).
 * - verifyWebhookSignature(req, body, secret): HMAC-SHA256, à prova de replay
 *   trivial e com comparação em tempo constante (webhooks de pagamento/cadastro).
 */
import { unauthorized } from "./http.ts";
import { userClient } from "./supabase.ts";
import { getEnv, requireEnv } from "./env.ts";

export type AuthedUser = { id: string; email?: string };

/** Valida o Bearer token e retorna o usuário. Lança 401 se inválido. */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) throw unauthorized("Token ausente");
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await userClient(req).auth.getUser(token);
  if (error || !data.user) throw unauthorized("Token inválido");
  return { id: data.user.id, email: data.user.email ?? undefined };
}

/** Comparação em tempo constante (evita timing attacks em secrets). */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

/** Exige o header de cron (`x-cron-secret`) batendo com CRON_SECRET. */
export function requireCronSecret(req: Request): void {
  const expected = requireEnv("CRON_SECRET");
  const got = req.headers.get("x-cron-secret") ?? "";
  if (!got || !timingSafeEqual(got, expected)) throw unauthorized("Cron secret inválido");
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifica assinatura de webhook. Aceita HMAC-SHA256 hex em
 * `x-webhook-signature` (preferido) OU fallback de secret em texto em
 * `x-webhook-secret` (compatibilidade) — exige `rawBody` para o HMAC.
 * `secretEnvKey` é a env onde o secret está (ex.: "LTV_WEBHOOK_SECRET").
 */
export async function verifyWebhookSignature(
  req: Request,
  rawBody: string,
  secretEnvKey: string,
): Promise<void> {
  const secret = getEnv(secretEnvKey);
  if (!secret) throw unauthorized(`Webhook secret não configurado (${secretEnvKey})`);

  const sigHeader = req.headers.get("x-webhook-signature");
  if (sigHeader) {
    const expected = await hmacSha256Hex(secret, rawBody);
    if (!timingSafeEqual(sigHeader.replace(/^sha256=/, ""), expected)) {
      throw unauthorized("Assinatura de webhook inválida");
    }
    return;
  }

  const plain = req.headers.get("x-webhook-secret");
  if (plain && timingSafeEqual(plain, secret)) return;

  throw unauthorized("Webhook não assinado");
}
