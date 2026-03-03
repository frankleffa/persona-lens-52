

# Corrigir listagem incompleta de contas Meta Ads na Central de Conexoes

## Problema

Ao conectar o Meta Ads via OAuth, a listagem de contas de anuncio (`/me/adaccounts`) nao implementa paginacao. A API do Meta retorna no maximo 25 resultados por pagina. Se o usuario tem mais de 25 contas, as demais sao ignoradas e nunca salvas na tabela `manager_meta_ad_accounts`.

Alem disso, o botao "Sincronizar Contas" apenas re-le o banco de dados — nao re-busca contas na API do Meta. Entao contas que nao foram salvas no OAuth nunca aparecerao sem reconectar.

## Solucao

### Mudanca 1: Adicionar paginacao no oauth-callback para Meta Ads

No `supabase/functions/oauth-callback/index.ts`, substituir a chamada unica a `/me/adaccounts` por um loop que segue o cursor `paging.next` ate nao haver mais paginas.

```text
ANTES:
const adAccRes = await fetch(`...me/adaccounts?fields=id,name,account_status&access_token=...`);
const adAccData = await adAccRes.json();
// Processa apenas adAccData.data (max 25)

DEPOIS:
let allAdAccounts = [];
let nextUrl = `...me/adaccounts?fields=id,name,account_status&limit=100&access_token=...`;
while (nextUrl) {
  const res = await fetch(nextUrl);
  const data = await res.json();
  allAdAccounts.push(...(data.data || []));
  nextUrl = data.paging?.next || null;
}
// Processa allAdAccounts (todas as contas)
```

### Mudanca 2: Adicionar acao "sync_meta_accounts" no manage-connections

Criar uma nova acao no edge function `manage-connections` que re-busca as contas do Meta usando o `access_token` armazenado em `oauth_connections`, faz a paginacao completa, e upserta na tabela `manager_meta_ad_accounts`. Isso permite que o botao "Sincronizar Contas" realmente traga contas novas sem precisar reconectar.

### Mudanca 3: Atualizar o frontend para chamar sync_meta_accounts

No `handleSync` da pagina `Connections.tsx`, antes de fazer o fetchConnections, disparar a acao `sync_meta_accounts` para que o backend re-busque as contas atualizadas da API do Meta.

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/oauth-callback/index.ts` | Paginacao completa na listagem de ad accounts do Meta |
| `supabase/functions/manage-connections/index.ts` | Nova acao `sync_meta_accounts` que re-busca contas via API |
| `src/pages/Connections.tsx` | handleSync chama sync_meta_accounts antes de fetchConnections |

## Resultado esperado

- Todas as contas de anuncio do Meta aparecerao na Central de Conexoes, independente da quantidade
- O botao "Sincronizar Contas" ira re-buscar contas da API do Meta (nao apenas do banco)
- Contas novas adicionadas no Meta aparecerao ao sincronizar, sem precisar reconectar

