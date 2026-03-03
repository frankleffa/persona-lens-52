

# Mostrar quantidade de conjuntos de anúncios por campanha

## Problema

O sistema atualmente busca apenas campanhas da API Meta, mas nunca busca os conjuntos de anúncios (ad sets) associados. Para o cliente Brasil Bitcoin, que tem uma campanha com vários conjuntos, não há como saber quantos conjuntos existem.

## Solução

Adicionar uma chamada à API Meta para contar os ad sets ativos de cada campanha, e exibir essa contagem na tabela de campanhas.

### Mudança 1: Buscar contagem de ad sets no `fetch-ads-data`

No loop de campanhas Meta (linha ~238), após buscar os insights de cada campanha, fazer uma chamada adicional para contar os ad sets ativos:

```
GET https://graph.facebook.com/v19.0/{campaign_id}/adsets?fields=id&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=0&summary=true
```

Usar `summary=true` com `limit=0` retorna apenas o `total_count` sem carregar dados, minimizando o impacto na API. Adicionar o campo `adset_count` ao objeto de campanha retornado.

### Mudança 2: Persistir `adset_count` em `daily_campaigns`

Adicionar coluna `adset_count` (integer, default 0) à tabela `daily_campaigns` via migration. Persistir o valor junto com os demais dados da campanha.

### Mudança 3: Exibir na tabela de campanhas

No `CampaignTable.tsx`, adicionar uma coluna "Conjuntos" que mostra o `adset_count` de cada campanha. Exibir como badge ao lado do nome ou como coluna separada.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Buscar contagem de ad sets por campanha Meta |
| Migration SQL | Adicionar coluna `adset_count` em `daily_campaigns` |
| `src/components/CampaignTable.tsx` | Exibir contagem de conjuntos na tabela |
| `src/hooks/useAdsData.tsx` | Passar `adset_count` no objeto de campanha |

