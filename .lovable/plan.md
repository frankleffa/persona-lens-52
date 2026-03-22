

## Plano: LTV por Cliente

### Problema atual
As tabelas `meta_customers` e `meta_orders` são globais — não têm `client_id`. O dashboard mostra dados de todos os clientes juntos, sem filtro.

### Mudanças

**1. Migração SQL**
- Adicionar coluna `client_id uuid` em `meta_customers` (nullable para dados existentes)
- Recriar as 4 views (`vw_meta_ltv`, `vw_meta_campaign_ltv`, `vw_meta_cohorts`, `vw_meta_summary`) expondo `client_id` para filtragem
- Atualizar RLS: managers veem customers dos seus clientes via `client_manager_links`

**2. `src/pages/LtvDashboard.tsx`**
- Adicionar seletor de cliente usando `useManagerClients` (mesmo padrão do Index, Connections, etc.)
- Filtrar todas as queries por `client_id` do cliente selecionado
- Queries: `.eq("client_id", selectedClientId)` em cada view
- Mostrar mensagem "Selecione um cliente" quando nenhum estiver selecionado

### Arquivos alterados
- **Migração SQL** — alter table + recreate views
- `src/pages/LtvDashboard.tsx` — seletor de cliente + filtros nas queries

