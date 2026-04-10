

## Plano: Corrigir layout da seção FTD

### Problema
Os cards de FTD, Custo/FTD e Funil Cadastro estão todos espremidos num grid de 5 colunas (`lg:grid-cols-5`). O `RegToFtdFunnelCard` tem barras internas e o `FtdByCampaignCard` tem uma lista de campanhas — ambos precisam de mais espaço que um KPI card simples.

### Solução

**`src/components/ClientDashboard.tsx`** — Separar o layout em duas linhas:
1. **Linha 1**: Grid `grid-cols-2 lg:grid-cols-4` com os KPI cards simples (FTD e Custo/FTD) + o card de Funil Cadastro ocupando `col-span-2` para ter largura adequada
2. **Linha 2**: O `FtdByCampaignCard` em largura total (`col-span-full`), já que lista campanhas e precisa de espaço horizontal

**`src/components/RegToFtdFunnelCard.tsx`** — Adicionar `col-span-2` ao wrapper do card para que ocupe duas colunas no grid, dando espaço para as barras de progresso e custos

**`src/components/FtdByCampaignCard.tsx`** — Manter `col-span-full` (já tem spans grandes). Ajustar padding e garantir que a lista de campanhas não fique apertada

### Resultado
- KPI cards simples (FTD, Custo/FTD) ficam lado a lado, com o mesmo tamanho dos KPI cards da seção Métricas Gerais
- Card de Funil ocupa 2 colunas, com espaço confortável para barras e detalhes
- Card de FTD por Campanha ocupa largura total na linha de baixo

