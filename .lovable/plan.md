

# Corrigir painel de conversoes e GA4: erro no edge function

## Problema

O edge function `fetch-ads-data` esta retornando **500** com o erro `"shouldPersist is not defined"`. Todas as chamadas falham, incluindo:
- O background fetch que traz GA4, conversoes por hora e dados geograficos
- O triggerLiveSync que persiste dados de hoje/ontem

Causa: na ultima edicao, a variavel `shouldPersist` foi renomeada para `shouldPersistToday` (linha 769), mas a referencia na linha 921 nao foi atualizada.

## Solucao

Uma unica mudanca: substituir `shouldPersist` por `shouldPersistToday` na linha 921 do edge function.

```text
ANTES (linha 921):
if (shouldPersist) {

DEPOIS:
if (shouldPersistToday) {
```

Nenhum outro arquivo precisa ser alterado. O painel de conversoes e o GA4 ja tem a logica de merge implementada no frontend (linhas 480-553 do useAdsData.tsx) — so nao funcionam porque o edge function crasha antes de retornar os dados.

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Corrigir referencia `shouldPersist` para `shouldPersistToday` na linha 921 |

## Resultado esperado

- Edge function volta a funcionar (sem erro 500)
- GA4 (sessoes, eventos, taxa de conversao) aparece novamente no dashboard
- Painel de conversoes (por hora e por GEO) volta a funcionar
- triggerLiveSync persiste dados normalmente em background

