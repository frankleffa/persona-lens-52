

## Plano: Upgrade UI/UX da Mensuração com fundo branco

### O que muda
Redesign completo da página `/mensuracao` mantendo fundo branco e visual profissional tipo planilha financeira moderna. Alinhamento com o layout padrão do app (sidebar offset, max-width).

### Mudanças em `src/pages/ResultsMeasurement.tsx`

**Layout**
- Usar `pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8` (mesmo offset da sidebar que o Index usa)
- Fundo `bg-white` no container principal
- Max-width `max-w-7xl mx-auto`

**Header redesenhado**
- Título maior com subtítulo descritivo
- Seletores de cliente e ano com visual limpo (bordas cinza claro, bg white)
- Badge de status mais elegante com ícone de dot animado quando loading

**Planilha modernizada**
- Fundo branco com bordas `border-gray-200`
- Headers de meses com fundo `bg-gray-50` e texto `text-gray-700`
- Sub-headers PREV/REAL: PREV com fundo `bg-blue-50` e texto `text-blue-600`, REAL com fundo `bg-gray-50`
- Section headers com barra lateral colorida ao invés de dot
- Rows com zebra stripes sutis (`bg-white` / `bg-gray-50/50`)
- Cells editáveis com hover `bg-blue-50/50` e cursor pointer
- Input de edição com ring azul e fundo branco
- Valores vazios com "—" em `text-gray-300`
- Valores calculados em `text-gray-500` itálico
- Highlights verde/vermelho mais vibrantes (`text-emerald-600` / `text-red-500`)

**Legenda**
- Ícones visuais ao invés de texto puro (quadrado colorido + label)
- Fonte um pouco maior e mais espaçamento

**Empty state**
- Quando não há cliente selecionado, mostrar card central com ícone e CTA

### Arquivos alterados
- `src/pages/ResultsMeasurement.tsx` — redesign completo do visual

