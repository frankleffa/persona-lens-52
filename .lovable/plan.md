

## Plano: IA analisa dados ao vivo da Meta API (não do banco)

### Problema atual
A edge function `analyze-client` busca dados das tabelas `daily_metrics` e `daily_campaigns` do banco. Esses dados podem estar desatualizados (sincronização D-1). O usuário quer que a IA analise dados frescos direto da API do Meta.

### Abordagem
Reutilizar a lógica de fetch da Meta que já existe em `fetch-ads-data/index.ts` dentro da `analyze-client`. A function vai:

1. **Resolver as contas Meta do cliente** — consultar `client_meta_ad_accounts` para obter os `ad_account_id` do cliente
2. **Buscar o token de acesso Meta** — via `oauth_connections` do manager linkado ao cliente (via `client_manager_links`)
3. **Chamar a API do Meta diretamente** — buscar insights de conta (spend, impressions, clicks, actions) e insights por campanha (top 20 por spend) para o período solicitado
4. **Montar o prompt com dados ao vivo** — incluindo métricas granulares (purchases, registrations, messages, leads) que existem na resposta da Meta mas não são passadas hoje para a IA
5. **Manter fallback no banco** — se não houver conexão Meta ativa ou contas configuradas, usar os dados do banco como hoje

### Detalhes técnicos

**Mudanças em `supabase/functions/analyze-client/index.ts`:**

- Adicionar função `fetchMetaLiveData()` que:
  - Recebe `accessToken`, `adAccountIds[]`, `timeRange { since, until }`
  - Busca `/insights` de cada conta com campos: spend, impressions, clicks, actions, action_values
  - Busca `/campaigns` com insights (top 20 por spend, apenas ACTIVE)
  - Retorna métricas agregadas + lista de campanhas

- No fluxo principal:
  1. Buscar `client_manager_links` para resolver o `manager_id`
  2. Buscar `oauth_connections` (provider=meta) do manager
  3. Buscar `client_meta_ad_accounts` do cliente
  4. Se token + contas existem → chamar Meta API ao vivo
  5. Se não → fallback para `daily_metrics`/`daily_campaigns` (comportamento atual)

- Enriquecer o prompt com métricas extras: purchases, registrations, messages, leads, followers

**Nenhuma mudança no frontend** — o hook `useClientAnalysis` e o botão continuam iguais.

### Riscos e mitigações
- **Token expirado**: Meta tokens de longa duração raramente expiram, mas se falhar, o fallback para o banco entra automaticamente
- **Rate limits**: Limitar a 5 contas e 20 campanhas por conta
- **Tempo de resposta**: A chamada à Meta + Anthropic pode demorar ~10-15s. O botão já mostra estado de loading.

