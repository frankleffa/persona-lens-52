

## Plano: Atribuição de Primeiro Toque (Origem Real do Usuário)

### Problema
Hoje todas as queries GA4 usam `sessionSource`/`sessionMedium` (last-click por sessão). Se um usuário clicou num anúncio Meta na segunda-feira mas converteu na quarta via acesso direto, o GA4 atribui a conversão a "(direct)" — e o Meta some da contagem.

### Solução: Dimensões `firstUserSource` / `firstUserMedium`

O GA4 Data API oferece dimensões de **primeiro toque**:
- `firstUserSource` — o source da primeira sessão do usuário
- `firstUserMedium` — o medium da primeira sessão
- `firstUserCampaignName` — a campanha da primeira sessão

Vamos adicionar uma **5ª query GA4** que cruza eventos com essas dimensões, e mostrar os resultados numa nova aba "Origem Real".

### Alterações

**1. Edge Function `fetch-ads-data/index.ts`** — Nova query GA4 (5ª):

- Mesma estrutura da query 4 (eventos por UTM), mas trocando:
  - `sessionSource` → `firstUserSource`
  - `sessionMedium` → `firstUserMedium`
  - `sessionCampaignName` → `firstUserCampaignName`
- Retornar como `first_touch_events: [{ eventName, source, medium, campaign, count }]`
- Sem filtro de `isPaidMedium` — para capturar todos os first-touch, inclusive os que converteram via direto/orgânico mas vieram originalmente de ads

**2. Tipos (`useAdsData.tsx`)** — Adicionar:
- `first_touch_events: GA4UTMEventEntry[]` em `GA4Data`

**3. `UTMAnalyticsPanel.tsx`** — Nova aba "Origem Real":

```text
┌───────────┬──────────┬──────────────┬──────────┬─────────┬─────┬───────┐
│ Campanha  │ Source   │ Cadastro     │ Checkout │ Compra  │ FTD │ Total │
│           │ (1st)    │ (sign_up)    │          │         │     │       │
├───────────┼──────────┼──────────────┼──────────┼─────────┼─────┼───────┤
│ RODOVIA   │ meta     │ 22           │ 55       │ 28      │ 9   │ 114   │
│ UNICA     │ facebook │ 11           │ 38       │ 15      │ 4   │ 68    │
└───────────┴──────────┴──────────────┴──────────┴─────────┴─────┴───────┘
```

- Filtrar por META_SOURCES (fb, ig, meta, an) como na aba existente
- Adicionar cards de comparação com 3 colunas:
  - **Meta Ads** (atribuição Meta)
  - **GA4 Last-Click** (sessão — dados existentes da aba "Eventos por UTM")
  - **GA4 First-Touch** (origem real — dados novos)
- Isso permite ver: "O Meta diz 260 compras. Last-click GA4 vê 185. Mas pela origem real (first-touch), 220 vieram do Meta"

**4. `ClientDashboard.tsx`** — Passar `firstTouchEvents` como novo prop ao `UTMAnalyticsPanel`

### Detalhes técnicos

Dimensões GA4 disponíveis:
- `firstUserSource` — source da aquisição do usuário
- `firstUserMedium` — medium da aquisição
- `firstUserCampaignName` — campanha da aquisição

A comparação de 3 colunas mostra o "funil de atribuição":
- Meta Ads (7d click/1d view) → número mais alto (atribuição agressiva)
- GA4 First-Touch → número intermediário (captura quem veio do Meta mesmo convertendo depois via direto)
- GA4 Last-Click → número mais baixo (só conta se a sessão de conversão foi do Meta)

### Resultado
- Nova aba "Origem Real" mostra a primeira fonte de cada usuário que converteu
- Comparação tripla (Meta × First-Touch × Last-Click) explica a jornada completa
- Gestores entendem que "o Meta trouxe 220 usuários que compraram, mesmo que 35 deles tenham convertido via acesso direto depois"

