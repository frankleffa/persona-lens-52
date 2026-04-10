

## Plano: Período de comparação manual

### Problema
Atualmente o "vs período anterior" é sempre automático (mesma duração, janela imediatamente anterior). O usuário quer poder escolher manualmente contra qual período comparar.

### Solução
Adicionar um seletor opcional de "período de comparação" ao lado do `DateRangePicker` existente. Por padrão continua automático, mas o usuário pode ativar comparação customizada e escolher datas.

### Alterações

**1. `src/lib/date-utils.ts`**
- Exportar novo tipo `ComparisonMode = "auto" | { startDate: string; endDate: string }`
- Criar `getComparisonDateRange(mainRange, comparisonMode)` que retorna o período anterior automático quando `"auto"`, ou o período manual quando customizado

**2. `src/hooks/useAdsData.tsx`**
- Adicionar estado `comparisonMode` (default `"auto"`)
- Usar `getComparisonDateRange` em vez de `getPreviousDateRange` para a query de período anterior
- Expor `comparisonMode`, `setComparisonMode` e as datas do período de comparação no retorno do hook

**3. Novo componente: `src/components/ComparisonPeriodPicker.tsx`**
- Toggle "Comparação automática" / "Comparação manual"
- Quando manual: abre um mini calendário de range para selecionar o período de comparação
- Mostra label descritivo: "vs 01/03 – 07/03" ou "vs período anterior (automático)"
- Estilo compacto, ao lado ou abaixo do DateRangePicker

**4. `src/components/ClientDashboard.tsx`**
- Renderizar o `ComparisonPeriodPicker` ao lado do `DateRangePicker` no header
- Passar `comparisonMode` e `setComparisonMode` do hook

**5. `src/components/KPICard.tsx`**
- Atualizar o texto "vs período anterior" para mostrar as datas reais do período de comparação (ex: "vs 01/03 – 07/03")
- Receber as datas via prop opcional `comparisonLabel`

### UX
- Por padrão, tudo funciona como hoje (automático)
- Um pequeno botão/toggle "⚡ Comparar com..." aparece ao lado do seletor de período
- Ao ativar, abre um calendário compacto para escolher o período de comparação
- Os KPI cards passam a mostrar as datas reais da comparação

