

## Análise: O que melhorou e o que piorou

### O que piorou (erros de build atuais)

**1. Edge Functions com import incompatível (3 arquivos)**

Os arquivos `check-subscription`, `create-checkout` e `customer-portal` usam `npm:@supabase/supabase-js@2.57.2` — um formato que o Deno do Lovable Cloud não suporta. As outras 9 edge functions usam corretamente `https://esm.sh/@supabase/supabase-js@2`.

Arquivos afetados:
- `supabase/functions/check-subscription/index.ts` (linha 3)
- `supabase/functions/create-checkout/index.ts` (linha 3)
- `supabase/functions/customer-portal/index.ts` (linha 3)

Correção: trocar `npm:@supabase/supabase-js@2.57.2` por `https://esm.sh/@supabase/supabase-js@2` nos 3 arquivos.

**2. Execution.tsx referencia propriedades inexistentes no tipo `ManagerClient`**

O tipo `ManagerClient` só tem `id`, `client_label` e `is_demo`. Mas `Execution.tsx` tenta acessar `full_name` e `email` (linhas 58, 139, 213).

Correção: remover referências a `full_name` e `email`, usar apenas `client_label` como fallback para nome do cliente.

**3. Console: erro de FK em `client_metric_visibility`**

Ao salvar permissões, a tabela `client_metric_visibility` tem FK para `users` e o `client_user_id` referenciado não existe na tabela `users`. Isso indica que o ID usado vem de `profiles` ou `client_manager_links` e não tem correspondência em `auth.users`. Isso é um problema de dados/schema que pode precisar de investigação adicional.

---

### O que está OK / melhorou

- OAuth init/callback: as mudanças de `origin` no state foram aplicadas corretamente.
- 9 das 12 edge functions usam imports compatíveis.
- A estrutura do board de execução (Kanban) funciona e está criando cards.

---

### Plano de correção

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/check-subscription/index.ts` | Trocar import `npm:` por `esm.sh` |
| `supabase/functions/create-checkout/index.ts` | Trocar import `npm:` por `esm.sh` |
| `supabase/functions/customer-portal/index.ts` | Trocar import `npm:` por `esm.sh` |
| `src/pages/Execution.tsx` | Remover `.full_name` e `.email` do tipo `ManagerClient`, usar só `client_label` |

