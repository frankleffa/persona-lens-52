

# Converter colunas Kanban para layout em grid (quadrados)

## Problema atual
O board de execucao usa colunas verticais estilo Trello (flex horizontal, 272px de largura cada), com rolagem horizontal.

## Solucao
Trocar o layout de `flex` horizontal para um `grid` responsivo, onde cada status vira um bloco quadrado/compacto que se adapta a tela.

## Mudancas

**Arquivo: `src/pages/Execution.tsx`**

1. **Container do board (linha 193)**: Trocar de `flex h-full gap-2` para um `grid` responsivo:
   - `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3`
   - Remover `overflow-x-auto` ja que nao havera rolagem horizontal

2. **Cada coluna (linha 199)**: Remover `flex-shrink-0 w-[272px]` e usar `w-full` para preencher a celula do grid. Manter altura minima com `min-h-[280px]` para manter formato mais quadrado.

3. **Container pai (linha 192)**: Ajustar de `overflow-x-auto overflow-y-hidden` para `overflow-y-auto` ja que o conteudo fluira verticalmente.

## Resultado visual

```text
Antes (colunas horizontais):
[Planejamento] [Pronto] [Veiculacao] [Teste] [Finalizado] -->

Depois (grid quadrado):
[Planejamento] [Pronto]     [Veiculacao]
[Teste]        [Finalizado]
```

Em telas grandes (xl), todas as 5 colunas ficam na mesma linha. Em telas menores, quebram em 2 ou 3 por linha.

O drag-and-drop continua funcionando normalmente entre as colunas.
