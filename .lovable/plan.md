

## Plano: Usar campanhas ao vivo no merge de enrichment

### Problema
A tabela "Campanhas Ativas" usa `data.consolidated.all_campaigns`, que vem de `buildResultFromDB()` — ou seja, do banco (`daily_campaigns`). O merge de enrichment (linhas 411-426) atualiza GA4, hourly, geo e os totais das plataformas, mas **não atualiza `all_campaigns`**.

Resultado: a tabela mostra apenas campanhas do banco (somente Mar 5, sem Mar 4), enquanto a API ao vivo retorna campanhas agregadas de 2 dias com os valores corretos (113 compras vs 71).

Dados concretos do network:
- DB `daily_campaigns`: só tem registros de Mar 5 (71 purchases total)
- Live API: retorna `consolidated.all_campaigns` com 9 campanhas e 113 purchases total (período completo de 2 dias)

### Correção

**`src/hooks/useAdsData.tsx`** — No merge de enrichment (linha 420), adicionar merge das campanhas ao vivo quando disponíveis:

```typescript
consolidated: base.consolidated ? {
  ...base.consolidated,
  conversion_rate: live.ga4?.conversion_rate ?? base.consolidated.conversion_rate,
  sessions: live.ga4?.sessions ?? base.consolidated.sessions,
  events: live.ga4?.events ?? base.consolidated.events,
  // Use live campaigns when available (they have correct aggregated data)
  all_campaigns: live.consolidated?.all_campaigns?.length
    ? live.consolidated.all_campaigns
    : base.consolidated.all_campaigns,
} : base.consolidated,
```

Quando a enrichment query retorna `consolidated.all_campaigns` com dados (o que acontece — vide network response), substitui os dados do banco. Isso garante que a tabela mostre os valores corretos da API.

### Resumo

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAdsData.tsx` | No merge de enrichment, substituir `all_campaigns` pelos dados ao vivo quando disponíveis |

Uma linha de mudança. Sem impacto no backend.

