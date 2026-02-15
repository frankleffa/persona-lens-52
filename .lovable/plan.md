

## Reorganizar seleção de métricas por plataforma

### Problema
A tela de permissões agrupa as 25 métricas por módulos genéricos (Financeiro, Conversão, Performance...), mas o dashboard organiza tudo por **plataforma** (Consolidado, Google Ads, Meta Ads, GA4). Isso causa confusão: o gestor marca 19 métricas, mas muitas compartilham a mesma chave de visibilidade entre plataformas, e apenas 4 cards aparecem na seção Meta Ads, por exemplo.

### Solução
Substituir a listagem por módulos por **botões de plataforma com ícone/logo**, cada um abrindo um painel com as métricas específicas daquela plataforma. O gestor poderá expandir/colapsar cada plataforma e ativar/desativar suas métricas individualmente.

### Nova estrutura de métricas

As métricas serão reagrupadas em 4 categorias de plataforma:

```text
+-------------------------------------------+
|  [Sigma] Consolidado  |  [G] Google Ads   |
|  [M] Meta Ads         |  [A] GA4          |
+-------------------------------------------+

Ao clicar em cada botao, expande um painel:

  [Sigma] Consolidado (expandido)
  +------------------------------------+
  | Investimento        [toggle]       |
  | Receita             [toggle]       |
  | ROAS                [toggle]       |
  | Leads               [toggle]       |
  | Mensagens           [toggle]       |
  | CPA                 [toggle]       |
  +------------------------------------+

  [G] Google Ads (expandido)
  +------------------------------------+
  | Investimento        [toggle]       |
  | Cliques             [toggle]       |
  | Impressoes          [toggle]       |
  | Conversoes          [toggle]       |
  | CTR                 [toggle]       |
  | CPC                 [toggle]       |
  | CPA                 [toggle]       |
  +------------------------------------+

  ... etc para Meta Ads e GA4
```

### Detalhes Tecnicos

1. **Redefinir METRIC_DEFINITIONS (`src/lib/types.ts`)**
   - Trocar o campo `module` dos valores genéricos ("Financeiro", "Conversão"...) para valores de plataforma: `"Consolidado"`, `"Google Ads"`, `"Meta Ads"`, `"GA4"`, `"Campanhas"`, `"Visualizacao"`.
   - Adicionar novas metric keys para métricas que hoje compartilham chaves entre plataformas. Cada plataforma precisa de suas próprias chaves para que a visibilidade funcione independentemente. Exemplo: `google_clicks`, `google_impressions`, `google_ctr`, `google_cpc`, `google_cpa`, `google_conversions`, `google_investment`, `meta_clicks`, `meta_impressions`, `meta_ctr`, `meta_cpc`, `meta_cpa`, `meta_leads`, `meta_investment`, `ga4_sessions`, `ga4_events`, `ga4_conversion_rate`.
   - Manter as chaves consolidadas existentes (`investment`, `revenue`, `roas`, `leads`, `messages`, `cpa`) e as de campanhas (`camp_*`).

2. **Atualizar `MetricKey` type** com as novas chaves por plataforma.

3. **Atualizar `ClientDashboard.tsx`**
   - Alterar `GOOGLE_METRIC_MAP`, `META_METRIC_MAP` e `GA4_METRIC_MAP` para usar as novas chaves por plataforma ao invés das chaves compartilhadas.

4. **Redesenhar seção de permissões em `Permissions.tsx`**
   - Criar 4 botões de plataforma com ícones estilizados (Sigma para Consolidado, G para Google, M para Meta, A para GA4), mais um para Campanhas.
   - Cada botão expande/colapsa um painel (accordion-style) com os toggles daquela plataforma.
   - Cada botão mostra um badge com contagem de métricas ativas daquela categoria (ex: "5/7").
   - Cores diferenciadas por plataforma: azul para Google, roxo para Meta, âmbar para GA4, neutro para Consolidado.

5. **Atualizar `MOCK_METRIC_DATA`** com valores placeholder para as novas chaves.

6. **Migrar dados existentes**: Nao sera necessaria migracao de banco. As novas chaves serao adicionadas com default `is_visible = true` na logica do hook `usePermissions`.

### Paginas afetadas
- `src/lib/types.ts` - novas metric keys e reorganizacao de modulos
- `src/pages/Permissions.tsx` - nova UI por plataforma
- `src/components/ClientDashboard.tsx` - mapas de metricas atualizados
- `src/hooks/usePermissions.tsx` - sem mudancas estruturais, apenas suporta novas chaves automaticamente

