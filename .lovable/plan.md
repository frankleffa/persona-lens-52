

## Diagnóstico: Edge Function `analyze-client` não está deployada

### Problema
Os logs mostram `FunctionsFetchError: Failed to send a request to the Edge Function` ao chamar `analyze-client`. A causa é que a função **não está registrada no `supabase/config.toml`**, então ela não é deployada automaticamente.

### Correção

**`supabase/config.toml`** — Adicionar a configuração da função:

```toml
[functions.analyze-client]
verify_jwt = false
```

Isso fará o deploy automático da função, permitindo que ela seja chamada pelo frontend.

### Resumo

| Arquivo | Mudança |
|---------|---------|
| `supabase/config.toml` | Adicionar `[functions.analyze-client]` com `verify_jwt = false` |

Uma linha de configuração. Sem mudança de código.

