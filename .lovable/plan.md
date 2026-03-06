

## Remover bordas e linhas brancas do dark mode

O problema são as bordas semitransparentes brancas (`rgba(255,255,255,0.05)` e `rgba(255,255,255,0.08)`) visíveis em cards, sidebar, topbar, kanban, connections, etc.

### Abordagem

Tornar as bordas completamente transparentes no dark mode, mantendo-as no light mode onde fazem sentido.

### Arquivo: `src/index.css`

**Bloco `:root, .dark` (linhas 22-23):**
```css
/* De */
--border: rgba(255, 255, 255, 0.05);
--border2: rgba(255, 255, 255, 0.08);

/* Para */
--border: transparent;
--border2: transparent;
```

**Bloco `.sidebar` (linha 310):**
```css
/* De */
border-right: 1px solid var(--border) !important;
/* Para */
border-right: none !important;
```

**Bloco `.topbar` (linhas 386-387):**
```css
/* De */
border-bottom: 1px solid var(--border);
box-shadow: 0 1px 0 var(--border);
/* Para */
border-bottom: none;
box-shadow: none;
```

**Bloco `.kpi-card` / `.card-executive` (linha 198):**
```css
border: none;
```

**Bloco `.kanban-card` (linha 352):**
```css
border: none;
```

**Bloco `.kanban-col` (linha 347):**
```css
border-right: none;
```

**Bloco `.connection-row` (linha 369):**
```css
border: none;
```

**Sidebar header** em `AppSidebar.tsx` (linha 103): remover `border-b border-sidebar-border`.

**Sidebar border** em `--sidebar-border` (linha 69): trocar para `transparent`.

### Resumo
| Arquivo | Mudanças |
|---------|----------|
| `src/index.css` | ~12 linhas: zerar borders e box-shadows no dark mode |
| `src/components/AppSidebar.tsx` | 1 linha: remover border-b do header |

O light mode mantém suas bordas intactas (bloco `.light` tem valores próprios).

