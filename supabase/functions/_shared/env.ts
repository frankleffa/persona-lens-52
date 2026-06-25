/**
 * Acesso a variáveis de ambiente com validação.
 * Antes: `Deno.env.get("X")!` espalhado — um secret faltando virava erro
 * obscuro lá na frente. Agora falha cedo e claro.
 */

export function getEnv(key: string): string | undefined {
  return Deno.env.get(key);
}

export function requireEnv(key: string): string {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`Variável de ambiente ausente: ${key}`);
  return v;
}

/** Pega várias de uma vez, falhando se qualquer uma faltar. */
export function requireEnvs<K extends string>(...keys: K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  const missing: string[] = [];
  for (const k of keys) {
    const v = Deno.env.get(k);
    if (!v) missing.push(k);
    else out[k] = v;
  }
  if (missing.length) throw new Error(`Variáveis de ambiente ausentes: ${missing.join(", ")}`);
  return out;
}
