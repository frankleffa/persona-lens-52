

## Expandir todas as métricas disponíveis por plataforma

### O que muda
Atualmente cada plataforma mostra apenas 3-7 métricas na tela de permissões, mas as APIs retornam mais dados. Vamos adicionar TODAS as métricas que cada plataforma realmente fornece.

### Métricas por plataforma (antes vs depois)

**Google Ads** (7 atuais -> 8)
- Existentes: Investimento, Cliques, Impressões, Conversões, CTR, CPC, CPA
- Nova: **Receita** (revenue - já retornado pela API mas não mapeado)

**Meta Ads** (7 atuais -> 9)
- Existentes: Investimento, Cliques, Impressões, Leads, CTR, CPC, CPA
- Novas: **Receita** e **Mensagens** (ambos já retornados pela API mas não mapeados)

**GA4** (3 atuais -> 3)
- Já tem tudo que a API retorna: Sessões, Eventos, Taxa de Conversão

**Consolidado** (6 atuais -> 6)
- Já completo: Investimento, Receita, ROAS, Leads, Mensagens, CPA

**Campanhas** (10) e **Visualização** (4) - sem alterações

### Detalhes Tecnicos

**1. `src/lib/types.ts`**
- Adicionar novas MetricKeys: `google_revenue`, `meta_revenue`, `meta_messages`
- Adicionar entradas em `METRIC_DEFINITIONS` com module correspondente
- Adicionar aos arrays de métricas em `PLATFORM_GROUPS`
- Adicionar entradas em `MOCK_METRIC_DATA`

**2. `src/components/ClientDashboard.tsx`**
- Adicionar `revenue: "google_revenue"` ao `GOOGLE_METRIC_MAP`
- Adicionar `revenue: "meta_revenue"` e `messages: "meta_messages"` ao `META_METRIC_MAP`
- Adicionar labels correspondentes em `GOOGLE_LABELS` e `META_LABELS`

### Resultado final
- Google Ads: 8 métricas controladas independentemente
- Meta Ads: 9 métricas controladas independentemente
- GA4: 3 métricas
- Consolidado: 6 métricas
- Campanhas: 10 métricas
- Visualização: 4 métricas
- **Total: 40 métricas** (antes eram 37)

