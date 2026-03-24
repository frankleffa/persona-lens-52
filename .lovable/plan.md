
Correções aplicadas para resolver cadastros inflados:

1. **`action_report_time=mixed`** adicionado a TODAS as chamadas de insights do Meta em:
   - `fetch-ads-data/index.ts` (conta, campanha, hourly, geo)
   - `sync-daily-metrics/index.ts` (conta, campanha)
   - `backfill-metrics/index.ts` (conta, campanha)
   - `analyze-client/index.ts` (conta, campanha, anúncio)

2. **`use_account_attribution_setting=true`** adicionado a todas as chamadas de campanha/hourly/geo que não tinham (apenas conta tinha antes).

3. **Chamadas de campanha em sync e backfill** corrigidas: em vez de usar syntax `{...}` embutida no campo `insights.fields()` que não suporta parâmetros de atribuição, agora faz chamada separada por campanha com os parâmetros corretos.

4. **Frontend consolidation (`useAdsData.tsx`)**: quando enrichment live existe, o consolidado é recalculado integralmente a partir dos dados meta/google mergeados (registrations, purchases, etc.) em vez de manter valores do banco.

5. **Debug log** adicionado em `fetch-ads-data` para logar todos os `action_types` de cadastro retornados pela API Meta, facilitando diagnóstico futuro.

Próximo passo:
- Reprocessar histórico do Cravei.io usando o botão de backfill no painel da agência.
- Verificar se os cadastros agora batem com o Ads Manager.
