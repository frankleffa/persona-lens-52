
Plano: eliminar a duplicação do cadastro que está mostrando 240 em vez de 120

Diagnóstico confirmado
- O duplicado restante bate com um bug de agregação no app, não só com a coleta do Meta.
- Hoje o hook `src/hooks/useAdsData.tsx` recalcula o consolidado com esta lógica: `leads = registrations + purchases`.
- Isso gera exatamente o sintoma de “dobrar”: se existem 120 cadastros e 120 compras, o card consolidado vira 240.
- Além disso, a métrica está inconsistente entre os fluxos:
  - banco: `leads` acaba tratado como cadastro
  - live: `leads` vem com outro significado
  - merge final: `leads` vira cadastro + compra
- O resultado é que o backend pode estar certo e a UI ainda inflar o número.

O que vou corrigir
1. Corrigir a fonte de verdade do consolidado
- Parar de somar `registrations + purchases` no consolidado.
- Separar definitivamente as semânticas:
  - Cadastros = `registrations`
  - Compras = `purchases`
  - Leads = `leads`
- Ajustar o consolidado para não reaproveitar `leads` como “cadastros” em um ponto e “cadastros + compras” em outro.

2. Consertar o merge live no `useAdsData`
- Revisar o bloco que mistura banco + live enrichment.
- Recalcular os cards gerais com os campos corretos, sem inflar cadastro.
- Corrigir também o cálculo de CPA/tendência que hoje herda esse valor contaminado.

3. Parar de depender do campo genérico `conversions`
- Remover o uso de `prevAgg.conversions` para exibir tendência de cadastro/leads.
- Passar a usar sempre as colunas dedicadas do banco: `registrations`, `purchases`, `leads`, `messages`.
- Isso evita que diferenças entre `fetch-ads-data`, `backfill` e `sync` contaminem os KPIs.

4. Fechar a consistência ponta a ponta
- Alinhar `fetch-ads-data` consolidado live com a mesma regra do frontend.
- Revisar `analyze-client` e pontos restantes que ainda usam fallback antigo de registro para não reintroduzir divergência.
- Verificar também os breakdowns hourly/geo para respeitarem a mesma regra de cadastro configurável.

Detalhe técnico
- A correção mais segura é parar de sobrecarregar `consolidated.leads`.
- Se necessário, o consolidado passa a expor campos explícitos de `registrations` e `purchases`, e a UI usa cada um no lugar certo.
- Não parece necessário criar nova tabela ou nova migração para essa correção; o campo `registration_event_name` já existe.

Arquivos impactados
- `src/hooks/useAdsData.tsx`
- `supabase/functions/fetch-ads-data/index.ts`
- `supabase/functions/analyze-client/index.ts`
- possivelmente `supabase/functions/sync-daily-metrics/index.ts`

Validação
- Conferir no mesmo cliente e no mesmo período:
  - valor salvo em `daily_metrics.registrations`
  - retorno live de `meta_ads.registrations`
  - KPI do topo
  - bloco Meta Ads
- Se banco/live estiverem em 120 e o topo em 240, a correção fica só no código de agregação.
- Só reprocesso histórico se eu confirmar que a persistência ainda está inflada.

Resultado esperado
- O app deixa de mostrar 240 quando o valor real é 120.
- Cadastros, compras e leads passam a ter significados fixos em todo o sistema.
- KPI geral, Meta Ads, tendências e análise ficam coerentes entre si.
