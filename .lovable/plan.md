

## Plano: Detalhar conversões GA4 por tipo de evento no painel de UTMs

### Contexto do problema

A diferença entre 3735 compras no Meta e 2901 conversões no GA4 é esperada — são sistemas de rastreio diferentes. O GA4 usa a métrica `keyEvents` que soma **todos** os eventos marcados como "chave" (compras, cadastros, leads, etc.), enquanto o Meta conta apenas `purchases`. Além disso, a atribuição difere (Meta usa last-click em 7d/1d, GA4 usa modelo próprio).

O problema real: o painel não mostra **quais** eventos compõem as conversões do GA4.

### Alterações

**1. `supabase/functions/fetch-ads-data/index.ts`** — Adicionar uma segunda query GA4 que busca conversões **por nome do evento**:
- Nova dimensão: `eventName`
- Métricas: `keyEvents` (com fallback para `conversions`)
- Filtro: apenas eventos com keyEvents > 0
- Retornar no resultado como `utm_event_breakdown: [{ eventName, count }]`
- Isso responde "quais são as conversões" (ex: `purchase: 2500`, `generate_lead: 300`, `sign_up: 101`)

**2. `src/hooks/useAdsData.tsx`** — Propagar o novo campo `utm_event_breakdown` do resultado da API para o componente

**3. `src/components/utm/UTMAnalyticsPanel.tsx`** — Adicionar um bloco visual acima da tabela (ou na aba Diagnóstico) mostrando:
- "Detalhamento de Conversões GA4" com mini-cards por evento
- Nome do evento traduzido (purchase → Compra, generate_lead → Lead, sign_up → Cadastro)
- Quantidade de cada evento
- Isso esclarece de onde vêm as 2901 conversões

**4. Atualizar a interface `GA4UTMEntry`** e tipos relacionados para incluir o novo campo

### Resultado
- O painel mostrará claramente que as "2901 conversões GA4" são compostas por X compras + Y leads + Z cadastros
- A diferença com o Meta fica explicada visualmente
- O gestor pode tomar decisões sabendo exatamente o que cada plataforma está contando

