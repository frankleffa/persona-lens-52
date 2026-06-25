import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "admin" | "manager" | "client";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
};

/**
 * Carrega o usuário atual + perfil + papel. Usa o client com RLS (o usuário
 * só lê o próprio profile/role). Fonte: tabelas profiles e user_roles.
 */
export async function getCurrentUser(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<CurrentUser> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  // Precedência: admin > manager > client.
  const set = new Set((roles ?? []).map((r: { role: string }) => r.role));
  const role: AppRole = set.has("admin") ? "admin" : set.has("client") ? "client" : "manager";

  return {
    id: userId,
    email: profile?.email ?? email,
    fullName: profile?.full_name ?? null,
    role,
  };
}
