

# Campanhas ativas nao aparecem para clientes novos

## Problema

No hook `useAdsData`, quando um cliente novo nao tem nenhum dado em `daily_metrics`, o codigo entra no caminho de fallback (chamada ao vivo da API, linhas 267-313) e retorna os dados corretamente na **primeira** carga. Porem, esse caminho retorna cedo (`return`) **sem chamar `triggerLiveSync`** (que so e chamado na linha 476, no caminho dos dados persistidos).

O resultado:

1. **Primeira carga**: dados vem da API ao vivo — campanhas aparecem
2. **Segunda carga**: `daily_metrics` tem dados de ontem (persistidos pela API) → vai pelo caminho persistido → le `daily_campaigns` do banco, mas so tem dados parciais de ontem (Meta). Campanhas de hoje e Google nao estao la ainda
3. `triggerLiveSync` roda agora (fire-and-forget), persistindo hoje e ontem
4. **Terceira carga**: tudo aparece

Para clientes antigos, o `triggerLiveSync` ja rodou varias vezes e o cron `sync-daily-metrics` ja populou os dados historicos, entao campanhas sempre aparecem.

## Solucao

### Mudanca 1: Chamar `triggerLiveSync` no caminho de fallback

No `src/hooks/useAdsData.tsx`, logo apos o `setData(result)` no caminho de fallback (linha ~308), adicionar a chamada `triggerLiveSync(clientId)`. Isso garante que a persistencia em background comece imediatamente na primeira visita do cliente novo, para que na segunda carga os dados ja estejam completos.

```text
// Dentro do bloco fallback (metricRows.length === 0):
if (!result.error) {
  setData(result);
}
// NOVO: disparar sync em background para persistir dados
if (clientId && !DEMO_CLIENT_IDS.includes(clientId)) {
  triggerLiveSync(clientId);
}
setLoading(false);
return;
```

### Mudanca 2: Persistir dados de hoje na chamada LAST_2_DAYS do fetch-ads-data

O `shouldPersistToday` so e `true` quando `dateRange === "TODAY"`. Como o fallback usa `LAST_2_DAYS`, as campanhas de hoje nao sao persistidas. Ajustar a logica para tambem persistir hoje quando o range inclui hoje (LAST_2_DAYS, LAST_7_DAYS, etc).

No `supabase/functions/fetch-ads-data/index.ts`, linha 772:

```text
ANTES:
const shouldPersistToday = dateRange === "TODAY" || metaDatePreset === "today";

DEPOIS:
const shouldPersistToday = true; // Sempre persistir o dia de hoje quando temos dados
```

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useAdsData.tsx` | Adicionar `triggerLiveSync` no caminho de fallback |
| `supabase/functions/fetch-ads-data/index.ts` | Persistir dados de hoje em qualquer range |

## Resultado esperado

- Clientes novos terao campanhas ativas visiveis a partir da segunda carga do dashboard
- Dados de hoje sempre serao persistidos em `daily_campaigns`, independente do range selecionado

