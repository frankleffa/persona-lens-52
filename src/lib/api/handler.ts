import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Fundação dos route handlers do Next (substituem as edge functions que o
 * front chama). Espelha o padrão de _shared das functions: autenticação
 * obrigatória + erros sanitizados com id de correlação.
 *
 * Uso:
 *   export const GET = authedHandler(async ({ supabase, user }) => {
 *     const { data } = await supabase.from("leads").select("*");
 *     return data;
 *   });
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (m = "Requisição inválida") => new ApiError(400, m);
export const unauthorized = (m = "Não autorizado") => new ApiError(401, m);
export const forbidden = (m = "Acesso negado") => new ApiError(403, m);
export const notFound = (m = "Não encontrado") => new ApiError(404, m);

type Ctx = {
  req: Request;
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Envolve um handler exigindo usuário autenticado. O `supabase` injetado
 * age como o usuário (RLS aplicado) — o isolamento multi-tenant é garantido
 * pelas policies, não por filtros manuais.
 */
export function authedHandler(fn: (ctx: Ctx) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw unauthorized();

      const result = await fn({ req, user, supabase });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      const correlationId = crypto.randomUUID();
      console.error(`[api ${correlationId}]`, err);
      return NextResponse.json(
        { error: "Erro interno do servidor", correlationId },
        { status: 500 },
      );
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw badRequest("Body JSON inválido");
  }
}
