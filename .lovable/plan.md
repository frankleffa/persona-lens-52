

## Plano: Incluir análise de funil Cadastro → FTD nas Edge Functions de IA

### Problema

Ambas as Edge Functions (`deep-analysis` e `analyze-client`) não enviam **registrations** e **ftd** como métricas separadas para a IA. O prompt atual só mostra a métrica primária (FTD), sem mostrar quantos cadastros existem. Sem esses dois números lado a lado, a IA não consegue calcular a taxa de conversão do funil nem diagnosticar a discrepância.

### Mudanças

**1. `supabase/functions/deep-analysis/index.ts`**

- Expandir `PeriodMetrics` e `consolidateMetrics` para incluir `registrations` e `ftd` separadamente (além do `primary_metric_total`)
- Expandir `CampaignAgg` e `aggregateCampaigns` para incluir `registrations` e `ftd` por campanha
- Atualizar `buildDeepPrompt` para adicionar uma seção "FUNIL CADASTRO → DEPÓSITO" com:
  - Total de registrations vs FTD
  - Taxa de conversão registro→depósito (%)
  - Mesmas métricas por campanha na tabela
- Adicionar instrução específica no prompt: "Para iGaming, analise a taxa de conversão cadastro→depósito e identifique campanhas com alta discrepância"

**2. `supabase/functions/analyze-client/index.ts`**

- No `fetchMetaLiveData`, extrair FTD usando o `ftd_event_name` da config do cliente (buscar `client_analysis_config`)
- Atualizar `buildMetaLivePrompt` para mostrar Registrations e FTD separados com taxa de conversão
- Atualizar o prompt final para instruir a IA a analisar o funil cadastro→depósito
- No `buildDbPrompt`, incluir `ftd` e `registrations` dos dados do banco

**3. Re-deploy de ambas as Edge Functions**

### Exemplo do que a IA vai receber no prompt

```
FUNIL CADASTRO → DEPÓSITO:
- Cadastros (Registrations): 850
- FTDs (Depósitos): 120
- Taxa de conversão: 14.1%
- Custo por Cadastro: R$ 12.35
- Custo por FTD: R$ 87.50

POR CAMPANHA:
| Campanha | Cadastros | FTDs | Conv. Reg→FTD | Custo/Cadastro | Custo/FTD |
```

A IA receberá instrução explícita: "Identifique campanhas onde a taxa de conversão cadastro→depósito está muito abaixo da média e investigue possíveis causas (qualidade do tráfego, público, criativo, landing page)."

