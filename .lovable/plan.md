

## Plano: Cache inteligente para troca de período no dashboard

### Problema atual

Todas as queries usam `staleTime: 0`, forçando refetch completo a cada troca de período. Ao mudar de "Últimos 7 dias" para "Últimos 30 dias" e voltar, os dados são buscados novamente do zero, mesmo que nada tenha mudado.

### Solução

Usar o cache nativo do TanStack Query de forma inteligente, sem risco de inflar dados (cada query key já inclui `startDate` e `endDate`, então dados de períodos diferentes nunca se misturam).

**`src/hooks/useAdsData.tsx`** — Ajustes no cache:

1. **`staleTime` adequado nas queries de DB** — dados persistidos não mudam a cada segundo. Usar 5 minutos para `dbQuery` e `prevQuery`. Isso faz com que ao voltar para um período já visitado, os dados apareçam instantaneamente do cache.

2. **`gcTime` (garbage collection)** — manter dados em cache por 10 minutos mesmo após a query ser desativada, para que ao alternar entre períodos os dados já carregados sobrevivam.

3. **`placeholderData: keepPreviousData`** — enquanto os dados do novo período carregam, mostrar os dados do período anterior para evitar flash de loading. O TanStack Query fornece `isPlaceholderData` para saber quando é placeholder.

4. **Parar de remover queries ao trocar `clientId`** — em vez de `removeQueries`, usar apenas `invalidateQueries` para que o cache anterior não seja destruído (o clientId já faz parte da query key, então não há risco de mistura).

5. **`staleTime` menor no `enrichQuery`** — GA4/hourly/geo são dados ao vivo, manter 2 minutos.

6. **Loading state mais inteligente** — considerar `isPlaceholderData` para mostrar um indicador sutil (spinner pequeno) em vez de skeleton completo.

### O que NÃO muda (segurança contra inflação)

- Cada query key já contém `[clientId, startDate, endDate]` — dados de períodos diferentes nunca se cruzam
- A deduplicação por `date|account_id|platform` no `fetchDailyMetrics` continua ativa
- O `buildResultFromDB` agrega apenas os rows retornados, sem acumular com cache anterior

| Mudança | Detalhe |
|---------|---------|
| `dbQuery.staleTime` | `0` → `5 * 60 * 1000` (5 min) |
| `prevQuery.staleTime` | `0` → `5 * 60 * 1000` (5 min) |
| `enrichQuery.staleTime` | `0` → `2 * 60 * 1000` (2 min) |
| `gcTime` em todas | Adicionar `10 * 60 * 1000` (10 min) |
| `placeholderData` | `undefined` → `keepPreviousData` no dbQuery |
| `useEffect` de clientId | `removeQueries` → `invalidateQueries` |
| Loading state | Skeleton só quando não há dados nem placeholder |

