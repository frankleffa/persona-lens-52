

## Plano: FTD usar período selecionado no calendário

### Problema
Atualmente os KPIs de FTD e o card de funil usam queries fixas de 30 dias (`ftd30Query`/`ftd30PrevQuery`), ignorando o período selecionado pelo usuário no calendário.

### Mudanças

**`src/hooks/useAdsData.tsx`**
- Remover as queries `ftd30Query`, `ftd30PrevQuery` e todos os memos associados (`ftd30Start`, `ftd30End`, `ftd30PrevStart`, `ftd30PrevEnd`, `ftd30Agg`, `ftd30PrevAgg`)
- Remover o override de FTD no `metricData` (linhas 552-556) — deixar `ftd` e `cost_per_ftd` virem da agregação normal do `buildMetricData`
- Mudar `ftd30Rows` e `ftd30PrevRows` no return para usar `dbQuery.data?.metricRows` e `prevQuery.data` (os mesmos dados do período selecionado)
- Remover invalidações de `ftd30`/`ftd30prev` no `refetch`

**`src/components/ClientDashboard.tsx`**
- Renomear referências de `ftd30Rows`/`ftd30PrevRows` para `dailyMetricRows`/`previousMetricRows` no `RegToFtdFunnelCard`

### Resultado
FTD, cost_per_ftd e o card de funil cadastro→FTD refletirão exatamente o período selecionado no calendário.

