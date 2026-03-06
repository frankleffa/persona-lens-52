

## Plano: Persistir dados GEO no banco de dados

### Objetivo
Salvar dados de conversões geográficas (país, estado, cidade) no banco para que não dependam da chamada live, similar ao que foi feito com `hourly_data`.

### Mudanças

**1. Migração SQL**
- Adicionar coluna `geo_data jsonb DEFAULT NULL` na tabela `daily_metrics`
- Armazenará um objeto com 3 chaves: `{ country: {...}, region: {...}, city: {...} }`

**2. Edge Function `fetch-ads-data`**
- Após a seção de persistência de hourly_data (linha ~921), adicionar bloco similar para persistir `geo_data`
- Salvar quando `shouldPersistToday || dateRange === "YESTERDAY"`, mesmo padrão do hourly
- Formato: `{ country: geoByCountry, region: geoByRegion, city: geoByCity }`

**3. Frontend `src/hooks/useAdsData.tsx`**
- Na função `buildResultFromDB` (linhas 189-190), extrair `geo_data` das rows do banco em vez de retornar `null`
- Desmembrar em `geo_conversions`, `geo_conversions_region` e `geo_conversions_city`

**4. Sem quebra de dados existentes**
- Coluna nullable com DEFAULT NULL — dados antigos continuam funcionando
- O enrich live continua como fallback quando não há dados no banco

