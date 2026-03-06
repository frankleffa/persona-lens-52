

## Plano: Transição de opacidade nos KPI cards durante background refetch

### Mudanças

**`src/components/KPICard.tsx`**:
- Adicionar prop `isFetching?: boolean`
- Aplicar `transition-opacity duration-500` no container do card
- Quando `isFetching` for true, reduzir opacidade para `opacity-60`; quando false, voltar a `opacity-100`

**`src/components/ClientDashboard.tsx`**:
- Passar `isFetching={isBackgroundRefetch}` para cada `<KPICard>` no grid de métricas consolidadas

Isso cria um efeito sutil: ao trocar de período, os cards ficam levemente transparentes enquanto os novos dados carregam, e voltam a 100% quando os dados chegam.

