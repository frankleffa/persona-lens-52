
## Plano: corrigir os 42 cadastros no Meta Ads

### Diagnóstico confirmado
- O **42 atual** vem da soma de **2 dias** no banco: **34 em 2026-03-24 + 8 em 2026-03-23** em `daily_metrics`.
- O dashboard hoje abre por padrão em **`LAST_2_DAYS`**, então ele já nasce somando ontem + hoje.
- Além disso, a extração do Meta ainda pode inflar cadastros porque soma **dois action_types equivalentes**:
  - `offsite_conversion.fb_pixel_complete_registration`
  - `complete_registration`
- E no frontend, o merge entre banco + live usa **`Math.max(...)`** para `registrations`, o que pode manter o número inflado mesmo quando o live vier menor/correto.

### O que vou ajustar

**1. Padronizar o cálculo de cadastros do Meta**
- Criar uma regra única para Meta:
  - **registrations** = usar **uma fonte canônica**, sem somar os dois aliases
  - **leads** = apenas eventos `lead`
- Aplicar isso em todas as funções que buscam/salvam dados:
  - `supabase/functions/fetch-ads-data/index.ts`
  - `supabase/functions/sync-daily-metrics/index.ts`
  - `supabase/functions/backfill-metrics/index.ts`
  - `supabase/functions/analyze-client/index.ts`

**2. Corrigir o merge no dashboard**
- Em `src/hooks/useAdsData.tsx`, parar de usar `Math.max` para `registrations` e `leads`.
- Quando houver resposta live válida, usar o valor live como prioridade para os cards do período atual.
- Banco fica como fallback, não como “valor máximo”.

**3. Remover a ambiguidade do período**
- Alterar o default de `useAdsData` de **`LAST_2_DAYS`** para **`TODAY`**, ou deixar o período muito mais explícito no header.
- Isso evita parecer bug quando o card está somando ontem + hoje.

**4. Reprocessar histórico**
- Depois do fix, usar o botão de **re-backfill** já existente para regravar os últimos 30 dias desse cliente.
- Assim os dados antigos no banco também ficam corrigidos.

### Arquivos afetados
- `supabase/functions/fetch-ads-data/index.ts`
- `supabase/functions/sync-daily-metrics/index.ts`
- `supabase/functions/backfill-metrics/index.ts`
- `supabase/functions/analyze-client/index.ts`
- `src/hooks/useAdsData.tsx`
- opcionalmente `src/components/ClientDashboard.tsx` e `src/components/DateRangePicker.tsx`

### Resultado esperado
- O card de **Cadastros** passa a bater com o critério do Meta Ads Manager.
- O app deixa de somar aliases duplicados de evento.
- O frontend não “segura” mais um número inflado vindo do banco.
- O número mostrado fica coerente com o período selecionado.
