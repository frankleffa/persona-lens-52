

## Problema: Descoberta de eventos FTD não funciona

### Diagnóstico

Os logs da Edge Function não mostram **nenhuma** entrada com `list_custom_events`, o que indica que:

1. **A Edge Function pode não ter sido re-deployed** com o código novo de custom conversions
2. **OU** a chamada falha silenciosamente antes de chegar ao bloco `list_custom_events`

Da imagem do Meta: a conta `342318186911521` tem 2 conversões personalizadas:
- **ftd** (ID: 912920238402251)  
- **ftd2** (ID: 978308214876630)

### Solução

Duas correções:

**1. Forçar re-deploy da Edge Function** usando a ferramenta de deploy

**2. Adicionar log no início da action** para garantir visibilidade mesmo se der erro:

```typescript
// Adicionar ANTES de qualquer lógica
console.log(`[list_custom_events] CALLED with client_id=${clientId}`);
```

**3. Tratar o `req.json()` que pode falhar** — na linha 580, se `supabase.functions.invoke()` envia o body de forma que `req.json()` retorna `{}`, o `body.action` será `undefined` e o bloco nunca executa. Solução: mover o parse do body para ANTES das queries de connections, ou clonar o request.

### Mudanças no código

**`supabase/functions/fetch-ads-data/index.ts`:**
- Mover `const body = await req.json()` para o início do handler (logo após validar auth), ANTES das queries de `user_roles` e `oauth_connections`
- Adicionar log imediato: `console.log("[fetch-ads-data] action:", body.action)` para confirmar que o body está sendo parseado
- Adicionar log do `metaIds` para confirmar que as contas Meta estão sendo encontradas

**Re-deploy** da Edge Function para garantir que o código atualizado está live.

### Resultado esperado

Ao clicar no botão 🔍 de "Descobrir Eventos", o sistema vai:
1. Logar a ação no console (visível nos logs)
2. Buscar as custom conversions da conta `act_342318186911521`
3. Retornar "ftd" e "ftd2" no modal de seleção

