

## Problema

O drag-and-drop não transfere cards entre colunas porque as colunas do kanban **não são droppable containers**. O `SortableContext` apenas torna os cards arrastáveis/reordenáveis, mas não cria uma zona de drop para a coluna em si. Quando você solta um card em uma coluna (especialmente vazia), `over` é `null` e nada acontece.

## Solução

Adicionar `useDroppable` do `@dnd-kit/core` em cada coluna, envolvendo a área de cards. Isso registra cada coluna como uma drop zone com `id={status}`, permitindo que o `handleDragEnd` detecte a coluna de destino.

### Arquivo: `src/pages/Execution.tsx`

1. **Importar `useDroppable`** do `@dnd-kit/core` (linha 8)
2. **Criar componente `DroppableColumn`** que usa `useDroppable({ id: status })` e envolve a div da área de cards
3. **Envolver a área de cards** (div com `data-column-id`) com esse componente, passando `status` como ID

### Mudança concreta

```tsx
// Novo componente auxiliar
function DroppableColumn({ status, children }: { status: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div ref={setNodeRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[40px]"
             style={{ background: isOver ? 'rgba(28,156,240,0.06)' : 'transparent', transition: 'background 0.15s ease' }}>
            {children}
        </div>
    );
}
```

Substituir a div `data-column-id` atual pela `DroppableColumn`, mantendo o `SortableContext` dentro.

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/Execution.tsx` | Importar `useDroppable`, criar `DroppableColumn`, refatorar área de cards |

