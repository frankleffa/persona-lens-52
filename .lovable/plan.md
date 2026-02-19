

# Corrigir campanhas duplicadas e GA4 ausente no dashboard

## Problema 1: Campanhas duplicadas apos renomeacao

### Causa raiz
A tabela `daily_campaigns` usa `campaign_name` como parte da chave de conflito no upsert (`client_id, account_id, platform, date, campaign_name`). Quando o nome de uma campanha muda no Meta Ads, o sistema cria uma nova linha com o novo nome, mantendo a linha antiga com o nome antigo. Ambas aparecem no dashboard.

### Solucao
Adicionar o `campaign_id` externo do Meta como identificador estavel. Isso requer:

1. **Adicionar coluna `external_campaign_id`** na tabela `daily_campaigns` (nullable, para manter compatibilidade)
2. **Capturar o `camp.id`** (ID da campanha no Meta) durante o fetch e gravar no campo
3. **Alterar a logica de upsert** para usar `external_campaign_id` quando disponivel, atualizando o `campaign_name` em vez de criar duplicata
4. **Limpar duplicatas existentes** no banco

### Arquivos modificados
- Migration SQL: adicionar coluna `external_campaign_id` e unique constraint
- `supabase/functions/fetch-ads-data/index.ts`: capturar `camp.id` do Meta, usar na persistencia
- `supabase/functions/sync-daily-metrics/index.ts`: mesma logica
- `supabase/functions/backfill-metrics/index.ts`: mesma logica (se aplicavel)

### Detalhes da migration
```text
1. ALTER TABLE daily_campaigns ADD COLUMN external_campaign_id text;
2. CREATE UNIQUE INDEX ON daily_campaigns (client_id, account_id, platform, date, external_campaign_id) 
   WHERE external_campaign_id IS NOT NULL;
3. DELETE duplicatas antigas (manter apenas a mais recente por campaign)
```

### Logica de persistencia atualizada
Em vez de usar `campaign_name` no onConflict, o sistema fara:
- Se `external_campaign_id` disponivel: upsert por `client_id, account_id, platform, date, external_campaign_id` -- atualizando o nome se mudou
- Senao (Google Ads): manter logica atual por `campaign_name`

---

## Problema 2: GA4 nao aparece no dashboard

### Causa raiz
O preset `LAST_2_DAYS` (adicionado na ultima alteracao) esta **ausente** dos mapeamentos de `ga4Range` e `metaPreset` na funcao de live sync do `useAdsData.tsx`. Isso causa o erro:

```
TypeError: Cannot read properties of undefined (reading 'start')
```

O GA4 so recebe dados via chamada ao vivo (nao e persistido no `daily_metrics`), entao quando o live sync falha, o GA4 nunca aparece.

### Solucao
Adicionar `LAST_2_DAYS` em **todos** os mapeamentos de preset no `useAdsData.tsx`:

- Linha ~254: mapeamento `ga4Range` no fallback (sem dados persistidos)
- Linha ~260: mapeamento `metaPreset` no fallback
- Linha ~458: mapeamento `ga4Range2` no live sync em background
- Linha ~464: mapeamento `metaPreset2` no live sync em background
- Linha ~248: mapeamento `expectedDaysMap`

### Arquivo modificado
- `src/hooks/useAdsData.tsx`

### Valores para LAST_2_DAYS
```text
ga4Range:    { start: "yesterday", end: "today" }
metaPreset:  "last_2d"  (ou usar time_range com since/until)
expectedDays: 2
```

---

## Resumo das mudancas

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Adicionar `external_campaign_id`, unique index, limpar duplicatas |
| `supabase/functions/fetch-ads-data/index.ts` | Capturar `camp.id`, usar no upsert de campanhas |
| `supabase/functions/sync-daily-metrics/index.ts` | Mesma logica de `external_campaign_id` |
| `src/hooks/useAdsData.tsx` | Adicionar `LAST_2_DAYS` em todos os mapeamentos de preset |

