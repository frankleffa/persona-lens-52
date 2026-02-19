
# Diagnóstico: Por que o GA4 não conecta ao cliente como o Meta

## Raiz do Problema — 3 bugs encadeados

A análise do banco de dados e do código revelou que o GA4 tem uma arquitetura **completamente diferente** da Meta Ads para persistência de contas, criando três falhas em cadeia:

---

## Bug 1 — `account_data` do GA4 está vazio no banco

**Evidência do banco:**
```
provider: ga4
account_data: []   ← VAZIO
```

No `oauth-callback`, quando o GA4 conecta, as propriedades são salvas na coluna `account_data` da tabela `oauth_connections`. Porém, o `account_data` está vazio `[]`, o que indica que a API `accountSummaries` do Google retornou vazio **ou** os dados não foram salvos corretamente durante o OAuth.

---

## Bug 2 — GA4 não tem tabela dedicada como o Meta

**Meta Ads tem:**
- `manager_meta_ad_accounts` → lista todas as contas do gestor
- `client_meta_ad_accounts` → vincula contas a clientes
- Na Central de Conexões, o gestor marca quais contas ficam **ativas** (`is_active = true`)

**GA4 tem apenas:**
- `oauth_connections.account_data` (JSON) → lista de propriedades com flag `selected`
- `client_ga4_properties` → vincula propriedades a clientes

**O problema:** O `manage-clients` (linha 118-128) busca as propriedades **disponíveis** do GA4 assim:
```ts
// manage-clients/index.ts
const ga4Properties = ((ga4Conn?.[0]?.account_data as Array<...>) || [])
  .filter((a) => a.selected)   // ← só retorna se tiver selected: true
  .map((a) => ({ property_id: a.id, name: a.name || a.id }));
```

Como `account_data` está vazio, **nenhuma propriedade GA4 aparece na tela de Gestão de Clientes**, impossibilitando vincular ao cliente.

---

## Bug 3 — Mesmo se `selected = true`, o `fetch-ads-data` usa fallback inconsistente

No `fetch-ads-data` (linha 533-538):
```ts
let propsToFetch = ga4PropertyIds;  // vazio se nenhum cliente vinculado
if (propsToFetch.length === 0 && userRole !== "client") {
  propsToFetch = ((ga4Conn.account_data as Array<...>)
    ?.filter((a) => a.selected)
    .map((a) => a.id)) || [];
}
```

Isso cria um fallback problemático: se nenhuma propriedade estiver vinculada ao cliente, tenta usar as propriedades do gestor com `selected: true`. Mas como `account_data` está vazio, o GA4 **sempre retorna null**.

---

## Fluxo correto vs. fluxo atual

```text
FLUXO META (funciona):
OAuth → salva em manager_meta_ad_accounts
Central de Conexões → gestor ativa contas (is_active = true)
Gestão de Clientes → gestor vincula contas ativas ao cliente
fetch-ads-data → usa client_meta_ad_accounts

FLUXO GA4 (quebrado):
OAuth → salva em oauth_connections.account_data (está VAZIO)
Central de Conexões → gestor marca propriedades com selected: true
             ↑ mas account_data está vazio, então não aparecem
Gestão de Clientes → lista filtra por selected: true → retorna []
fetch-ads-data → ga4PropertyIds vazio, fallback vazio → ga4: null
```

---

## Solução — 2 partes

### Parte 1: Criar tabelas dedicadas para GA4 (igual ao Meta)

Criar a tabela `manager_ga4_properties` para armazenar todas as propriedades do gestor com `is_active`, eliminando a dependência do JSON em `account_data`.

**SQL de migração:**
```sql
CREATE TABLE IF NOT EXISTS public.manager_ga4_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  property_id text NOT NULL,
  property_name text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, property_id)
);

ALTER TABLE public.manager_ga4_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage their ga4 properties"
  ON public.manager_ga4_properties
  FOR ALL
  USING (manager_id = auth.uid());
```

### Parte 2: Atualizar 3 arquivos de código

#### `supabase/functions/oauth-callback/index.ts`
No bloco GA4 (após buscar accountSummaries), salvar propriedades em `manager_ga4_properties`:
```ts
// Para cada propriedade encontrada
await supabase.from("manager_ga4_properties").upsert(
  { manager_id: userId, property_id: p.property, property_name: p.displayName, is_active: false },
  { onConflict: "manager_id,property_id" }
);
```

#### `supabase/functions/manage-clients/index.ts`
Na ação `list`, buscar propriedades GA4 de `manager_ga4_properties` (igual a como faz com Meta):
```ts
// ANTES (quebrado):
const ga4Properties = ((ga4Conn?.[0]?.account_data as Array<...>) || [])
  .filter((a) => a.selected)
  .map((a) => ({ property_id: a.id, name: a.name || a.id }));

// DEPOIS (igual ao Meta):
const { data: managerGA4 } = await supabaseAdmin
  .from("manager_ga4_properties")
  .select("property_id, property_name")
  .eq("manager_id", managerId)
  .eq("is_active", true);

const ga4Properties = (managerGA4 || [])
  .map((a) => ({ property_id: a.property_id, name: a.property_name || a.property_id }));
```

#### `supabase/functions/manage-connections/index.ts`
Adicionar `save_ga4_properties` como ação (igual a `save_google_accounts` e `save_meta_accounts`):
```ts
if (action === "save_ga4_properties" && accounts) {
  await supabase.from("manager_ga4_properties")
    .update({ is_active: false })
    .eq("manager_id", userId);
  
  for (const propId of accounts) {
    await supabase.from("manager_ga4_properties")
      .update({ is_active: true })
      .eq("manager_id", userId)
      .eq("property_id", propId);
  }
  return new Response(JSON.stringify({ success: true }), { headers: ... });
}
```

E na ação de fetch (sem action), incluir `ga4_properties`:
```ts
const { data: ga4Properties } = await supabase
  .from("manager_ga4_properties")
  .select("*")
  .eq("manager_id", userId);

return new Response(JSON.stringify({
  connections: connections || [],
  google_accounts: googleAccounts || [],
  meta_accounts: metaAccounts || [],
  ga4_properties: ga4Properties || [],  // ← novo
}), ...);
```

---

## Sobre o `account_data` vazio

O `account_data = []` no banco indica que quando o GA4 foi autorizado via OAuth, a API do Google Analytics Admin retornou a lista de propriedades mas algo falhou ao salvar. O oauth-callback já tem o código correto para buscar `accountSummaries`, mas o resultado foi vazio.

**Provável causa:** A conta Google conectada pode não ter acesso às propriedades via a conta da API, ou a propriedade usa o identificador `properties/XXXXXX` em vez de apenas o número. O oauth-callback já guarda o id completo `p.property` (ex: `properties/123456789`).

Após a migração, ao fazer um **novo login OAuth com GA4**, as propriedades serão salvas em `manager_ga4_properties` e aparecerão na Central de Conexões para ativação.

---

## Resumo de arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| Banco de dados | Nova tabela `manager_ga4_properties` |
| `oauth-callback/index.ts` | Salvar propriedades GA4 na nova tabela |
| `manage-clients/index.ts` | Buscar GA4 de `manager_ga4_properties` em vez de `account_data` |
| `manage-connections/index.ts` | Adicionar `save_ga4_properties` e expor `ga4_properties` no GET |

**Obs.:** A página da Central de Conexões (`Connections.tsx`) precisará ser verificada para exibir as propriedades GA4 e permitir ativar/desativar, assim como já faz com Meta e Google Ads.
