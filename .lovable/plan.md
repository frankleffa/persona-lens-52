

# Corrigir Fluxo de Dados por Cliente

## Problema Identificado

O dashboard exibe os mesmos dados para todos os clientes porque:

1. **Edge function `fetch-ads-data`**: Quando o gestor visualiza o dashboard de um cliente especifico, a funcao busca dados de TODAS as contas ativas do gestor em vez de buscar apenas as contas atribuidas aquele cliente
2. **Pagina Index.tsx**: O seletor de clientes so aparece para role "admin", ignorando "manager" -- gestores nao conseguem selecionar clientes
3. **Persistencia**: Os dados sao gravados com o ID do gestor quando nenhum `client_id` e passado, misturando metricas entre clientes

## Solucao

### 1. Corrigir `fetch-ads-data` -- filtrar por contas do cliente

Quando o body contem `client_id` e o chamador e gestor/admin, buscar as contas atribuidas a esse cliente especifico (das tabelas `client_ad_accounts`, `client_meta_ad_accounts`, `client_ga4_properties`) em vez de usar todas as contas ativas do gestor.

```text
Fluxo atual:
  Manager chama fetch-ads-data com client_id=X
  -> Busca TODAS as contas ativas do manager
  -> Dados misturados entre clientes

Fluxo corrigido:
  Manager chama fetch-ads-data com client_id=X
  -> Busca contas de client_ad_accounts WHERE client_user_id=X
  -> Busca contas de client_meta_ad_accounts WHERE client_user_id=X
  -> Busca contas de client_ga4_properties WHERE client_user_id=X
  -> Dados isolados por cliente
```

### 2. Corrigir Index.tsx -- seletor para managers tambem

Alterar a logica para mostrar o seletor de clientes tanto para `admin` quanto para `manager`, ja que ambos gerenciam clientes.

### 3. Corrigir `useAdsData.tsx` -- sempre enviar client_id ao live sync

Garantir que o `client_id` e passado corretamente em todas as chamadas ao `fetch-ads-data` para que a persistencia grave com o ID do cliente correto.

## Detalhes Tecnicos

### Arquivo: `supabase/functions/fetch-ads-data/index.ts`

Na secao que determina quais contas buscar (linhas 383-422), adicionar um terceiro caso: quando `body.client_id` esta presente e o chamador e manager/admin, buscar as contas atribuidas a esse cliente:

```typescript
// Novo bloco apos verificar userRole
const targetClientId = body.client_id;

if (targetClientId && userRole !== "client") {
  // Manager viewing a specific client -- use that client's assigned accounts
  const { data: cGoogle } = await supabaseAdmin
    .from("client_ad_accounts").select("customer_id")
    .eq("client_user_id", targetClientId);
  googleAccountIds = (cGoogle || []).map(a => a.customer_id);

  const { data: cMeta } = await supabaseAdmin
    .from("client_meta_ad_accounts").select("ad_account_id")
    .eq("client_user_id", targetClientId);
  metaAccountIds = (cMeta || []).map(a => a.ad_account_id);

  const { data: cGA4 } = await supabaseAdmin
    .from("client_ga4_properties").select("property_id")
    .eq("client_user_id", targetClientId);
  ga4PropertyIds = (cGA4 || []).map(a => a.property_id);
} else if (userRole === "client") {
  // ... manter logica existente
} else {
  // Manager sem client_id -- usar todas as contas ativas (fallback)
}
```

### Arquivo: `src/pages/Index.tsx`

- Mudar `isAdmin` para incluir managers: `const isManagerOrAdmin = role === "admin" || role === "manager"`
- Usar `isManagerOrAdmin` em vez de `isAdmin` no seletor e na logica de clientId

### Arquivo: `src/hooks/useAdsData.tsx`

- Verificar que `client_id` e sempre passado ao `fetch-ads-data` tanto no fallback live (linha 266) quanto no background sync (linha 458)
- Ja esta sendo passado, mas confirmar que o valor correto (ID do cliente, nao do gestor) e usado

### Deploy

Redeployar a edge function `fetch-ads-data` apos as alteracoes.

