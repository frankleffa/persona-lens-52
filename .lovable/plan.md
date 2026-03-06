

## Problema

O pull request do GitHub sobrescreveu `src/index.css` e `tailwind.config.ts` com o tema antigo "Premium Slate Dark" (Inter, azul `#3B82F6`, border-radius arredondado, HSL vars). O tema coral dark que estava configurado no contexto do projeto (Syne, `#FF5C3A`, `0px` radius, vars diretas) foi perdido.

## Plano

Reescrever os dois arquivos para restaurar o tema coral dark:

### 1. `src/index.css`
- Trocar import de fontes: Inter/JetBrains → Syne/DM Mono
- Substituir toda a paleta `:root` por: `--bg: #0c0c0c`, `--surface: #111111`, `--accent: #FF5C3A`, `--pos: #4ADE80`, etc.
- Mapear variáveis shadcn (`--primary`, `--card`, etc.) para as novas vars
- Restaurar estilos de componentes: `.card-executive`, `.kpi-card`, `.nav-item`, `.sidebar`, badges, `.section-label`, `.kanban-*`, `.topbar`, `.score-track` — todos com estilo brutal/flat (sem sombra, sem border-radius, borda-top accent no hover)
- Forçar `border-radius: 0px !important` globalmente

### 2. `tailwind.config.ts`
- `fontFamily`: Syne + DM Mono
- Cores: mapear com `var(--xxx)` direto (sem `hsl()`)
- Adicionar cores custom: `bg`, `surface`, `surface2`, `pos`, `neg`, `accent2`, `chart.*`
- `borderRadius`: todos para `0px`

Os conteúdos exatos estão no bloco `<current-code>` da conversa — será uma restauração fiel daqueles arquivos.

