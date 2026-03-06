

## Problema Identificado

O dark mode (`:root, .dark`) ainda usa `--accent: #FF5C3A` (coral vermelho). A unificação para azul só foi aplicada no light mode. No screenshot atual, o sidebar mostra "Dashboard" em vermelho, o logo-dot vermelho, e o toggle com bolinha laranja.

## Plano: Corrigir dark mode para usar paleta azul

### Arquivo: `src/index.css`

**Bloco `:root, .dark` (linhas 26-29)** — trocar accent de coral para azul:
- `--accent: #1c9cf0` (era `#FF5C3A`)
- `--accent2: #1da1f2` (era `#FF8C6B`)
- `--neg: #f4212e` (era `#FF5C3A` — separar negativo do accent)

Isso corrige automaticamente todos os componentes do dark mode que usam `var(--accent)`: sidebar nav active, logo-dot, botões primários, charts, badges, etc.

### Arquivos afetados
| Arquivo | Mudança |
|---------|---------|
| `src/index.css` | 3 linhas no bloco `:root, .dark`: accent → azul, neg → vermelho separado |

Nenhum outro arquivo precisa mudar — todos já referenciam `var(--accent)`.

