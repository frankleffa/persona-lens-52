
# Verificação Completa do Fluxo do Painel — Problemas Encontrados

## Situação atual após revisão

A análise completa do código revelou 3 problemas remanescentes que precisam ser corrigidos.

---

## Problema 1 — Campanhas ativas: dados vêm do banco (daily_campaigns), não da API ao vivo

**Causa:** O fluxo de dados tem dois caminhos:

- **Caminho A (banco de dados):** Quando existem dados em `daily_campaigns`, o hook usa esses dados para montar `campaigns`. Os campos `purchases` e `registrations` foram adicionados ao banco de dados **hoje (19/02)**. Ou seja, para o período padrão "30 dias", a maioria dos registros históricos tem `purchases = 0` e `registrations = 0`.
- **Caminho B (API ao vivo):** O edge function é chamado em background apenas para obter `hourly_conversions` e `geo_conversions`, mas **não substitui** os dados de campanhas vindos do banco.

Portanto, mesmo que as colunas estejam visíveis, os valores aparecem como `0` para datas anteriores a hoje.

**Solução:** No momento em que o hook faz o live sync em background (linhas 474-481 de `useAdsData.tsx`), ele deve também mesclar os dados de campanhas da resposta ao vivo com os do banco. Atualmente, só mescla `hourly_conversions` e `geo_conversions`.

---

## Problema 2 — Métricas do topo "Meta Ads": Compras e Cadastros calculados de forma incorreta

**Causa:** No hook, `metaTotalPurchases` e `metaTotalRegistrations` são somados a partir de `metaCampaigns` (linhas 359-360):

```ts
const metaTotalPurchases = metaCampaigns.reduce((sum, c) => sum + (c.purchases || 0), 0);
const metaTotalRegistrations = metaCampaigns.reduce((sum, c) => sum + (c.registrations || 0), 0);
```

Para o período "30 dias", como os registros históricos têm `purchases = 0`, os totais ficam zerados mesmo que hoje existam valores corretos.

**Mesma causa raiz do Problema 1** — os dados históricos não têm `purchases`/`registrations` preenchidos.

**Solução imediata para hoje:** O live sync em background já traz os dados corretos da API. Basta mesclar também `meta_ads.purchases`, `meta_ads.registrations` e os dados de campanhas da resposta ao vivo no `setData` do background sync.

---

## Problema 3 — `meta_ads.leads` usa `metaAgg.conversions` (agregação genérica do banco)

No hook, linha 366:
```ts
leads: metaAgg.conversions,  // ← usa coluna `conversions` da daily_metrics
```

O campo `conversions` em `daily_metrics` representa o total agregado de conversões do Meta Ads (compras + cadastros + leads), não apenas leads. Portanto, o número de "Leads" exibido nas métricas do topo pode estar inflado.

**Solução:** Calcular leads a partir de `metaCampaigns` somando `c.leads` (que é o campo correto na `daily_campaigns`), assim como já é feito para `purchases`, `registrations` e `messages`.

---

## Correções a implementar

### Arquivo único: `src/hooks/useAdsData.tsx`

**Mudança A — Linha 366:** Corrigir o cálculo de `leads` no `metaAdsData`:
```ts
// ANTES
leads: metaAgg.conversions,

// DEPOIS
leads: metaCampaigns.reduce((sum, c) => sum + (c.leads || 0), 0),
```

**Mudança B — Linhas 474-481:** No live sync em background, mesclar também os dados de campanhas e métricas do Meta:
```ts
// ANTES — só mescla hourly e geo
setData((prev) => prev ? {
  ...prev,
  hourly_conversions: liveData.hourly_conversions || null,
  geo_conversions: liveData.geo_conversions || null,
  ...
} : prev);

// DEPOIS — também mescla meta_ads e campanhas para ter purchases/registrations corretos
setData((prev) => prev ? {
  ...prev,
  hourly_conversions: liveData.hourly_conversions || prev.hourly_conversions,
  geo_conversions: liveData.geo_conversions || prev.geo_conversions,
  geo_conversions_region: liveData.geo_conversions_region || prev.geo_conversions_region,
  geo_conversions_city: liveData.geo_conversions_city || prev.geo_conversions_city,
  // Mescla meta_ads ao vivo se disponível (tem purchases/registrations atualizados)
  meta_ads: liveData.meta_ads || prev.meta_ads,
  // Mescla campanhas ao vivo para ter purchases/registrations corretos
  consolidated: prev.consolidated ? {
    ...prev.consolidated,
    all_campaigns: liveData.consolidated?.all_campaigns || prev.consolidated.all_campaigns,
  } : prev.consolidated,
} : prev);
```

Isso garante que, mesmo para períodos históricos com dados zerados no banco, os valores ao vivo do dia atual sejam exibidos corretamente nas campanhas e métricas do Meta Ads.

---

## Resumo do impacto

| Problema | Impacto | Correção |
|----------|---------|---------|
| Campanhas com purchases/registrations zerados (dados históricos) | Tabela mostra 0 mesmo com dados reais | Mesclar dados ao vivo no background sync |
| Meta Ads: leads inflado com total de conversões | Número de leads incorreto nas métricas do topo | Somar `c.leads` das campanhas |
| Meta Ads: purchases/registrations zerados no topo | Cards Compras e Cadastros mostram 0 | Mesclar `meta_ads` ao vivo no background sync |

## Arquivo modificado

| Arquivo | Mudanças |
|---------|---------|
| `src/hooks/useAdsData.tsx` | Corrigir `leads`, mesclar `meta_ads` e `consolidated.all_campaigns` no live sync |

## Nota sobre dados históricos

Para períodos maiores que "Hoje" (7, 14, 30 dias), Compras e Cadastros na tabela de campanhas sempre mostrarão 0 para datas anteriores a 19/02 (data em que as colunas foram adicionadas). A única forma de corrigir isso é clicar em **"Importar Histórico"** no dashboard, que vai rebuscar todos os 30 dias da API do Meta e salvar com os campos separados.
