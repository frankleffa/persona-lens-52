

## Plano: Corrigir bugs nas Edge Functions de automação e IA

### Problemas encontrados

**1. `auto-optimize`: insert no `automation_log` com colunas inexistentes (BUG CRÍTICO)**
A Edge Function tenta inserir campos `action`, `campaign_name`, `external_campaign_id`, `details`, `status`, `error_message` na tabela `automation_log`, mas essa tabela só tem as colunas `action_taken` (text) e `result` (jsonb). Toda gravação de log falha silenciosamente.

**2. `analyze-client`: `buildMetaLivePrompt` retorna objeto mas tipo diz `string`**
A função `buildMetaLivePrompt` retorna `{ metricsSummary, campaignsSummary }` (um objeto), mas a assinatura de tipo indica `string`. Isso funciona em runtime (TypeScript no Deno não bloqueia), mas é um bug de tipagem que dificulta manutenção.

**3. `cron-whatsapp-reports`: sem proteção por `CRON_SECRET`**
Assim como `check-balance-alerts` foi protegido, esta função de cron também está exposta publicamente sem validação de header.

### Mudanças

1. **Migração SQL — adicionar colunas ao `automation_log`**
   Adicionar as colunas `action` (text), `campaign_name` (text), `external_campaign_id` (text), `details` (jsonb), `status` (text), `error_message` (text) à tabela `automation_log`, para que os inserts do `auto-optimize` funcionem corretamente.

2. **Corrigir tipagem de `buildMetaLivePrompt` em `analyze-client`**
   Alterar o retorno da função de `string` para `{ metricsSummary: string; campaignsSummary: string }`.

3. **Proteger `cron-whatsapp-reports` com `CRON_SECRET`**
   Adicionar a mesma validação de header `x-cron-secret` já aplicada em `check-balance-alerts`.

### Seção técnica

```text
automation_log (atual)          automation_log (após migração)
─────────────────────           ──────────────────────────────
id                              id
client_id                       client_id
rule_id                         rule_id
action_taken (text)             action_taken (text)
result (jsonb)                  result (jsonb)
created_at                      created_at
                                + action (text)
                                + campaign_name (text)
                                + external_campaign_id (text)
                                + details (jsonb)
                                + status (text)
                                + error_message (text)
```

