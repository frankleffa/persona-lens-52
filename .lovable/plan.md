

# Corrigir investimento consolidado incorreto

## Problema

O KPI "Investimento" nas Metricas Gerais mostra R$ 2.081, mas o valor real no Meta Ads e ~R$ 1.400. Isso acontece porque:

1. O KPI consolidado soma os dados do banco de dados (`daily_metrics`), que contem 14 dias com valores que totalizam R$ 2.214
2. A chamada ao vivo a API do Meta (que roda em segundo plano) atualiza a secao "Meta Ads" com o valor correto, mas NAO atualiza o investimento consolidado
3. Os dados persistidos no banco podem estar inflados por causa de execucoes anteriores do backfill ou sync que gravaram valores incorretos

## Solucao

### 1. Atualizar o merge em segundo plano para recalcular o consolidado

**Arquivo:** `src/hooks/useAdsData.tsx` (linhas 491-505)

Quando os dados ao vivo chegam do background, atualizar tambem `consolidated.investment`, `consolidated.revenue`, `consolidated.roas`, `consolidated.cpa` etc., recalculando a partir dos dados ao vivo do Google Ads + Meta Ads:

```ts
setData((prev) => {
  if (!prev) return prev;
  const liveGoogle = liveData.google_ads || prev.google_ads;
  const liveMeta = liveData.meta_ads || prev.meta_ads;
  const totalInvestment = (liveGoogle?.investment || 0) + (liveMeta?.investment || 0);
  const totalRevenue = (liveGoogle?.revenue || 0) + (liveMeta?.revenue || 0);
  const totalLeads = (liveGoogle?.conversions || 0) + (liveMeta?.leads || 0);
  const totalMessages = liveMeta?.messages || 0;

  return {
    ...prev,
    google_ads: liveGoogle,
    meta_ads: liveMeta,
    ga4: liveData.ga4 || prev.ga4,
    hourly_conversions: liveData.hourly_conversions || prev.hourly_conversions,
    geo_conversions: liveData.geo_conversions || prev.geo_conversions,
    geo_conversions_region: liveData.geo_conversions_region || prev.geo_conversions_region,
    geo_conversions_city: liveData.geo_conversions_city || prev.geo_conversions_city,
    consolidated: prev.consolidated ? {
      ...prev.consolidated,
      investment: totalInvestment,
      revenue: totalRevenue,
      roas: totalInvestment > 0 ? totalRevenue / totalInvestment : 0,
      leads: totalLeads,
      messages: totalMessages,
      cpa: totalLeads > 0 ? totalInvestment / totalLeads : 0,
      all_campaigns: liveData.consolidated?.all_campaigns || prev.consolidated.all_campaigns,
    } : prev.consolidated,
  };
});
```

### 2. Limpar dados incorretos no banco

Executar uma correcao manual via SQL para remover os dados inflados do banco. Depois, o sync diario gravara os valores corretos daqui em diante:

```sql
DELETE FROM daily_metrics
WHERE client_id = 'df2a33e5-03f1-406f-81c1-956f2ef63c1d'
  AND date < '2026-02-06';
```

E executar um novo backfill para repopular com dados corretos.

### 3. Recalcular o comparison (periodo anterior) tambem com dados ao vivo

Atualmente, a comparacao percentual ("vs periodo anterior") usa apenas dados do banco. Se os dados ao vivo estiverem disponiveis, recalcular as metricas de mudanca para refletir os valores corretos.

---

## Detalhes tecnicos

### Fluxo atual (com bug)

```text
1. Dashboard carrega
2. Busca daily_metrics do banco (14 dias = R$ 2.214)
3. Mostra consolidated.investment = R$ 2.081 (sem o dia de hoje)
4. Background: chama fetch-ads-data com last_30d
5. Merge: atualiza meta_ads (R$ 1.400 correto) mas NAO atualiza consolidated
6. Resultado: KPI Investimento = R$ 2.081 (errado), Meta Ads = R$ 1.400 (certo)
```

### Fluxo corrigido

```text
1. Dashboard carrega
2. Busca daily_metrics do banco (mostra valores iniciais)
3. Background: chama fetch-ads-data com last_30d
4. Merge: atualiza TUDO - meta_ads, google_ads E recalcula consolidated
5. Resultado: KPI Investimento = R$ 1.400 (correto, fonte: API ao vivo)
```

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useAdsData.tsx` | Atualizar merge em segundo plano para recalcular consolidated a partir dos dados ao vivo |

