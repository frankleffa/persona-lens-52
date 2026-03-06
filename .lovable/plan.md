

## Auditoria: Dados Meta Ads — Problemas Encontrados

Após análise completa do fluxo de dados Meta Ads (extração → persistência → leitura → exibição), identifiquei os seguintes problemas:

---

### Problema 1: Persistência agrega múltiplas contas sob um único `account_id`

**Gravidade: Alta**

A função `fetchMetaAdsData` soma os dados de TODAS as contas Meta em um único objeto `result`. Na persistência (`fetch-ads-data`, linhas 825-842), esse total agregado é salvo usando `metaAccountIds[0]` — ou seja, se o cliente tem 2 contas Meta gastando R$100 cada, o banco registra R$200 na conta[0] e nada na conta[1].

Em contraste, o `sync-daily-metrics` (cron diário) faz corretamente: itera conta por conta e persiste individualmente.

**Impacto**: Quando o dashboard lê do banco, os dados ficam corretos no total mas a atribuição por conta está errada. Se o cliente tiver apenas 1 conta Meta, não há problema.

**Correção**: Na persistência do `fetch-ads-data`, fazer requests individuais por conta (como o `sync-daily-metrics` já faz) em vez de salvar o agregado sob uma conta só.

---

### Problema 2: `daily_metrics` não tem colunas `purchases`, `registrations`, `messages`, `leads`

**Gravidade: Média**

A memória do sistema diz que essas colunas existem, mas o schema atual da tabela `daily_metrics` só tem `conversions` (genérico). O código persiste `conversions: mAds.purchases + mAds.registrations`, perdendo o breakdown individual.

Quando o `buildResultFromDB` reconstroi os dados Meta a partir do banco, ele deriva purchases/registrations dos dados de **campanhas** (`daily_campaigns`), não de metrics. Isso funciona na maioria dos casos, mas se houver discrepância entre totais de conta e soma de campanhas (ex: campanhas pausadas com spend residual), os números podem divergir.

**Correção**: Verificar se as colunas já existem no banco (a memória sugere que sim). Se não, adicioná-las via migration e atualizar a persistência.

---

### Problema 3: `clicks: 0` em campanhas Meta no `sync-daily-metrics`

**Gravidade: Baixa**

No `sync-daily-metrics` (linha 317), campanhas Meta são persistidas com `clicks: 0` sempre. Porém no `fetch-ads-data` (linha 984), usa-se `c.clicks || 0` que captura o valor real. Isso significa que campanhas sincronizadas pelo cron diário perdem dados de clicks, mas as persistidas pelo fetch em tempo real têm o valor correto.

**Correção**: Adicionar `clicks` na query de campanhas do `sync-daily-metrics`.

---

### Problema 4: CPA consolidado inconsistente entre live e DB

**Gravidade: Baixa**

- **Live** (`fetchMetaAdsData`): `cpa = investment / leads` onde `leads = purchases + registrations`
- **DB** (`aggregateMetrics`): `cpa = spend / conversions` onde `conversions` é o valor genérico da coluna

Na prática dá o mesmo resultado se `conversions = purchases + registrations`, mas a semântica é diferente e pode divergir se a persistência mudar.

---

### Plano de Correção

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Persistir Meta metrics por conta individual (não agregado) |
| `supabase/functions/sync-daily-metrics/index.ts` | Adicionar `clicks` na query de campanhas Meta |
| Migration SQL | Verificar/adicionar colunas `purchases`, `registrations`, `messages`, `leads` em `daily_metrics` |
| `src/hooks/useAdsData.tsx` | Usar colunas dedicadas no `buildResultFromDB` quando disponíveis |

Devo prosseguir com as correções?

