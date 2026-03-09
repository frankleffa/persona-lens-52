

## Plano: FTD sempre com dados dos últimos 30 dias

### Problema atual

Os KPIs de FTD (`ftd`, `cost_per_ftd`) e o card `RegToFtdFunnelCard` usam os mesmos `dailyMetricRows` filtrados pelo `dateRange` selecionado pelo usuário (ex: últimos 2 dias). O usuário quer que FTD sempre puxe 30 dias independente do filtro de data.

### Mudanças

**1. `src/hooks/useAdsData.tsx`**

- Adicionar uma query separada `ftd30Query` que sempre busca `daily_metrics` dos últimos 30 dias (fixo), independente do `dateRange`:
```typescript
const ftd30Query = useQuery({
  queryKey: ["ftd30", clientId],
  queryFn: () => fetchDailyMetrics(last30Start, last30End, clientId),
  staleTime: DB_STALE_TIME,
  enabled: !!clientId,
});
```
- Adicionar query `ftd30PrevQuery` para o período anterior (30 dias antes) para comparação de tendência
- Recalcular `ftd` e `cost_per_ftd` no `metricData` usando os dados de 30 dias em vez dos dados do `dateRange`
- Expor `ftd30Rows` (rows dos últimos 30 dias) e `ftd30PrevRows` para o `RegToFtdFunnelCard`

**2. `src/components/ClientDashboard.tsx`**

- Usar `ftd30Rows` e `ftd30PrevRows` no `RegToFtdFunnelCard` em vez de `dailyMetricRows`

### Resultado

- KPIs de FTD e o card de funil sempre mostram dados acumulados de 30 dias
- As outras métricas continuam respeitando o filtro de data selecionado
- A tendência compara com os 30 dias anteriores

