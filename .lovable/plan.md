
Diagnóstico confirmado:

- O problema não parece ser duplicação por múltiplas contas Meta no caso do Cravei: hoje existe 1 conta Meta vinculada para esse cliente.
- O valor inflado já está salvo no banco para hoje: o `daily_metrics` do Cravei está com `registrations = 34` em `2026-03-24`.
- Então a origem do erro está na captura/cálculo do Meta, não só na exibição.
- Além disso, o frontend ainda mistura algumas métricas consolidadas com o campo genérico `conversions`, o que pode manter números errados em cards/funil mesmo após um refresh live.

Plano de correção:

1. Alinhar a leitura do Meta com o Ads Manager
- Padronizar todas as chamadas do Meta para usar a mesma configuração de atribuição/reporting do Ads Manager.
- Aplicar isso em:
  - `supabase/functions/fetch-ads-data/index.ts`
  - `supabase/functions/sync-daily-metrics/index.ts`
  - `supabase/functions/backfill-metrics/index.ts`
  - `supabase/functions/analyze-client/index.ts`
- A ideia é centralizar um helper de parâmetros do Meta e reutilizar em conta, campanha, hourly e geo para evitar diferença entre live, sync e backfill.

2. Parar de usar o campo genérico `conversions` para superfícies de cadastro
- Em `src/hooks/useAdsData.tsx`, recalcular os dados consolidados a partir dos campos dedicados:
  - `registrations`
  - `purchases`
  - `messages`
  - `leads`
- Isso evita que um card/funil continue mostrando número contaminado por agregações antigas.
- Também vou garantir que, quando existir dado live do Meta para o período atual, ele alimente de forma consistente:
  - card de Cadastros
  - funil Cadastro → FTD
  - consolidado relacionado

3. Corrigir a consistência entre live e histórico
- Hoje o app já prioriza live em parte da UI, mas não em tudo.
- Vou ajustar para que o “Hoje” use a mesma fonte corrigida em todos os blocos sensíveis a cadastro, evitando cenário de:
  - Meta card mostrar um valor
  - funil mostrar outro
  - banco manter o antigo até outro refresh

4. Reprocessar o histórico depois do fix
- Depois da correção, usar o botão já existente de re-backfill para regravar os últimos 30 dias do cliente.
- Isso corrige o passado; o refresh/live corrige o “hoje”.

Arquivos principais:
- `supabase/functions/fetch-ads-data/index.ts`
- `supabase/functions/sync-daily-metrics/index.ts`
- `supabase/functions/backfill-metrics/index.ts`
- `supabase/functions/analyze-client/index.ts`
- `src/hooks/useAdsData.tsx`

Sem mudanças de banco:
- Não preciso criar tabela nova nem alterar schema para essa etapa.

Resultado esperado:
- O número de Cadastros do Meta passa a ficar coerente com o Ads Manager.
- O Cravei deixa de mostrar 34 quando o Meta estiver mostrando ~20 no mesmo período.
- Cards, funil e histórico passam a usar a mesma lógica, sem dado inflado.

Observação técnica importante:
- Se, depois desse alinhamento, algum cliente específico ainda divergir, o próximo passo será tornar o “evento de cadastro” configurável por cliente (caso aquele cliente use uma custom conversion própria em vez de `complete_registration`). Mas eu trataria isso só se ainda sobrar discrepância após esta correção principal.
