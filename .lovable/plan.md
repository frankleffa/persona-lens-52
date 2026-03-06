

## Plan: Unificar o tema com uma única paleta de cores (azul)

O problema atual: o dark mode usa azul (#1c9cf0) como accent e o light mode usa vermelho/coral (#E04A2A), criando uma identidade visual inconsistente e poluída.

### Solução

Unificar **ambos os modos** com a paleta azul, mantendo o light mode com fundos claros mas usando azul como cor de destaque — similar ao estilo Twitter/X light mode.

### Mudanças em `src/index.css`

**1. Bloco `.light` — trocar accent de coral para azul:**
- `--accent: #1e9df1` (era `#E04A2A`)
- `--accent2: #1da1f2` (era `#FF5C3A`)
- `--neg: #f4212e` (manter vermelho apenas para erros/negativos, separado do accent)
- `--chart-1: #1e9df1` (era `#E04A2A`)
- `--chart-purple: #9333ea` (era `#E04A2A`)

**2. Overrides `.light` — remover todas as referências coral:**
- `.light .badge-meta`: trocar `rgba(224, 74, 42, ...)` para `rgba(28, 156, 240, ...)`
- `.light .badge-attention`: manter vermelho (é semântico, indica atenção)
- `.light .metric-badge-negative`: manter vermelho (semântico)
- `.light .nav-item.active`: trocar gradiente coral para gradiente azul
- `.light .logo-dot`: trocar box-shadow coral para azul

**3. Charts (`HourlyConversionsChart.tsx`, `GeoConversionsChart.tsx`):**
- Remover a lógica condicional `isLight ? coral : blue` — usar azul sempre

### Arquivos a editar
| Arquivo | Mudança |
|---------|---------|
| `src/index.css` | ~15 linhas: trocar coral → azul no `.light` e overrides |
| `src/components/HourlyConversionsChart.tsx` | Simplificar: remover branch de cor, usar azul fixo |
| `src/components/GeoConversionsChart.tsx` | Idem |

Resultado: identidade visual coesa azul em ambos os modos, profissional e limpa.

