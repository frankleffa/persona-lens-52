

## Plano: Limpar dados históricos inflados e re-sincronizar

### Problema 1: Purchases/leads/messages zerados no histórico
Os dias antes de 5/Mar foram importados pelo backfill antes das colunas `purchases`, `leads`, `messages` existirem ou serem populadas. O `conversions` está preenchido mas as colunas específicas não.

### Problema 2: Revenue inflado (Fev 27 - Mar 1)
Os registros de 27/Fev a 1/Mar têm valores de receita absurdos (68K, 137K, 88K) — resíduo do bug de persistência com ranges agregados.

### Mudanças

**Migration SQL** — Limpar dados corrompidos e forçar re-sync:
```sql
-- Deletar métricas com revenue claramente inflado (> 10K em um dia)
DELETE FROM daily_metrics 
WHERE revenue > 10000 
  AND date < CURRENT_DATE;

-- Deletar campanhas dos mesmos dias para consistência
DELETE FROM daily_campaigns 
WHERE date < '2026-03-05';

-- Deletar métricas históricas sem purchases/leads populados
DELETE FROM daily_metrics 
WHERE date < '2026-03-05'
  AND purchases = 0 
  AND leads = 0 
  AND messages = 0;
```

Após a limpeza, o manager pode clicar em "Importar Histórico" para re-importar com a lógica corrigida, que agora popula purchases, leads e messages corretamente.

**`supabase/functions/backfill-metrics/index.ts`** — Verificar se a função de backfill persiste as colunas `purchases`, `leads`, `messages` no upsert. Se não, corrigir para incluí-las.

### Resumo
| Ação | Escopo |
|------|--------|
| Migration: deletar dados corrompidos (revenue inflado + colunas vazias) | daily_metrics + daily_campaigns antes de 5/Mar |
| Verificar/corrigir backfill function | Garantir que purchases/leads/messages são persistidos |

Após implementar, o manager clica "Importar Histórico" para re-popular com dados limpos.

