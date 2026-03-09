

## Plano: Garantir precisão da métrica FTD

### Problemas encontrados

1. **Google Ads FTD não persiste no `fetch-ads-data`**: A função `fetchGoogleAdsData` não calcula nem retorna FTD por conta. No momento da persistência (linha 1075), o valor é fixo `ftd: 0`. A função `fetchGoogleFTDByConversionName` existe apenas no `sync-daily-metrics`, mas não é chamada no `fetch-ads-data`.

2. **Google Ads `per_account` não inclui campo `ftd`**: A interface `GoogleAdsMetrics.per_account` não tem o campo `ftd`, então o cálculo `gAds?.per_account?.reduce((s, a) => s + (a.ftd || 0), 0)` sempre retorna 0.

3. **Meta FTD depende 100% de `ftd_event_name` configurado**: Se o `client_analysis_config.ftd_event_name` estiver vazio ou incorreto, o FTD do Meta será sempre 0. Não há log de debug no momento da extração para validar o que está sendo buscado.

4. **`sync-daily-metrics` busca FTD do Google corretamente**, mas `fetch-ads-data` (chamado pelo dashboard em tempo real) não — causando inconsistência entre dados do cron e dados live.

### Mudanças propostas

**1. `supabase/functions/fetch-ads-data/index.ts`**

- Adicionar `ftd` ao tipo `GoogleAdsMetrics.per_account`
- Dentro de `fetchGoogleAdsData`, após obter métricas de cada conta, chamar `fetchGoogleFTDByConversionName` (já precisa receber `ftdGoogleConvName` como parâmetro) e incluir o resultado no `per_account`
- Copiar a função `fetchGoogleFTDByConversionName` de `sync-daily-metrics` para `fetch-ads-data` (ou extrair para módulo compartilhado, mas como edge functions são isoladas, copiar é o padrão)
- Na persistência de hoje (linha 1075), usar o `ftd` real do `per_account` do Google em vez de `0`
- Adicionar logs de debug na extração de FTD do Meta para rastrear: qual `ftd_event_name` está sendo usado, quantos actions foram encontrados, e o valor extraído

**2. Validação e logs**

- Adicionar console.log no momento de extrair FTD do Meta: `[meta-ftd] account=${accountId}, event=${ftdEventName}, actions_found=${JSON.stringify(matchingActions)}, ftd=${acctFtd}`
- Adicionar console.log no Google FTD: `[google-ftd] account=${customerId}, convName=${ftdGoogleConvName}, ftd=${ftd}`

### Resultado
- FTD do Google Ads será calculado e persistido corretamente tanto no cron quanto nas chamadas live
- FTD do Meta terá logs detalhados para diagnosticar falhas de mapeamento
- Dados exibidos no dashboard serão consistentes com os dados do banco

