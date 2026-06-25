import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components / Route Handlers / Server Actions.
 * Lê e escreve a sessão nos cookies (SSR), então o `auth.getUser()` funciona
 * no servidor e o RLS é aplicado em nome do usuário logado.
 *
 * Em Server Components puros o `setAll` é no-op (não há resposta para setar
 * cookies) — o refresh de sessão acontece no middleware. Aqui só ignoramos.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component — ignorável (middleware faz o refresh).
          }
        },
      },
    },
  );
}
