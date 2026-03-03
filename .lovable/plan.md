

# Adicionar contagem de anúncios por campanha

## Objetivo
Além da contagem de conjuntos (ad sets), buscar e exibir a contagem de anúncios (ads) ativos por campanha. O badge mostrará algo como "4 conjuntos · 12 anúncios".

## Mudanças

### 1. Edge Function (`fetch-ads-data/index.ts`)
Após a chamada que busca ad sets, adicionar uma chamada similar para contar os ads ativos:
```
GET /{campaign_id}/ads?fields=id&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=1&summary=true
```
Retornar `ad_count` junto com `adsetCount`.

### 2. Migration SQL
Adicionar coluna `ad_count` (integer, default 0) na tabela `daily_campaigns`.

### 3. Persistência
No upsert de `daily_campaigns`, incluir `ad_count`.

### 4. Hook `useAdsData.tsx`
Passar `ad_count` no objeto de campanha para o frontend.

### 5. `CampaignTable.tsx`
Atualizar o badge para mostrar ambas as contagens: "4 conjuntos · 12 anúncios". Adicionar `ad_count` à interface `Campaign`.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Buscar contagem de ads via Meta API |
| Migration SQL | Adicionar coluna `ad_count` |
| `src/hooks/useAdsData.tsx` | Passar `ad_count` ao frontend |
| `src/components/CampaignTable.tsx` | Exibir "X conjuntos · Y anúncios" no badge |

