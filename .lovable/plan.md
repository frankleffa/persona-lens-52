

## Plano: Melhorar o Drag & Drop do Kanban

### Problemas identificados

1. **Ref warning**: `CampaignCard` e `CampaignDrawer` não usam `forwardRef`, causando warnings do dnd-kit
2. **Sem indicador de posição**: Ao arrastar dentro da mesma coluna, não há placeholder visual mostrando onde o card será inserido
3. **Feedback visual fraco**: O card arrastado fica com `opacity: 0.5` mas não há animação suave nos outros cards
4. **Cross-column impreciso**: Ao mover entre colunas, o card sempre vai para o final — deveria respeitar a posição do `over`
5. **Sem touch support**: Apenas `PointerSensor` com `distance: 5`, sem suporte a `KeyboardSensor` para acessibilidade

### Mudanças

**1. `CampaignCard.tsx` — adicionar `forwardRef`**
- Envolver o componente com `React.forwardRef` para eliminar o warning e permitir que o dnd-kit controle a ref corretamente

**2. `SortableCard` em `Execution.tsx` — melhorar feedback visual**
- Quando `isDragging`, renderizar um placeholder estilizado (borda tracejada, fundo sutil) em vez de mostrar o card com opacidade reduzida
- Adicionar `transition` suave para os cards que se movem durante o arrasto (já automático via `CSS.Transform`)

**3. `DragOverlay` — melhorar aparência**
- Adicionar rotação leve (`rotate(2deg)`) e sombra mais pronunciada no card sendo arrastado
- Adicionar `cursor: grabbing` durante o arrasto

**4. `handleDragEnd` — melhorar lógica cross-column**
- Ao mover para outra coluna, calcular a posição correta baseada no `over` card em vez de sempre colocar no final
- Reindexar posições da coluna alvo após inserção

**5. Sensors — adicionar `KeyboardSensor`**
- Adicionar suporte a teclado para acessibilidade (mover cards com setas)

**6. `DroppableColumn` — melhorar visual de drop zone**
- Adicionar animação de borda pulsante quando um card está sendo arrastado sobre a coluna
- Diferenciar visualmente a coluna de origem da coluna de destino

