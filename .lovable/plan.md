

## Auditoria do App — Bugs, Erros e Arquivos Desnecessários

### Arquivos Órfãos (não importados em nenhum lugar)

Esses arquivos existem no projeto mas **nunca são importados** por nenhum outro arquivo:

| Arquivo | Motivo |
|---------|--------|
| `src/components/landing/ScreenshotsSection.tsx` | Não importado pela LandingPage nem nenhum outro componente |
| `src/components/landing/TestimonialsSection.tsx` | Idem |
| `src/components/EmptyDashboardState.tsx` | Zero importações |
| `src/components/ui/contacts-table-with-modal.tsx` | Zero importações |
| `src/components/ui/leads-data-table.tsx` | Zero importações |
| `src/components/ui/sky-toggle.tsx` + `sky-toggle.css` | Zero importações |
| `src/components/ui/carousel.tsx` | Zero importações (e o pacote `embla-carousel-react` só é usado aqui) |
| `src/components/ui/resizable.tsx` | Zero importações (e o pacote `react-resizable-panels` só é usado aqui) |
| `src/hooks/use-metric-trend.ts` | Zero importações |
| `src/lib/metrics.ts` | Zero importações |
| `src/services/permissions.ts` | Importa de `@/lib/types` mas **nenhum arquivo importa** `permissions.ts` |
| `src/services/clients.ts` | Importa de `@/lib/types` mas **nenhum arquivo importa** `clients.ts` |

**Total: 13 arquivos órfãos** que podem ser removidos com segurança.

### Pacotes npm Potencialmente Não Utilizados

Se os arquivos órfãos acima forem removidos, esses pacotes ficam sem uso:
- `embla-carousel-react` (só usado em `carousel.tsx`)
- `react-resizable-panels` (só usado em `resizable.tsx`)

### Observações (sem bugs críticos encontrados)

1. **Sem erros no console** — nenhum erro registrado nos logs.
2. **Dois pacotes de drag-and-drop** — `@dnd-kit` (usado em `Execution.tsx`) e `@hello-pangea/dnd` (usado em `JourneyFunnelChart.tsx`). Funcionam, mas idealmente seria padronizado em um só.
3. **`services/permissions.ts` e `services/clients.ts`** parecem ser módulos antigos que foram substituídos por hooks (`usePermissions`, `useManagerClients`) mas nunca deletados.

### Plano de Ação

1. **Deletar os 13 arquivos órfãos** listados acima
2. **Remover pacotes não utilizados** (`embla-carousel-react`, `react-resizable-panels`) do `package.json`
3. Nenhuma mudança de lógica — apenas limpeza

