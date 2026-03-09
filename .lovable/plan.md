

## Problema

A descoberta de eventos Meta não encontra **conversões personalizadas** porque:
1. A busca atual usa `/insights?fields=actions` - que mostra apenas eventos que **já ocorreram** nas campanhas
2. **Conversões personalizadas** (Custom Conversions) são objetos separados na API Meta e precisam ser buscadas via `/customconversions` endpoint
3. Eventos personalizados do Pixel (`fb_pixel_custom`) também podem não aparecer se nenhuma campanha os disparou no período

## Solução

Expandir o `list_custom_events` para buscar de **duas fontes**:

| Fonte | Endpoint | O que retorna |
|-------|----------|---------------|
| Actions (atual) | `/{account}/insights?fields=actions` | Eventos que aconteceram nos últimos 30 dias |
| **Custom Conversions (novo)** | `/{account}/customconversions` | Todas as conversões personalizadas configuradas na conta |

## Implementação

**Edge Function `fetch-ads-data/index.ts`:**

```typescript
// Buscar Custom Conversions (conversões personalizadas)
const customConversionsUrl = `https://graph.facebook.com/v19.0/${accountId}/customconversions?fields=id,name,pixel,rule,custom_event_type&access_token=${token}`;
const ccRes = await fetch(customConversionsUrl);
const ccData = await ccRes.json();

// Adicionar ao conjunto de eventos com o formato correto
// ID da conversão personalizada: offsite_conversion.custom.{ID}
for (const cc of ccData.data || []) {
  allActionTypes.add({
    action_type: `offsite_conversion.custom.${cc.id}`,
    name: cc.name,          // Nome legível da conversão
    is_custom: true,
    is_conversion: true,
  });
}
```

## Mudança na UI

O modal de seleção vai mostrar o **nome** da conversão personalizada além do `action_type`, facilitando identificação:

```
FTD (offsite_conversion.custom.123456)  [custom] [conv]
```

