

## Plano: Popover com detalhes + responsividade no card Funil Cadastro → FTD

### Alterações

**1. `src/components/RegToFtdFunnelCard.tsx`**

- Envolver o card inteiro em um `Popover` (Radix). Ao clicar no card, abre um `PopoverContent` com detalhes expandidos:
  - Taxa de conversão atual vs período anterior (com valores absolutos)
  - Custo por Cadastro e Custo por FTD com formatação completa
  - Investimento total do período
  - Variação percentual destacada
  - Mini tabela: Cadastros (atual vs anterior), FTDs (atual vs anterior)
- Adicionar `cursor-pointer` ao card para indicar clicabilidade
- Tornar responsivo:
  - `text-[24px] sm:text-[28px]` no valor principal
  - Labels `w-14 sm:w-16` para funcionar em telas menores
  - Footer de custos em `flex-wrap` para não quebrar em mobile
  - Padding `p-3 sm:p-4`

**2. Nenhuma outra alteração necessária** — o card já está dentro de um grid responsivo no `ClientDashboard.tsx`.

### UX
- Clique no card abre popover com dados detalhados do funil
- Em mobile, o card se adapta com fontes e espaçamentos menores
- Popover fecha ao clicar fora ou pressionar Esc

