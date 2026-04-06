

## Plano: Permitir seleção de dias isolados no calendário

### Problema atual
O calendário funciona apenas no modo `range`, exigindo sempre um intervalo (de → até). Se o usuário clica em um único dia que não seja hoje, ele precisa clicar "Aplicar" e o sistema envia `startDate === endDate`, mas a UX não é clara — parece que precisa selecionar dois dias.

### Solução
Manter o modo `range` do calendário (que já suporta clique único naturalmente), mas ajustar a lógica de `handleApply` e o feedback visual para deixar claro que selecionar **um único dia** é válido. O clique único já define `from` sem `to`, e o botão Aplicar já trata `to = from` como fallback. A mudança principal é:

1. **Adicionar preset "Ontem"** na sidebar de atalhos — atualmente só existe "Hoje", então dias isolados passados não têm atalho.

2. **Melhorar o label do botão** para exibir corretamente um dia isolado (ex: "05 abr" ao invés de forçar "Hoje").

3. **Ajustar o texto de preview** para mostrar apenas a data quando `from` existe mas `to` não foi selecionado, com texto auxiliar tipo "Clique em outra data para intervalo, ou aplique para dia único".

### Arquivos alterados

**`src/components/DateRangePicker.tsx`**
- Adicionar preset "Ontem" (`LAST_2_DAYS` não serve pois pega 2 dias; criar valor custom `{ startDate: ontem, endDate: ontem }` ou tratar inline)
- Na mensagem de preview, quando `selected.from` existe mas `selected.to` não, mostrar: "Dia único: [data] — ou clique outra data para intervalo"
- Nenhuma mudança no `handleApply` necessária — já funciona com `to = from`

**`src/lib/date-utils.ts`**
- Sem alterações necessárias — o tipo `DateRangeOption` já aceita `{ startDate, endDate }` com datas iguais

### Resultado
O usuário poderá clicar em qualquer dia isolado (ex: 2 de abril), ver o preview "02 de abril", clicar Aplicar, e o sistema filtrará apenas aquele dia.

