

## Plano: Adicionar campo FTD separado no banco de dados

### Objetivo
Criar uma coluna dedicada `ftd` (First Time Deposit) nas tabelas `daily_metrics` e `daily_campaigns` para rastrear FTDs de forma independente de purchases/registrations.

### Mudanças

**1. Migração de banco de dados**
- Adicionar coluna `ftd bigint DEFAULT 0` na tabela `daily_metrics`
- Adicionar coluna `ftd bigint DEFAULT 0` na tabela `daily_campaigns`
- Adicionar coluna `cost_per_ftd numeric DEFAULT 0` na tabela `daily_metrics` (para cálculo direto)

**2. Edge Functions — persistência de dados**
- `supabase/functions/fetch-ads-data/index.ts`: incluir campo `ftd` no upsert (inicialmente = purchases, até que uma fonte real de FTD seja configurada)
- `supabase/functions/backfill-metrics/index.ts`: incluir campo `ftd` no upsert
- `supabase/functions/sync-daily-metrics/index.ts`: incluir campo `ftd` no upsert

**3. Frontend — tipos e exibição**
- `src/lib/metric-utils.ts`: adicionar `ftd` e `cost_per_ftd` aos tipos `DailyMetricRow`
- `src/hooks/useAdsData.tsx`: incluir FTD nos cálculos de KPI
- `supabase/functions/analyze-client/index.ts`: usar campo `ftd` real em vez de proxy purchases

**4. Sem quebra de dados existentes**
- Colunas com DEFAULT 0 e nullable — dados antigos continuam funcionando
- Backfill pode ser rodado para preencher FTD histórico baseado em purchases existentes

