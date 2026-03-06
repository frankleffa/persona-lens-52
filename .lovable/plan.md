

## Diagnóstico: Dados de conversões por hora não aparecem

### Causa raiz

Os dados de "Conversões por Hora" **nunca são salvos no banco de dados**. Eles vêm exclusivamente da chamada live à Edge Function `fetch-ads-data` (query `liveEnrich`), que é feita em background após carregar os dados do banco.

O fluxo atual:
1. `buildResultFromDB()` sempre retorna `hourly_conversions: null` (linha 181)
2. A query `liveEnrich` chama a API live para preencher hourly/geo/GA4
3. Se essa chamada falha, demora, ou o cliente é demo → dados ficam `null` → aparece "Sem dados"

Possíveis razões para não aparecer:
- A Edge Function `fetch-ads-data` pode estar falhando silenciosamente (timeout de 15s)
- O Meta Ads pode não estar retornando dados hourly (token expirado, sem ações no período)
- O `enrichQuery` tem `retry: 0` — qualquer falha = sem dados

### Plano de correção

**1. Adicionar fallback e melhorar resiliência**
- No `useAdsData.tsx`: aumentar retry do `enrichQuery` de 0 para 1
- Garantir que quando `liveQuery` é usado como fallback (sem DB data), o hourly_conversions dele seja preservado

**2. Persistir dados hourly no banco (solução definitiva)**
- Criar tabela `hourly_metrics` com colunas: `client_id`, `date`, `hour`, `purchases`, `registrations`, `messages`
- Na Edge Function `fetch-ads-data`: salvar dados hourly nessa tabela durante persistência
- No `buildResultFromDB`: ler dados hourly do banco em vez de depender da API live

**3. Alternativa mais simples (sem nova tabela)**
- Na Edge Function, salvar hourly_conversions como JSON na tabela `daily_metrics` (nova coluna `hourly_data jsonb`)
- Ler esse JSON no frontend quando disponível

### Recomendação

A **opção 2** (tabela dedicada) é a mais robusta e consistente com a arquitetura existente. A **opção 3** é mais rápida de implementar. Em ambos os casos, o `enrichQuery` com retry 0 e timeout de 15s continua como problema imediato que deve ser corrigido.

### Mudanças concretas

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAdsData.tsx` | Aumentar `retry` do enrichQuery para 1; log de erro |
| `supabase/functions/fetch-ads-data/index.ts` | Persistir hourly data (JSON ou tabela) |
| Migração SQL | Adicionar coluna `hourly_data jsonb` em `daily_metrics` OU criar tabela `hourly_metrics` |
| `src/services/ads-data.ts` | Ler hourly data do banco |
| `src/hooks/useAdsData.tsx` | Usar hourly data do banco no `buildResultFromDB` |

