

## Plano: Proteger `check-balance-alerts` com validação de secret header

### Problema
A Edge Function `check-balance-alerts` não valida nenhuma credencial. Qualquer pessoa com a URL pode invocá-la, disparando verificações de saldo e envios de WhatsApp indevidos.

### Solução
Adicionar validação de um header secreto (`x-cron-secret`) no início da função. O valor será comparado com um secret armazenado no backend (`CRON_SECRET`). Isso garante que apenas o cron job (que envia o header correto) possa executar a função.

### Mudanças

1. **Criar secret `CRON_SECRET`** — usar a ferramenta `add_secret` para pedir ao usuário um valor aleatório que será usado como token de autenticação do cron.

2. **Editar `supabase/functions/check-balance-alerts/index.ts`** — após o check de OPTIONS, validar:
   ```typescript
   const cronSecret = req.headers.get("x-cron-secret");
   if (cronSecret !== Deno.env.get("CRON_SECRET")) {
     return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
   }
   ```

3. **Atualizar o cron job SQL** (se existir) — adicionar o header `x-cron-secret` na chamada `net.http_post` para que o agendamento continue funcionando.

