

## Plano: Animação de rotação no botão de refresh + toast de sucesso

### Mudanças

**`src/components/ClientDashboard.tsx`**:

1. Extrair `isBackgroundRefetch` do `useAdsData` (já está exposto pelo hook, só não está sendo desestruturado na linha 96)

2. Criar um estado local `wasRefetching` para detectar a transição de "atualizando" → "atualizado":
   - Usar `useEffect` que observa `loading || isBackgroundRefetch`
   - Quando transiciona de `true` → `false`, disparar `toast.success("Dados atualizados com sucesso!")`
   - Só disparar após um refetch manual (flag `isManualRefetch` setado no `onClick`)

3. Atualizar o ícone `RefreshCw`:
   - Animar com `animate-spin` sempre que `loading || isBackgroundRefetch` for true (não apenas `loading`)
   - Isso garante que o ícone gira durante todo o processo de atualização, incluindo enriquecimento em background

4. Toast de sucesso via `sonner` (já importado na linha 17):
   - `toast.success("Dados atualizados com sucesso!")` quando a atualização completa

| Linha | Mudança |
|-------|---------|
| 96 | Adicionar `isBackgroundRefetch` na desestruturação do `useAdsData` |
| ~96-100 | Adicionar `useRef` para `isManualRefetch` + `useEffect` para detectar fim da atualização e disparar toast |
| 218 | `animate-spin` quando `loading \|\| isBackgroundRefetch` em vez de apenas `loading` |

