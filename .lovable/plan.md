
# Corrigir: Vinculação de Contas de Anúncios a Clientes

## Diagnóstico

Foram identificados dois problemas:

**Problema 1 — RLS sem WITH CHECK nas tabelas de contas**

As políticas `ALL` das tabelas `client_ad_accounts`, `client_meta_ad_accounts` e `client_ga4_properties` possuem apenas a cláusula `USING` (para SELECT/UPDATE/DELETE), mas não têm `WITH CHECK` definida. No PostgreSQL, operações de `INSERT` numa política `ALL` sem `WITH CHECK` explícito herdam o `USING` como check — porém quando a edge function usa o service role, isso deveria contornar o RLS. Portanto, há um segundo problema mais crítico.

**Problema 2 — ClientAccountConfig usa header `apikey` incorreto**

Em `src/components/ClientAccountConfig.tsx`, a função `saveClientAccounts` usa:
```ts
apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
```

A variável de ambiente correta é `VITE_SUPABASE_PUBLISHABLE_KEY`, mas o problema real é que o `manage-clients` edge function valida o papel do usuário (`manager` ou `admin`). O usuário logado é `admin` — isso deveria funcionar.

**Problema 3 (raiz real) — O edge function `manage-clients` usa `supabaseAdmin` para INSERT mas não tem `WITH CHECK`**

Ao inspecionar o `manage-clients/index.ts`, a operação de save usa `supabaseAdmin` (service role), que ignora RLS. Portanto o RLS não é o bloqueio aqui.

O real problema é que o `ClientAccountConfig` está dentro do painel expandido do cliente (`isExpanded`), mas o componente **não mostra nenhuma conta disponível** porque `available` vem de `availableAccounts` que é populado pelo `manage-clients` list action.

**Verificando o fluxo:**
- `manage-clients` → `list` busca `manager_ad_accounts` com `is_active = true`
- O gestor precisa ter contas ativas na Central de Conexões para que apareçam no `ClientAccountConfig`
- Se o gestor não conectou nenhuma conta de anúncios ativa, `available.google`, `available.meta` e `available.ga4` ficam vazios
- O componente `ClientAccountConfig` tem `if (!hasAccounts) return null;` — ou seja, **some completamente** se não há contas disponíveis

## Solução

### Parte 1 — Corrigir RLS (adicionar WITH CHECK explícito)

Adicionar `WITH CHECK` nas políticas `ALL` para garantir consistência:

```sql
-- Recriar políticas com WITH CHECK explícito
DROP POLICY IF EXISTS "Managers can manage via link" ON client_ad_accounts;
CREATE POLICY "Managers can manage via link" ON client_ad_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM client_manager_links WHERE client_manager_links.client_user_id = client_ad_accounts.client_user_id AND client_manager_links.manager_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM client_manager_links WHERE client_manager_links.client_user_id = client_ad_accounts.client_user_id AND client_manager_links.manager_id = auth.uid()));

-- Mesmo para meta e ga4...
```

### Parte 2 — Melhorar UX quando não há contas disponíveis

Em vez de sumir silenciosamente, o `ClientAccountConfig` deve mostrar uma mensagem orientando o gestor a conectar contas primeiro, com um link para a Central de Conexões.

**Arquivo: `src/components/ClientAccountConfig.tsx`**

Substituir o `return null` por uma mensagem explicativa:
```tsx
if (!hasAccounts) return (
  <div className="border-t border-border px-6 py-4 text-center">
    <p className="text-xs text-muted-foreground">
      Nenhuma conta conectada. <a href="/connections" className="text-primary underline">Conecte suas contas</a> primeiro.
    </p>
  </div>
);
```

### Parte 3 — Exibir seção de contas mesmo quando expandido mas sem contas

Atualmente a seção expandida só renderiza `ClientAccountConfig` que pode sumir. Garantir que o painel expandido sempre mostre algo útil.

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar `WITH CHECK` nas 3 políticas RLS |
| `src/components/ClientAccountConfig.tsx` | Mostrar mensagem orientativa em vez de `return null` quando não há contas disponíveis |

## Por que isso resolve

- Com `WITH CHECK` explícito, as inserções diretas (sem service role) também funcionam corretamente
- O gestor agora recebe feedback visual claro de por que a seção de contas não aparece, em vez de simplesmente não ver nada
- O link direto para Conexões reduz o atrito para resolver o problema na fonte
