

## Plano: Página de Integração LTV + Botão de Teste no Dashboard

### O que será criado

**1. Aba "Integração" no dashboard LTV** — seção com instruções de setup, snippet copiável e botão de teste, tudo dentro da página `/ltv` existente (usando Tabs).

### Mudanças

**1. `src/pages/LtvDashboard.tsx`**
- Adicionar `Tabs` (Dashboard | Integração) no topo, abaixo do seletor de cliente
- Aba "Dashboard": conteúdo atual (cards, gráficos, tabelas)
- Aba "Integração": novo componente `LtvIntegrationTab`

**2. `src/components/LtvIntegrationTab.tsx`** (novo)
Componente que recebe `clientId` e `clientLabel` e exibe:
- **Webhook URL**: `https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/ltv-webhook` com botão copiar
- **Client ID**: o `client_user_id` do cliente selecionado, com botão copiar
- **Snippet de código**: bloco `fetch()` pronto com os valores preenchidos, botão copiar
- **Botão "Enviar Evento de Teste"**: envia um POST real ao webhook com dados fictícios (`event_name: "Purchase"`, `email: "teste-{timestamp}@test.com"`, `value: 1.00`). Mostra toast de sucesso/erro. Usa o secret do manager? Não — o webhook exige `x-webhook-secret` que o frontend não tem. Solução: criar uma edge function proxy.

**3. `supabase/functions/ltv-test-event/index.ts`** (novo)
- Edge function autenticada (valida JWT do manager)
- Verifica que o manager tem link com o `client_id` via query ao banco
- Chama internamente o webhook `ltv-webhook` usando o `LTV_WEBHOOK_SECRET` do env
- Retorna o resultado ao frontend
- Isso evita expor o webhook secret no frontend

### Fluxo do teste
1. Manager clica "Enviar Evento de Teste"
2. Frontend chama `supabase.functions.invoke("ltv-test-event", { body: { client_id } })`
3. Edge function valida JWT, verifica permissão, envia POST ao ltv-webhook com dados fictícios
4. Retorna sucesso → toast verde. Manager pode ver o dado aparecer no dashboard.

### Arquivos alterados
- `src/pages/LtvDashboard.tsx` — adicionar Tabs
- `src/components/LtvIntegrationTab.tsx` — novo
- `supabase/functions/ltv-test-event/index.ts` — novo

