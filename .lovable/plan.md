

# Corrigir campanhas duplicadas e reduzir delay no refresh

## Problemas

### 1. Campanhas duplicadas
A agregacao na linha 317 usa `campaign_name` como chave. Porem, campanhas de contas diferentes com o mesmo nome sao mescladas incorretamente, e campanhas da mesma conta com nomes ligeiramente diferentes aparecem duplicadas. O campo `external_campaign_id` (adicionado na migracao anterior) nao esta sendo usado na agregacao.

### 2. Delay no refresh
Ao clicar em Atualizar, o sistema faz **duas chamadas** ao edge function:
- `triggerLiveSync(clientId)` com `date_range=TODAY` (persiste dados)
- Live sync completo com o range selecionado (busca GA4/hourly/geo)

Ambas sao chamadas pesadas ao mesmo edge function. A segunda espera a primeira terminar implicitamente (competem por recursos).

## Solucao

### Mudanca 1: Deduplicar campanhas usando external_campaign_id + source

Alterar a chave de agregacao de `campaign_name` para uma chave composta: `external_campaign_id` (quando disponivel) ou `campaign_name + source` como fallback. Isso garante que:
- Campanhas com mesmo nome mas de contas/plataformas diferentes nao se mesclem
- Campanhas com o mesmo ID externo (mesmo que renomeadas) nao dupliquem

```text
ANTES:  campaignMap.get(row.campaign_name)
DEPOIS: campaignMap.get(row.external_campaign_id || `${row.campaign_name}__${row.source}`)
```

### Mudanca 2: Remover triggerLiveSync duplicado

Remover a chamada separada a `triggerLiveSync(clientId)` no fluxo de refresh. Em vez disso, quando o range inclui hoje (TODAY, LAST_2_DAYS, etc), o live sync em background ja busca os dados atuais. A persistencia de TODAY ja e feita pelo cron automatico (`sync-daily-metrics`), entao nao precisa ser forcada a cada refresh.

Isso elimina uma chamada de API inteira, cortando o delay pela metade.

### Mudanca 3: Timeout no live sync background

Adicionar um `AbortController` com timeout de 15 segundos no live sync em background, para que dados lentos nao bloqueiem a experiencia.

## Arquivo modificado

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useAdsData.tsx` | Chave de agregacao composta para campanhas; remover `triggerLiveSync`; adicionar timeout |

## Detalhes tecnicos

### Agregacao de campanhas (correcao)

```text
// Tipo do campo que vem do banco agora inclui external_campaign_id
interface CampaignRow {
  campaign_name: string;
  external_campaign_id?: string;
  source: string;
  // ... demais campos
}

// Chave composta para deduplicacao
const dedupeKey = row.external_campaign_id
  ? `${row.external_campaign_id}__${row.source}`
  : `${row.campaign_name}__${row.source}`;

campaignMap.get(dedupeKey);  // em vez de campaignMap.get(row.campaign_name)
```

### Fluxo de refresh otimizado

```text
ANTES:
1. Carrega dados do banco
2. Mostra dados do banco
3. Chama triggerLiveSync(TODAY) -- LENTO, ~5-10s
4. Chama live sync(LAST_2_DAYS) -- LENTO, ~5-10s
5. Merge GA4/hourly/geo

DEPOIS:
1. Carrega dados do banco
2. Mostra dados do banco
3. Chama live sync(LAST_2_DAYS) com timeout 15s -- unica chamada
4. Merge GA4/hourly/geo
```

