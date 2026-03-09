

## Plano: Descobrir e usar corretamente eventos personalizados do Meta Ads para FTD

### Problema Identificado

O campo `ftd_event_name` está configurado como `"ftd"`, mas o Meta Ads usa `action_type` no formato:
- `offsite_conversion.fb_pixel_custom.NomeEvento` (eventos custom do Pixel)
- `offsite_conversion.custom.123456789` (conversões personalizadas por ID)

O sistema já tem a lógica correta para extrair o evento, mas o usuário não sabe o formato correto do `action_type`.

### Solução

Adicionar um botão "Descobrir Eventos" que busca os `action_types` disponíveis na conta do Meta e mostra em um modal/dropdown para seleção.

### Mudanças

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/fetch-ads-data/index.ts` | Adicionar action `list_custom_events` que retorna todos os action_types únicos encontrados nos insights da conta |
| `src/components/analysis/ClientAnalysisConfig.tsx` | Adicionar botão "Descobrir Eventos" ao lado do campo de FTD Meta que abre modal com lista de eventos disponíveis |
| `src/hooks/useClientAnalysisConfig.ts` | Adicionar função `fetchAvailableEvents` que chama a Edge Function |

### Implementação Técnica

**1. Edge Function - Nova action `list_custom_events`:**
```typescript
// Busca insights e retorna todos os action_types únicos
const insightsUrl = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=actions&date_preset=last_30d`;
// Extrai todos os action_types únicos e retorna
```

**2. Frontend - Modal de seleção:**
- Botão "Descobrir Eventos" ao lado do Input
- Modal com lista de todos os `action_types` encontrados nos últimos 30 dias
- Filtro para mostrar apenas eventos "custom" ou "conversion"
- Click para selecionar e preencher automaticamente o campo

### Fluxo do Usuário

1. Usuário clica em "Descobrir Eventos"
2. Sistema busca insights dos últimos 30 dias das contas Meta vinculadas ao cliente
3. Exibe lista de todos os `action_types` encontrados (com foco nos eventos custom/conversion)
4. Usuário clica no evento desejado → campo é preenchido automaticamente

