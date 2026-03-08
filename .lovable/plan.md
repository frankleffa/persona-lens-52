

## Bugs Encontrados e Soluções

### BUG 1 — Dois clientes Supabase diferentes (CRÍTICO)
O projeto tem **dois arquivos** que criam clientes Supabase independentes:
- `src/lib/supabase.ts` — hardcoded URL/key, sem tipagem, sem configuração de auth
- `src/integrations/supabase/client.ts` — usa env vars, tipado com `Database`, configuração de auth

**20 arquivos** usam `@/lib/supabase` (incluindo `useAuth`, `useUserRole`, `useManagerClients`, `Auth.tsx`, `Connections.tsx`, `Permissions.tsx`). **20 arquivos** usam `@/integrations/supabase/client` (incluindo `useCampaignManager`, `CampaignManagement`, `useAutomation`, `useSubscription`).

**Impacto**: Sessões de auth podem dessincronizar. Um usuário logado via `@/lib/supabase` (Auth.tsx) pode não ter sessão reconhecida pelos componentes que usam `@/integrations/supabase/client`, causando erros 401 ou dados vazios.

**Solução**: Migrar todos os 20 arquivos que importam `@/lib/supabase` para usar `@/integrations/supabase/client`. Depois deletar `src/lib/supabase.ts`.

---

### BUG 2 — Edge Function `auto-optimize` usa coluna `config` que não existe mais (CRÍTICO)
O hook `useAutomation.ts` foi corrigido para usar `condition`/`action`, mas a Edge Function `auto-optimize/index.ts` ainda referencia `rule.config` em **~15 pontos** (linhas 215-217, 296-298, 376-377, 446-448, 654-655).

A interface `AutomationRule` na Edge Function (linha 17) ainda tem `config: Record<string, any>` em vez de `condition`/`action`.

**Impacto**: A automação nunca funciona — `rule.config` é `undefined`, todos os limites (cpa_limit, roas_min, etc.) são 0, e nenhuma regra é executada.

**Solução**: Atualizar a interface e todas as referências de `rule.config.X` para usar os campos corretos em `rule.condition` e `rule.action`.

---

### BUG 3 — 3 Edge Functions sem `verify_jwt = false` no config.toml
As funções `analyze-client`, `auto-optimize` e `deep-analysis` existem em `supabase/functions/` mas não estão declaradas em `supabase/config.toml`.

**Impacto**: Essas funções usam o JWT verification padrão (deprecated com signing-keys), o que pode causar erros 401 ao invocá-las.

**Solução**: Adicionar ao `config.toml`:
```toml
[functions.analyze-client]
verify_jwt = false

[functions.auto-optimize]
verify_jwt = false

[functions.deep-analysis]
verify_jwt = false
```

---

### BUG 4 — `useMemo` usado como side-effect em CampaignTable
Linha 81 de `CampaignTable.tsx`:
```typescript
useMemo(() => setPage(0), [totalItems]);
```
`useMemo` não é para side effects — isso pode causar warnings do React e comportamento inconsistente em renders concorrentes.

**Solução**: Trocar por `useEffect(() => { setPage(0); }, [totalItems]);`

---

### BUG 5 — `useCampaignManager` retorna dados incorretos para `list_pages` e `search_interests`
No hook, as queries `list_pages` e `search_interests` passam `clientId: undefined`, o que está correto para a Edge Function (essas ações não precisam de client_id). Porém, a Edge Function retorna um **array direto** para essas ações, mas o hook espera `FacebookPage[]` e `Interest[]` como tipo de retorno do `invoke`.

O problema é que `invoke` retorna `res as T`, e a Edge Function para `list_pages`/`search_interests` faz `return json(result)` onde `result` já é um array. Mas `invoke` também verifica `res?.error` — se o array vier como `data` do response do Supabase functions, o shape seria `{ data: [...] }`, não o array diretamente.

Na verdade, `supabase.functions.invoke` retorna `{ data, error }` onde `data` é o body parseado. Então `res` no `invoke` helper já é o array. Mas a verificação `res?.error` em um array retornaria `undefined`, então passa. **Esse fluxo funciona**, não é bug.

---

### BUG 6 — `campaign_actions_log` query no frontend usa `as any` e filtra por `client_id`, mas RLS filtra por `manager_id`
O `CampaignActionsLog` faz `.eq("client_id", clientId)`, mas a política RLS de SELECT só permite `manager_id = auth.uid()`. O manager pode ser a pessoa logada, mas a query não filtra por `manager_id` — depende do RLS para retornar apenas as linhas onde o manager logado é o `manager_id`.

**Impacto**: Funciona se o manager logado for o único manager do cliente, mas se um admin ou outro manager acessar, pode não ver logs de outros managers para o mesmo cliente (o admin check funciona via `OR` na policy).

**Não é bloqueante**, mas pode causar confusão.

---

### Resumo das prioridades

| # | Bug | Severidade | Arquivos |
|---|-----|-----------|----------|
| 1 | Dois clientes Supabase | CRÍTICO | 20 arquivos em `@/lib/supabase` |
| 2 | `auto-optimize` usa `config` inexistente | CRÍTICO | `supabase/functions/auto-optimize/index.ts` |
| 3 | Edge Functions sem `verify_jwt` | ALTO | `supabase/config.toml` |
| 4 | `useMemo` como side-effect | BAIXO | `src/components/CampaignTable.tsx` |

### Plano de implementação

1. **Migrar imports** — trocar `from "@/lib/supabase"` por `from "@/integrations/supabase/client"` em todos os 20 arquivos e deletar `src/lib/supabase.ts`
2. **Corrigir `auto-optimize`** — atualizar interface e referências de `rule.config` para `rule.condition`/`rule.action`
3. **Adicionar funções ao config.toml** — `analyze-client`, `auto-optimize`, `deep-analysis`
4. **Corrigir `useMemo`** — trocar por `useEffect` em CampaignTable

