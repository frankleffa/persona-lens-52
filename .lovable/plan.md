

## Diagnóstico: 42 cadastros vs 20 reais

### Causa raiz provável

Existem **2 cenários** que explicam a inflação de 20 → 42:

**1. Dados históricos corrompidos no banco** (mais provável)
As correções na separação `registrations` vs `leads` foram feitas nas Edge Functions, mas os dados **já salvos** na tabela `daily_metrics` ainda contêm os valores antigos inflados (onde `registrations` = `complete_registration` + `lead` somados). A sincronização diária (`sync-daily-metrics`) só corrige dados do dia atual — os dias anteriores permanecem com valores errados.

**2. Múltiplas contas Meta vinculadas ao mesmo cliente**
Se o cliente tem 2+ contas Meta (`client_meta_ad_accounts`) que reportam os mesmos eventos do mesmo pixel, os cadastros são somados por conta. Exemplo: 2 contas × 20 cadastros = 40 (próximo de 42).

### Solução

**Passo 1: Verificar no banco qual é o problema**
Rodar uma query SQL para ver os dados atuais do cliente:

```sql
SELECT date, account_id, platform, registrations, leads, purchases
FROM daily_metrics
WHERE client_id = '<UUID_DO_CLIENTE>'
  AND platform = 'meta'
ORDER BY date DESC
LIMIT 30;
```

Isso revela: (a) se há múltiplos `account_id` duplicando métricas, ou (b) se os valores de `registrations` estão inflados por dia.

**Passo 2: Re-backfill para corrigir dados históricos**
Chamar o endpoint de backfill para reprocessar os últimos 30 dias com a lógica corrigida:

```bash
curl -X POST https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/backfill-metrics \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "<UUID_DO_CLIENTE>", "days": 30}'
```

**Passo 3: Adicionar botão de re-backfill na UI** (facilidade)
Adicionar um botão "Reprocessar Dados" na página de controle da agência (`AgencyControlCenter`) para que o manager possa re-executar o backfill para qualquer cliente sem precisar usar terminal.

### Mudanças de código

**`src/pages/AgencyControlCenter.tsx`** (ou componente equivalente de gestão de clientes)
- Adicionar botão "Reprocessar Histórico" por cliente
- Chama `supabase.functions.invoke("backfill-metrics", { body: { client_id, days: 30 } })`
- Toast de progresso/sucesso/erro

### Arquivo alterado
- `src/pages/AgencyControlCenter.tsx` — botão de re-backfill

