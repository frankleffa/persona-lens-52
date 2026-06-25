/**
 * Refresh de token do Google OAuth — antes duplicado em fetch-ads-data,
 * sync-daily-metrics e manage-connections (3 cópias).
 *
 * Melhorias vs. original:
 * - usa o `expires_in` real retornado (não 1h hardcoded);
 * - retry com backoff exponencial em falha transitória de rede/5xx;
 * - persiste o token renovado em oauth_connections.
 */
import type { SupabaseClient } from "./supabase.ts";
import { requireEnvs } from "./env.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postRefresh(refreshToken: string, attempts = 3): Promise<Response> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = requireEnvs("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      // 4xx (ex.: invalid_grant) não adianta repetir; 5xx sim.
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      lastErr = new Error(`Google token endpoint ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < attempts - 1) await sleep(2 ** i * 500);
  }
  throw lastErr ?? new Error("Falha ao renovar token Google");
}

/**
 * Garante um access_token válido para (managerId, provider). Renova e persiste
 * se estiver expirando. Retorna null se não há conexão/refresh token.
 */
export async function getValidGoogleToken(
  admin: SupabaseClient,
  managerId: string,
  provider: string,
): Promise<string | null> {
  const { data: conn } = await admin
    .from("oauth_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("manager_id", managerId)
    .eq("provider", provider)
    .eq("connected", true)
    .maybeSingle();

  if (!conn) return null;
  if (!conn.refresh_token) return conn.access_token ?? null;

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + EXPIRY_BUFFER_MS) return conn.access_token;

  const res = await postRefresh(conn.refresh_token);
  const tokenData = await res.json();
  if (!res.ok) {
    console.error(`[google] refresh falhou (${provider}):`, tokenData?.error ?? res.status);
    return null;
  }

  const newAccessToken = tokenData.access_token as string;
  const expiresIn = Number(tokenData.expires_in) || 3600;
  await admin
    .from("oauth_connections")
    .update({
      access_token: newAccessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    })
    .eq("manager_id", managerId)
    .eq("provider", provider);

  return newAccessToken;
}
