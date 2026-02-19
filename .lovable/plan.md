

# Corrigir "compras vieram menos": dados de campanha incompletos

## Diagnostico

### O que esta funcionando
- Campanhas duplicadas: **RESOLVIDO**. O banco agora tem 3 campanhas com IDs corretos.
- Metricas consolidadas (investimento, receita, ROAS): vem do `daily_metrics`, que tem dados dos 2 dias.

### O que esta errado
A tabela `daily_campaigns` nao tem dados de **ontem (2026-02-18)**. Isso faz com que as metricas que dependem de campanhas (compras, cadastros, mensagens) mostrem apenas os numeros de hoje.

| Fonte | Compras | Cadastros | Mensagens |
|-------|---------|-----------|-----------|
| Banco (daily_campaigns) - so hoje | 15 | 14 | 2 |
| API Meta (last_2d) | 10 | 2 | 3 |
| Esperado (ontem+hoje) | ~25 | ~16 | ~5 |

A discrepancia existe porque:
1. `daily_campaigns` so tem dados de HOJE (ontem nunca foi persistido ou foi apagado)
2. `daily_metrics` nao tem colunas de `purchases`, `registrations`, `messages` — so tem `conversions` generico
3. A API do Meta com preset `last_2d` retorna numeros agregados diferentes da soma dos dias individuais (comportamento conhecido da atribuicao do Meta)

## Solucao

### Mudanca 1: Adicionar colunas de compras/cadastros/mensagens ao daily_metrics

Adicionar as colunas `purchases`, `registrations` e `messages` na tabela `daily_metrics`. Isso permite que cada dia tenha esses dados salvos de forma independente, sem depender da tabela de campanhas.

```text
ALTER TABLE daily_metrics ADD COLUMN purchases bigint DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN registrations bigint DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN messages bigint DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN leads bigint DEFAULT 0;
```

### Mudanca 2: Persistir purchases/registrations/messages no edge function

Atualizar o `fetch-ads-data` para salvar essas metricas novas no `daily_metrics` durante a persistencia.

### Mudanca 3: Usar daily_metrics para compras/cadastros no frontend

Atualizar o `useAdsData.tsx` para ler compras, cadastros e mensagens do `daily_metrics` (agregado por dia) em vez de depender exclusivamente do `daily_campaigns`.

Isso resolve o problema porque:
- Cada dia tera seus numeros de compras/cadastros salvos
- Ao visualizar "Ontem e Hoje", os totais serao a **soma dos 2 dias individuais**
- Nao depende mais da API `last_2d` do Meta (que agrega de forma diferente)

### Mudanca 4: Backfill dos dados de ontem

Apos adicionar as colunas, o proximo triggerLiveSync salvara os dados de hoje. Para ontem, os dados ja estao no `daily_metrics` (conversions=2, revenue=335.28), mas sem purchases/registrations. Precisamos rodar o backfill para 1 dia para popular essas colunas.

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | Adicionar colunas purchases, registrations, messages, leads ao daily_metrics |
| `supabase/functions/fetch-ads-data/index.ts` | Persistir as novas colunas no daily_metrics |
| `src/hooks/useAdsData.tsx` | Ler purchases/registrations/messages do daily_metrics em vez de daily_campaigns |

## Fluxo corrigido

```text
ANTES:
- daily_metrics: spend, revenue, conversions, clicks, impressions, ctr, cpc, cpm, roas, cpa
- daily_campaigns: spend, clicks, purchases, registrations, messages, leads, revenue
- Dashboard LAST_2_DAYS: purchases vem de daily_campaigns (so tem hoje = 15)

DEPOIS:
- daily_metrics: spend, revenue, conversions, clicks, impressions, ctr, cpc, cpm, roas, cpa, purchases, registrations, messages, leads
- daily_campaigns: (mantido como esta, para detalhamento por campanha)
- Dashboard LAST_2_DAYS: purchases vem de daily_metrics (tem ontem=X + hoje=15 = total correto)
```

