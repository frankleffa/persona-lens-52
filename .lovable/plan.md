

## Plano: Refazer o Drag & Drop do Zero

### Problemas raiz identificados

1. **Conflito framer-motion + dnd-kit**: `motion.div` com `layout` e `AnimatePresence` conflita diretamente com as transforms CSS do dnd-kit, causando "pulos" visuais e animações quebradas
2. **Fire-and-forget DB updates**: Chamadas `.then()` sem tratamento de erro perdem updates silenciosamente
3. **Sem `onDragOver`**: Cross-column move só funciona no `onDragEnd`, sem feedback visual em tempo real de qual coluna o card vai cair
4. **Placeholder com altura fixa**: O placeholder usa `height: 72` hardcoded em vez da altura real do card

### Abordagem: Limpar e simplificar

**1. Remover framer-motion dos cards sortáveis**
- Remover `motion.div`, `AnimatePresence`, `layout` do `SortableCard`
- O dnd-kit já anima os cards via `CSS.Transform` + `transition` — isso é suficiente e não conflita
- Manter framer-motion apenas para elementos que NÃO participam do drag (ex: entrada inicial de cards novos se desejado)

**2. Reescrever `SortableCard` com placeholder proporcional**
- Quando `isDragging`, renderizar placeholder com `min-height` baseado no conteúdo, não hardcoded
- Usar `opacity: 0` no card original (mantendo espaço) enquanto o `DragOverlay` mostra o clone visual

**3. Adicionar `onDragOver` para cross-column em tempo real**
- Implementar `handleDragOver` que move o card entre colunas no estado local durante o arrasto
- Isso dá feedback visual imediato de onde o card será inserido
- Persistir apenas no `handleDragEnd`

**4. Simplificar `handleDragEnd`**
- Calcular posições finais de uma vez
- Usar `Promise.all` para batch de updates no DB em vez de fire-and-forget
- Invalidar query apenas após todas as promises resolverem

**5. Melhorar `DroppableColumn`**
- Adicionar indicador visual mais claro quando a coluna está recebendo um card (borda + fundo)

### Arquivos alterados
- `src/pages/Execution.tsx` — reescrever SortableCard, handlers de drag, remover framer-motion do sortable

