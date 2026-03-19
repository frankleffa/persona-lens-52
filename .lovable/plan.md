

## Plano: Ícone de info com tooltip em cada métrica

### O que muda
Adicionar um ícone circular de informação (ℹ️) ao lado do label de cada métrica. Ao passar o mouse, aparece um tooltip explicando de onde vem o dado e o que ele representa.

### Como funciona
- Usa as descrições já existentes em `METRIC_DEFINITIONS` (campo `description` e `module`) — não precisa criar dados novos
- O tooltip mostra: **Fonte:** (ex: "Meta Ads", "Consolidado") + **Descrição** (ex: "Custo por cadastro no Meta Ads")

### Arquivos alterados

**1. `src/components/MetricInfoTooltip.tsx`** (novo)
- Componente reutilizável: recebe `metricKey`, busca definição em `METRIC_DEFINITIONS`, renderiza ícone `Info` (lucide) com `Tooltip` do radix
- Se não encontrar definição, não renderiza nada

**2. `src/components/KPICard.tsx`**
- Adicionar `MetricInfoTooltip` ao lado do label, dentro do header do card

**3. `src/components/PlatformSection.tsx`**
- Adicionar `MetricInfoTooltip` ao lado do label de cada métrica na grid

