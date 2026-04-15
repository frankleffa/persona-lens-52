

## Plano: Reorganizar seção GA4 e mostrar eventos por UTM

### Problema atual
- O event breakdown mostra apenas totais globais (ex: 121 purchases, 107 sign_ups) sem cruzar com UTMs
- Não é possível saber qual campanha/source gerou quais eventos específicos
- A seção está desorganizada — summary cards, event breakdown e tabelas sem hierarquia clara

### Alterações

**1. Nova query GA4 no edge function (`fetch-ads-data/index.ts`)**

Adicionar uma 4ª query GA4 que cruza `eventName` com `sessionSource` + `sessionMedium` + `sessionCampaignName`:
- Dimensões: `eventName`, `sessionSource`, `sessionMedium`, `sessionCampaignName`
- Métrica: `eventCount`
- Filtro: apenas os RELEVANT_EVENTS já definidos
- Retornar como `utm_events_by_campaign: [{ eventName, source, medium, campaign, count }]`
- Aplicar o mesmo filtro `isPaidMedium` para manter apenas tráfego pago

**2. Atualizar tipos (`useAdsData.tsx`)**

Novo tipo:
```
GA4UTMEventEntry { eventName, source, medium, campaign, count }
```
Propagar via `GA4Data` e passar ao componente.

**3. Refatorar `UTMAnalyticsPanel.tsx`** — Nova estrutura de abas:

- **Visão Geral**: Summary cards (sessões, usuários, conversões totais) + Event breakdown cards (já existente)
- **Por Campanha**: Tabela atual de campanhas (source/medium/campaign/sessões/usuários/conv/taxa) — sem mudança
- **Eventos por UTM** (NOVA): Tabela cruzada mostrando por campanha quais eventos ocorreram:

```text
┌──────────────┬───────────┬───────────┬─────────┬──────────────┬─────────┐
│ Campanha     │ Cadastro  │ Início    │ Compra  │ FTD          │ Total   │
│              │ (sign_up) │ Depósito  │         │              │         │
├──────────────┼───────────┼───────────┼─────────┼──────────────┼─────────┤
│ RODOVIA V2   │ 15        │ 42        │ 18      │ 6            │ 81      │
│ UNICA AVES   │ 8         │ 31        │ 12      │ 3            │ 54      │
└──────────────┴───────────┴───────────┴─────────┴──────────────┴─────────┘
```

- **Canais**: Tabela agregada por source (já existente)
- **Diagnóstico**: Alertas de qualidade + campanhas ineficientes (já existente)

**4. Manter o EventBreakdownCards** na aba "Visão Geral" como resumo rápido dos totais.

### Resultado
- Gestores verão exatamente quais eventos cada campanha está gerando no GA4
- A tabela "Eventos por UTM" responde diretamente "de onde vêm meus sign_ups, checkouts, purchases e FTDs"
- As colunas da tabela são dinâmicas — só aparecem os eventos que existem nos dados
- Os nomes dos eventos são traduzidos usando o EVENT_NAME_MAP existente

