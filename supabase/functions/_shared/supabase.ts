/**
 * Criação centralizada de clientes Supabase.
 * - adminClient(): service_role, ignora RLS. NUNCA exponha a um caller não autenticado.
 * - userClient(req): herda o JWT do caller, respeita RLS. Use para ler/escrever
 *   "em nome do usuário" — assim o próprio RLS garante o isolamento multi-tenant.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv, getEnv } from "./env.ts";

export function adminClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function anonKey(): string {
  return getEnv("SUPABASE_ANON_KEY") ?? requireEnv("SUPABASE_PUBLISHABLE_KEY");
}

/** Cliente que age como o usuário do request (RLS aplicado). */
export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(requireEnv("SUPABASE_URL"), anonKey(), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { type SupabaseClient };
