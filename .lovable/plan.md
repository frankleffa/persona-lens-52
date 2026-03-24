

## Diagnóstico: Menos campanhas ativas + cadastros errados

### Problema 1: Campanhas ativas faltando

Existem **3 filtros** que eliminam campanhas do dashboard:

1. **`limit=30`** na URL do Meta (linha 354 de `fetch-ads-data`): se o cliente tem mais de 30 campanhas ativas, as excedentes não aparecem
2. **`if (spend === 0) continue`** (linha 400): campanhas ativas que ainda não gastaram no período selecionado são descartadas — mesmo tendo resultados orgânicos ou estando recém-criadas
3. **`LIMIT 20`** no Google Ads (linha 169): mesma limitação para campanhas Google
4. **No `sync-daily-metrics` e `backfill-metrics`**: provavelmente o mesmo `LIMIT 20` para Google e filtros similares para Meta

### Problema 2: Cadastros errados

Os cadastros já foram corrigidos nas funções `fetch-ads-data`, `sync-daily-metrics`, `backfill-metrics` e `analyze-client`. Porém:

- **Dados históricos no banco** (`daily_metrics` e `daily_campaigns`) ainda contêm valores inflados do período antes da correção
- É necessário **re-executar o backfill** para os clientes afetados para corrigir os dados salvos
- Além disso, o merge no `useAdsData.tsx` (linha 478) substitui campanhas do banco pelas do live quando o enrichment retorna dados — isso pode causar inconsistências se o live retorna menos campanhas

### Solução

**1. Aumentar limites de campanhas em `fetch-ads-data/index.ts`**
- Meta: mudar `limit=30` para `limit=100` na URL de campanhas (linha 354)
- Google: mudar `LIMIT 20` para `LIMIT 100` na query de campanhas (linha 169)
- Remover o filtro `if (spend === 0) continue` — campanhas ativas sem spend devem aparecer com spend=0

**2. Aumentar limites em `sync-daily-metrics/index.ts`**
- Mesmas mudanças de limite para manter consistência

**3. Aumentar limites em `backfill-metrics/index.ts`**
- Google: mudar `LIMIT 20` para `LIMIT 100` (linha ~170)
- Meta: aumentar limite equivalente

**4. Corrigir merge de campanhas no `useAdsData.tsx`**
- Linha 478: ao invés de substituir completamente as campanhas do banco pelas do live, fazer merge inteligente — usar live como base mas incluir campanhas do banco que não existem no live (para períodos multi-dia)

**5. Re-backfill dos dados históricos**
- Após deploy, o manager precisa re-executar o backfill para cada cliente para corrigir os cadastros inflados nos dados já salvos

### Arquivos alterados
- `supabase/functions/fetch-ads-data/index.ts` — aumentar limites, remover filtro spend=0
- `supabase/functions/sync-daily-metrics/index.ts` — aumentar limites
- `supabase/functions/backfill-metrics/index.ts` — aumentar limites
- `src/hooks/useAdsData.tsx` — merge inteligente de campanhas live + banco

