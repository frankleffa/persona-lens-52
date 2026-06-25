import { authedHandler } from "@/lib/api/handler";
import { getCurrentUser } from "@/lib/services/profile";

/** Usuário autenticado atual (perfil + papel). Consumido pelo menu do usuário. */
export const GET = authedHandler(({ supabase, user }) =>
  getCurrentUser(supabase, user.id, user.email ?? null),
);
