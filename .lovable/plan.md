
# Diagnóstico e Correção: Compras e Cadastros não aparecem

## O que foi confirmado

Os dados estão **corretos no banco** (camp_purchases e camp_registrations com is_visible = true). O problema é que o código do dashboard tem 3 lugares onde essas métricas foram esquecidas.

## Causa raiz 1 — Tabela de Campanhas: `CAMPAIGN_COLUMN_KEYS` incompleto

**Arquivo:** `src/components/ClientDashboard.tsx`, linha 31

```ts
// ATUAL — faltam camp_purchases e camp_registrations
const CAMPAIGN_COLUMN_KEYS: MetricKey[] = [
  "camp_investment", "camp_result", "camp_cpa", "camp_cpc",
  "camp_clicks", "camp_impressions", "camp_ctr", "camp_revenue", "camp_messages"
];
```

Esse array tem duas funções críticas:
1. Gerar o `campColSnapshot` que dispara o auto-save de permissões
2. Servir de fonte para o loop que verifica visibilidade

Como `camp_purchases` e `camp_registrations` não estão aqui, a visibilidade delas nunca é monitorada e o save nunca as inclui no snapshot correto.

**Correção:** Adicionar as duas chaves ao array.

## Causa raiz 2 — Métricas do Meta Ads no topo: `metaAdsMetrics` não expõe purchases/registrations

**Arquivo:** `src/hooks/useAdsData.tsx`, linhas 544-554

O objeto `metaAdsMetrics` exportado pelo hook não inclui as chaves `purchases` e `registrations`, mesmo que `data.meta_ads` já as tenha:

```ts
// ATUAL — purchases e registrations estão em data.meta_ads mas não são expostos
const metaAdsMetrics = data?.meta_ads ? {
  investment: ...,
  clicks: ...,
  leads: ...,
  // ... sem purchases, sem registrations
} : null;
```

**Correção:** Adicionar `purchases` e `registrations` ao objeto `metaAdsMetrics`.

## Causa raiz 3 — `META_METRIC_MAP` e `META_LABELS` não mapeiam as novas métricas

**Arquivo:** `src/components/ClientDashboard.tsx`, linhas 42-62

```ts
// ATUAL — sem purchases e registrations
const META_METRIC_MAP: Record<string, MetricKey> = {
  investment: "meta_investment", clicks: "meta_clicks", ...
  // faltam: purchases: "meta_conversions", registrations: "meta_registrations"
};

const META_LABELS: Record<string, string> = {
  investment: "Investimento", leads: "Leads", ...
  // faltam: purchases: "Compras", registrations: "Cadastros"
};
```

A função `filterPlatformMetrics` usa `META_METRIC_MAP` para decidir quais campos exibir e verificar visibilidade. Se `purchases` e `registrations` não estão no mapa, são filtrados antes de chegar ao componente `PlatformSection`.

**Correção:** Adicionar os dois campos a ambos os objetos.

## Resumo das correções

### Arquivo 1: `src/components/ClientDashboard.tsx`

**Mudança A** — linha 31: adicionar `camp_purchases` e `camp_registrations` ao `CAMPAIGN_COLUMN_KEYS`:
```ts
const CAMPAIGN_COLUMN_KEYS: MetricKey[] = [
  "camp_investment", "camp_result", "camp_cpa", "camp_cpc",
  "camp_clicks", "camp_impressions", "camp_ctr", "camp_revenue",
  "camp_messages", "camp_purchases", "camp_registrations"  // ← adicionar
];
```

**Mudança B** — linha 42: adicionar `purchases` e `registrations` ao `META_METRIC_MAP`:
```ts
const META_METRIC_MAP: Record<string, MetricKey> = {
  investment: "meta_investment", clicks: "meta_clicks", impressions: "meta_impressions",
  leads: "meta_leads", ctr: "meta_ctr", cpc: "meta_cpc", cpa: "meta_cpa",
  revenue: "meta_revenue", messages: "meta_messages",
  purchases: "meta_conversions",      // ← adicionar
  registrations: "meta_registrations", // ← adicionar
};
```

**Mudança C** — linha 58: adicionar `purchases` e `registrations` ao `META_LABELS`:
```ts
const META_LABELS: Record<string, string> = {
  investment: "Investimento", clicks: "Cliques", impressions: "Impressões",
  leads: "Leads", ctr: "CTR", cpc: "CPC", cpa: "CPA",
  revenue: "Receita", messages: "Mensagens",
  purchases: "Compras",      // ← adicionar
  registrations: "Cadastros", // ← adicionar
};
```

### Arquivo 2: `src/hooks/useAdsData.tsx`

**Mudança D** — linha 544: adicionar `purchases` e `registrations` ao objeto `metaAdsMetrics`:
```ts
const metaAdsMetrics = data?.meta_ads ? {
  // ... existentes ...
  messages: ...,
  purchases: { key: "meta_conversions" as const, value: formatNumber(data.meta_ads.purchases), change: 0, trend: "neutral" as const },
  registrations: { key: "meta_registrations" as const, value: formatNumber(data.meta_ads.registrations), change: 0, trend: "neutral" as const },
} : null;
```

## Arquivos modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/components/ClientDashboard.tsx` | `CAMPAIGN_COLUMN_KEYS` + `META_METRIC_MAP` + `META_LABELS` |
| `src/hooks/useAdsData.tsx` | `metaAdsMetrics` expõe `purchases` e `registrations` |

## Por que as conversões em tempo real funcionam mas as campanhas não

O painel de "Conversões por Tempo Real" usa os dados de `hourly_conversions` que vêm diretamente do edge function (API ao vivo), sem passar pelo sistema de permissões ou `CAMPAIGN_COLUMN_KEYS`. Já as campanhas leem de `daily_campaigns` e passam pelo mapeamento de visibilidade, que tinha os campos faltando.
