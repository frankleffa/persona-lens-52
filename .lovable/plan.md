

## Plano: Corrigir compras na seção Meta Ads (PlatformSection)

### Problema
A seção "Meta Ads" mostra 71 compras, mas o Meta Ads Manager mostra 113 para o mesmo período (últimos 2 dias). 

**Causa raiz**: O `PlatformSection` exibe dados do `buildMetaMetrics()` que lê `m.purchases` do objeto `meta_ads` construído por `buildResultFromDB()`. Este usa **apenas dados do banco** (`daily_metrics`). Enquanto isso, a enrichment query busca dados ao vivo da API Meta com o mesmo período (`last_2d`), mas esses dados ao vivo **não são usados para atualizar as métricas da plataforma** — só atualizam GA4, hourly e geo.

Resultado: se o banco tem dados incompletos ou desatualizados (ex: ontem não foi re-persistido após a limpeza, ou hoje foi persistido antes de todas as compras do dia), o valor exibido fica defasado.

### Correção

**`src/hooks/useAdsData.tsx`** — No merge da enrichment query (linhas 373-389), quando os dados ao vivo do Meta estão disponíveis, atualizar também os campos `meta_ads.purchases`, `meta_ads.registrations`, `meta_ads.messages`, `meta_ads.leads` e `meta_ads.investment` com os valores ao vivo se forem maiores que os do banco (merge conservador — usa o maior valor para evitar "apagões"):

```typescript
// Dentro do merge de enrichment:
meta_ads: (() => {
  if (!live.meta_ads) return base.meta_ads;
  if (!base.meta_ads) return live.meta_ads;
  // Use live values when they're valid and higher (conservative merge)
  return {
    ...base.meta_ads,
    purchases: Math.max(base.meta_ads.purchases, live.meta_ads.purchases || 0),
    registrations: Math.max(base.meta_ads.registrations, live.meta_ads.registrations || 0),
    messages: Math.max(base.meta_ads.messages, live.meta_ads.messages || 0),
    leads: Math.max(base.meta_ads.leads, live.meta_ads.leads || 0),
    investment: live.meta_ads.investment > 0 
      ? Math.max(base.meta_ads.investment, live.meta_ads.investment) 
      : base.meta_ads.investment,
  };
})(),
```

Isso garante que quando os dados ao vivo chegam (via enrichment), a seção Meta Ads reflete os números corretos da API, sem depender exclusivamente dos dados persistidos que podem estar defasados.

Também atualizar `google_ads` com a mesma lógica conservadora para consistência.

### Resumo

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAdsData.tsx` | Merge conservador dos dados ao vivo do Meta/Google nas métricas da plataforma (usar maior valor entre DB e live) |

Nenhuma mudança no backend — a edge function já retorna os dados corretos, o problema é que o frontend ignora os dados ao vivo para as seções de plataforma.

