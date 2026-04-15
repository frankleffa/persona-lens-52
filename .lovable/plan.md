

## Plano: Filtrar eventos GA4 por tráfego pago Meta e comparar com Meta Ads

### Problema
A aba "Eventos por UTM" mostra todos os sources (orgânico, direto, etc.), inflando os números. Para comparar com Meta Ads, precisa filtrar apenas sources do Meta (fb, ig, meta, an) e mostrar os totais lado a lado.

### Alterações

**1. `src/components/utm/UTMAnalyticsPanel.tsx`** — Filtrar e comparar:

- No `eventsByCampaignData` useMemo, filtrar `utmEventsByCampaign` para incluir apenas entries onde `source` normalizado é `fb`, `ig`, `instagram`, `meta`, `facebook` ou `an` (Audience Network)
- Adicionar uma seção de comparação acima da tabela com cards lado a lado:

```text
┌─────────────────────────┐  ┌─────────────────────────┐
│ Meta Ads (Atribuição)   │  │ GA4 (Tráfego Meta)      │
│ Compras: 260            │  │ purchase: 185            │
│ Cadastros: 371          │  │ sign_up: 220             │
│ FTD: 65                 │  │ first_deposit: 48        │
└─────────────────────────┘  └─────────────────────────┘
```

- Mostrar um indicador visual de diferença (%) entre cada métrica

**2. `src/components/ClientDashboard.tsx`** — Passar dados Meta para o painel:

- Extrair `metaPurchases`, `metaRegistrations`, `metaFtd` do `rawData.meta_ads` ou consolidado
- Passar novo prop `metaTotals={{ purchases, registrations, ftd }}` ao `UTMAnalyticsPanel`

**3. `src/components/utm/UTMAnalyticsPanel.tsx`** — Novo prop e interface:

```typescript
interface MetaTotals {
  purchases: number;
  registrations: number;
  ftd: number;
}

interface UTMAnalyticsPanelProps {
  data: GA4UTMEntry[];
  eventBreakdown?: GA4EventBreakdown[];
  utmEventsByCampaign?: GA4UTMEventEntry[];
  metaTotals?: MetaTotals;
}
```

**4. Mapeamento de eventos para comparação:**
- Meta `purchases` ↔ GA4 `purchase`
- Meta `registrations` ↔ GA4 `sign_up`
- Meta `ftd` ↔ GA4 `first_deposit` + `ftd`

### Detalhes técnicos

Set de sources Meta para filtro:
```typescript
const META_SOURCES = new Set(["fb", "ig", "instagram", "meta", "facebook", "an"]);
```

A comparação mostra a diferença como badge colorido:
- GA4 < Meta → amarelo (atribuição Meta mais agressiva)
- GA4 > Meta → azul (GA4 capturando mais)
- Diferença < 10% → verde (alinhado)

### Resultado
- A tabela "Eventos por UTM" mostra apenas campanhas do Meta
- Os gestores veem lado a lado: "O Meta diz 260 compras, mas pelo GA4 vieram 185 do tráfego Meta"
- A discrepância fica explicada visualmente com percentuais

