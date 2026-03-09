

## Diagnóstico: Conversão personalizada FTD não encontrada

### Problema identificado

Ao testar a chamada da Edge Function `list_custom_events`, ela retorna 0 eventos. Existem dois problemas prováveis:

1. **Erros silenciados**: Tanto o endpoint de `insights` quanto o de `customconversions` têm `try/catch` que fazem `console.warn` mas não retornam o erro ao usuário. Se a API do Meta retorna um erro (token expirado, permissão faltando, etc.), o código simplesmente ignora e retorna lista vazia.

2. **Falta de logs de diagnóstico**: Não há logs suficientes para entender o que a API do Meta retorna de fato. Precisamos logar as respostas brutas.

### Solução

Melhorar a Edge Function `list_custom_events` com:

| Mudança | Detalhe |
|---------|---------|
| Logs detalhados | Logar a resposta bruta de cada chamada Meta (insights e customconversions), incluindo erros |
| Retornar erros parciais | Incluir campo `warnings` na resposta para que o frontend mostre o que deu errado |
| Fallback com `me/customconversions` | Se `/{ad_account}/customconversions` falhar, tentar o endpoint `me/customconversions` que retorna TODAS as conversões da conta do usuário |

### Mudanças no código

**`supabase/functions/fetch-ads-data/index.ts`** (action `list_custom_events`):
- Adicionar `console.log` com a resposta bruta da API do Meta para ambos endpoints
- Se `customconversions` retornar erro, logar o erro completo e tentar fallback via `/me/customconversions`
- Retornar campo `warnings: string[]` na resposta para debugging no frontend

**`src/components/analysis/ClientAnalysisConfig.tsx`**:
- Mostrar warnings retornados pela API no modal de eventos (para ajudar a diagnosticar)

**`src/hooks/useClientAnalysisConfig.ts`**:
- Incluir `warnings` no retorno da query de eventos

