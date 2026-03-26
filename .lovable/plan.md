

## Plano: Corrigir painel de conversões para mostrar todos os dados

### Problema identificado

O painel de conversões (por hora e por GEO) usa `.find()` no array de `metricRows` para pegar dados de hourly/geo do banco. Isso retorna **apenas o primeiro dia** que tem `hourly_data` preenchido. Quando o período selecionado abrange mais de 1 dia (ex: "Últimos 2 dias", "Últimos 7 dias"), os dados dos outros dias são ignorados.

```text
Fluxo atual (quebrado):
  metricRows = [dia1, dia2, dia3, ...]
  hourly = metricRows.find(r => r.hourly_data)  ← pega SÓ dia1
  
Fluxo correto:
  metricRows = [dia1, dia2, dia3, ...]
  hourly = merge(dia1.hourly_data + dia2.hourly_data + ...)  ← soma tudo
```

### Correção

**Arquivo: `src/hooks/useAdsData.tsx`** (função `buildAdsDataResult`, linhas ~202-233)

1. **Hourly data**: em vez de `.find()`, iterar sobre todos os `metricRows` que possuem `hourly_data` e **somar** os valores por hora
2. **Geo data**: mesmo tratamento — iterar e somar `purchases`, `registrations`, `messages`, `spend` por país/estado/cidade

### Detalhes técnicos

- Criar helper `mergeHourlyData(rows)`: percorre todos os rows, para cada hora soma purchases, registrations e messages
- Criar helper `mergeGeoData(rows, level)`: percorre todos os rows, para cada geo entry soma as métricas
- Substituir os 4 blocos de `.find()` (hourly, geo country, geo region, geo city) pelos helpers

### Arquivo alterado
- `src/hooks/useAdsData.tsx` — substituir `.find()` por merge/soma nos blocos de hourly e geo

