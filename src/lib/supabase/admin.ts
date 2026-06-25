import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — IGNORA RLS. USO EXCLUSIVO NO SERVIDOR.
 * Nunca importe isto em componentes client. A chave vem de uma env server-only
 * (SUPABASE_SERVICE_ROLE_KEY, sem NEXT_PUBLIC). Usado, p.ex., no portal público
 * por token, onde não há sessão do cliente mas o acesso é validado pelo token.
 */
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
