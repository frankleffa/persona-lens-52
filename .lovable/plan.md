

# Problema: Redirecionamento OAuth para URL errada

## Diagnóstico

O arquivo `oauth-callback/index.ts` (linha 14 e 29) tem um fallback hardcoded:

```
const APP_URL = Deno.env.get("APP_URL") || "https://id-preview--11c33897-8c98-4723-9aae-0320f299c69c.lovable.app";
```

Quando o cliente acessa via `adscape.com.br` ou `persona-lens-52.lovable.app`, após autorizar no Google, o callback redireciona para a URL de preview do Lovable em vez de voltar para a URL de origem.

## Solução

Passar a URL de origem no `state` do OAuth para que o callback saiba para onde redirecionar.

### Mudanças

**1. `supabase/functions/oauth-init/index.ts`**
- Em cada provider, incluir `origin` no objeto `state` extraído do header `Referer` ou `Origin` da requisição.
- Exemplo: `state = btoa(JSON.stringify({ provider: "google_ads", token: authHeader, origin: referer }))`

**2. `supabase/functions/oauth-callback/index.ts`**
- Extrair `origin` do state decodificado.
- Usar `state.origin` como `APP_URL` em vez do fallback hardcoded.
- Manter o fallback apenas como último recurso.

### Fluxo corrigido

```text
Cliente em adscape.com.br
  → clica "Conectar Google"
  → oauth-init recebe Referer: https://adscape.com.br
  → state = { provider, token, origin: "https://adscape.com.br" }
  → Google consent screen
  → oauth-callback decodifica state.origin
  → redireciona para https://adscape.com.br/conexoes?connected=google_ads
```

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/oauth-init/index.ts` | Adicionar `origin` (do Referer/Origin header) ao state de todos os providers |
| `supabase/functions/oauth-callback/index.ts` | Usar `state.origin` como APP_URL, remover fallback hardcoded |

