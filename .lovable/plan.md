

# Corrigir campanhas que só mostram dados de hoje

## Problema

Ao selecionar "Ontem e Hoje" (LAST_2_DAYS), as campanhas só aparecem para hoje. O banco confirma: `daily_campaigns` tem dados para 2026-02-19 mas **nenhum para 2026-02-18**.

Causa raiz: a persistência de campanhas no `fetch-ads-data` só salva quando `dateRange === "TODAY"`. Quando o dashboard pede LAST_2_DAYS, a chamada de background usa `last_2d` como preset do Meta, que retorna dados **agregados** (não por dia). Como o edge function vê que não é TODAY, não persiste nada. Resultado: ontem nunca é salvo.

O cron `sync-daily-metrics` deveria resolver isso (persiste D-1), mas ele ainda usa a lógica antiga de delete por `external_campaign_id` individual, e aparentemente não rodou para 2026-02-18.

## Solução

### Mudança 1: Persistir campanhas por dia no fetch-ads-data (não apenas TODAY)

Quando `dateRange` inclui dias anteriores (LAST_2_DAYS, LAST_7_DAYS, etc), o edge function deve buscar os dados **dia a dia** do Meta para cada dia no range e persistir cada dia separadamente. Para LAST_2_DAYS, isso significa buscar ontem e hoje como dois requests separados ao Meta.

Alternativamente (e mais simples): expandir a persistência para aceitar TODAY e também fazer uma chamada separada para YESTERDAY dentro do mesmo request, quando o range for LAST_2_DAYS.

A abordagem mais prática: **ao detectar que o range inclui hoje, persistir HOJE. Além disso, ao detectar que o range inclui ontem (LAST_2_DAYS), fazer um request ao Meta com time_range de ontem e persistir ontem também.**

### Mudança 2: Atualizar sync-daily-metrics para usar clean-slate

Aplicar a mesma lógica de "clean slate" (delete all + insert) que já está no `fetch-ads-data` para o `sync-daily-metrics`, garantindo consistência.

### Mudança 3: Persistir ontem agora via triggerLiveSync

Atualizar a função `triggerLiveSync` no frontend para também disparar uma chamada para YESTERDAY, garantindo que ao clicar em Atualizar, ontem também seja persistido.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Quando dateRange inclui ontem, buscar e persistir dados de ontem separadamente |
| `supabase/functions/sync-daily-metrics/index.ts` | Usar clean-slate (delete all + insert) para campanhas, igual ao fetch-ads-data |
| `src/hooks/useAdsData.tsx` | Adicionar chamada fire-and-forget para persistir YESTERDAY alem de TODAY |

## Detalhes técnicos

### fetch-ads-data: persistir ontem quando relevante

```text
ANTES:
- shouldPersist = dateRange === "TODAY"
- Só persiste campanhas do dia atual

DEPOIS:
- shouldPersist = dateRange === "TODAY" (persiste hoje)
- shouldPersistYesterday = dateRange === "LAST_2_DAYS" ou similar
- Para ontem: faz request separado ao Meta com time_range since/until = ontem
- Persiste campanhas de ontem com clean-slate
```

### sync-daily-metrics: clean-slate

```text
ANTES (linhas 349-375):
- Separa metaCamps e otherCamps
- Deleta individualmente por external_campaign_id
- Insere/upserta separadamente

DEPOIS:
- Delete ALL campanhas do client_id + date
- Insere todas de uma vez
```

### triggerLiveSync: chamada dupla

```text
ANTES:
- Dispara 1 chamada: date_range=TODAY

DEPOIS:
- Dispara 2 chamadas fire-and-forget:
  1. date_range=TODAY (persiste hoje)
  2. date_range=YESTERDAY com meta_time_range de ontem (persiste ontem)
```

## Resultado esperado

Ao selecionar LAST_2_DAYS:
- `daily_campaigns` terá dados de hoje E de ontem
- Compras, cadastros e mensagens serão a soma dos 2 dias
- O botão Atualizar garante que ambos os dias estejam atualizados no banco

