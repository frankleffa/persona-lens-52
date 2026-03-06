

## Plano: Melhorar o Calendário do DateRangePicker

### Problemas identificados

1. **Visual básico demais** — o calendário usa o DayPicker padrão com estilo mínimo, sem bordas arredondadas nos dias, sem transições suaves
2. **Navegação pouco intuitiva** — setas de navegação pequenas e com baixa opacidade (50%)
3. **Range selection visual fraco** — a seleção de intervalo usa `bg-accent` genérico, difícil de distinguir
4. **Layout apertado** — células de 36px (w-9 h-9) sem espaçamento adequado
5. **Sem feedback hover nos dias** — dias não têm hover state visível antes de clicar
6. **Botão "Aplicar" isolado** — sem indicação clara do range selecionado antes de aplicar

### Mudanças

**`src/components/ui/calendar.tsx`** — Visual modernizado:
- Aumentar células para `w-10 h-10` com `rounded-full` nos dias
- Melhorar nav buttons: maior opacidade, hover mais visível, tamanho `h-8 w-8`
- Range middle com cor primária suave (`bg-primary/15`) em vez de `bg-accent`
- Day selected com `rounded-full` e sombra sutil
- Hover state claro nos dias (`hover:bg-primary/10`)
- Caption com font-semibold e tamanho maior

**`src/components/DateRangePicker.tsx`** — UX melhorada:
- Mostrar o range selecionado em texto abaixo do calendário antes do botão Aplicar
- Botão trigger com `rounded-lg` em vez de `rounded-none`
- Presets sidebar com visual mais limpo (padding, hover states melhores)
- Adicionar `numberOfMonths={2}` em desktop para ver 2 meses lado a lado
- Animação suave no popover

| Arquivo | Mudanças |
|---------|----------|
| `src/components/ui/calendar.tsx` | Células maiores, rounded-full, hover states, range visual com primary/15, nav buttons melhorados |
| `src/components/DateRangePicker.tsx` | 2 meses em desktop, range preview text, trigger arredondado, presets mais limpos |

