/**
 * Respostas HTTP padronizadas com CORS e erros sanitizados.
 *
 * Antes: cada função montava `new Response(JSON.stringify(...))` à mão e
 * devolvia `error.message` cru ao cliente (vazava internals de DB/API).
 * Agora: detalhes do erro vão pro log do servidor; o cliente recebe uma
 * mensagem genérica + um id de correlação.
 */
import { corsHeaders } from "./cors.ts";

export function json(
  req: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", ...extraHeaders },
  });
}

/** Erro previsível/esperado, cuja mensagem é segura para o cliente ver. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg = "Requisição inválida") => new HttpError(400, msg);
export const unauthorized = (msg = "Não autorizado") => new HttpError(401, msg);
export const forbidden = (msg = "Acesso negado") => new HttpError(403, msg);
export const notFound = (msg = "Não encontrado") => new HttpError(404, msg);

/**
 * Converte qualquer throw em Response. HttpError vai com sua mensagem;
 * erros inesperados viram 500 genérico (+ log com correlação).
 */
export function toErrorResponse(req: Request, err: unknown): Response {
  if (err instanceof HttpError) {
    return json(req, { error: err.message }, err.status);
  }
  const correlationId = crypto.randomUUID();
  const detail = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ""}` : String(err);
  console.error(`[${correlationId}]`, detail);
  return json(req, { error: "Erro interno do servidor", correlationId }, 500);
}

/** Faz parse do JSON do body com erro amigável. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw badRequest("Body JSON inválido");
  }
}
