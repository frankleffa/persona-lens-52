

## Corrigir métricas ausentes (Mensagens e Receita) no dashboard

### Problema
A métrica "Mensagens" do Meta Ads e "Receita" do Google/Meta não aparecem no dashboard porque o hook `useAdsData.tsx` não as inclui no objeto de métricas retornado para o componente `PlatformSection`.

### Causa raiz (3 pontos no arquivo `src/hooks/useAdsData.tsx`)

1. **Linha 335** - `messages: 0` hardcoded: Quando os dados vêm da tabela `daily_metrics`, as mensagens do Meta são sempre zero porque a tabela não tem coluna de mensagens separada. Precisamos somar as mensagens da tabela `daily_campaigns` para obter o valor correto.

2. **Linhas 462-470** - `metaAdsMetrics` não inclui `revenue` nem `messages`: O objeto retornado para o dashboard tem apenas 7 campos (investment, clicks, impressions, leads, ctr, cpc, cpa). Faltam `revenue` e `messages`.

3. **Linhas 452-460** - `googleAdsMetrics` não inclui `revenue`: O objeto retornado para Google Ads tem apenas 7 campos. Falta `revenue`.

### Correções

**1. Calcular mensagens do Meta a partir das campanhas (linha 335)**
- Somar `messages` de todas as campanhas Meta Ads ao invés de usar zero fixo.
- Fazer o mesmo para o consolidado (linha 352).

**2. Adicionar `revenue` e `messages` ao `metaAdsMetrics` (após linha 469)**
```
revenue: { value: formatCurrency(data.meta_ads.revenue), ... },
messages: { value: formatNumber(data.meta_ads.messages), ... },
```

**3. Adicionar `revenue` ao `googleAdsMetrics` (após linha 459)**
```
revenue: { value: formatCurrency(data.google_ads.revenue), ... },
```

### Arquivo afetado
- `src/hooks/useAdsData.tsx` - 3 edições pontuais

### Resultado
- Meta Ads mostrará 9 métricas: Investimento, Cliques, Impressões, Leads, CTR, CPC, CPA, **Receita**, **Mensagens**
- Google Ads mostrará 8 métricas: Investimento, Cliques, Impressões, Conversões, CTR, CPC, CPA, **Receita**

