

## Plano: Simplificar labels do seletor de comparação

### Problema
O botão de comparação mostra datas completas ("vs 01/03 – 07/03") que ocupam espaço e não comunicam rapidamente. O usuário quer labels curtas: "vs ontem", "vs 7d", "vs 30d", "vs período anterior".

### Alterações

**1. `src/hooks/useAdsData.tsx`** — Alterar o cálculo de `comparisonLabel` para gerar labels curtas baseadas no `dateRange` atual (quando `comparisonMode === "auto"`):
- `TODAY` → "ontem"
- `LAST_2_DAYS` → "2d anteriores"
- `LAST_7_DAYS` → "7d anteriores"
- `LAST_14_DAYS` → "14d anteriores"
- `LAST_30_DAYS` → "30d anteriores"
- Custom range → "período anterior"
- Quando `comparisonMode` é manual, manter as datas curtas ("01/03 – 07/03")

**2. `src/components/ComparisonPeriodPicker.tsx`** — Atualizar `displayLabel` para usar diretamente o `autoLabel` simplificado (já funciona, apenas garantir que o texto curto é exibido corretamente). Remover `max-w-[160px]` do truncate já que os labels serão mais curtos.

**3. `src/components/KPICard.tsx`** — Nenhuma alteração necessária, já usa `comparisonLabel` diretamente.

### Resultado
- Botão mostra "vs 7d anteriores" em vez de "vs 01/03 – 07/03"
- KPI cards mostram "vs 7d anteriores" no rodapé
- Comparação manual continua mostrando as datas escolhidas

