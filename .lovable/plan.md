

# Corrigir campanhas duplicadas: dados obsoletos no banco

## Problema raiz

O banco de dados tem **6 campanhas** para a data 2026-02-19, mas a API do Meta retorna apenas **3 campanhas** atualmente. As 3 extras ("aquecimento de conta 05.02", "aquecimento de conta 05.02 -- Copia", "teste direto para o site") sao campanhas que foram renomeadas ou removidas no Meta, mas nunca foram apagadas do banco.

Isso acontece porque:

1. Todos os registros de campanhas no banco tem `external_campaign_id = null` (foram salvos antes dessa coluna ser usada)
2. A logica de limpeza tenta apagar por `external_campaign_id`, mas como o valor e null, nada e apagado
3. Novos registros sao inseridos ao lado dos antigos, gerando duplicatas

## Solucao

### Mudanca 1: Limpar campanhas antes de inserir (clean slate)

Na funcao de persistencia do edge function, antes de inserir as campanhas do dia, **apagar TODAS** as campanhas daquele cliente + data. Isso garante que campanhas renomeadas ou removidas no Meta sejam eliminadas.

```text
ANTES:
- Deleta por external_campaign_id (que e null) -> nao deleta nada
- Insere novas campanhas -> duplica com as antigas

DEPOIS:
- Deleta TODAS as campanhas do client_id + date
- Insere as campanhas atuais da API
```

### Mudanca 2: Restaurar triggerLiveSync no refresh

O `triggerLiveSync` foi removido no commit anterior para reduzir delay. Porem, ele e necessario para persistir os dados de HOJE (incluindo `external_campaign_id`). Sem ele, o banco nunca e atualizado durante o refresh manual.

A solucao: chamar `triggerLiveSync` de forma **nao bloqueante** (fire-and-forget), sem esperar o resultado antes de mostrar os dados ao usuario. Assim nao ha delay perceptivel.

### Mudanca 3: Limpar dados obsoletos existentes

Executar uma limpeza unica dos dados atuais deste cliente para remover campanhas duplicadas/obsoletas.

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Substituir delete-por-ID por delete-tudo-do-dia antes de inserir campanhas |
| `src/hooks/useAdsData.tsx` | Restaurar `triggerLiveSync` como fire-and-forget (sem await, sem delay) |

## Detalhes tecnicos

### Edge function: persistencia de campanhas

```text
ANTES (linhas 888-916):
1. Separa metaCampaigns (com external_campaign_id) e otherCampaigns
2. Para cada metaCampaign, deleta por external_campaign_id (null = nao deleta)
3. Insere novas linhas

DEPOIS:
1. Deleta TODAS as campanhas: DELETE FROM daily_campaigns WHERE client_id = X AND date = Y
2. Insere todas as campanhas de uma vez (sem precisar separar meta/other)
```

### Frontend: triggerLiveSync fire-and-forget

```text
ANTES: triggerLiveSync removido completamente
DEPOIS: triggerLiveSync chamado sem await no inicio do fetchData
  - Nao bloqueia a exibicao dos dados
  - Atualiza o banco em background para a proxima carga
  - Sem delay perceptivel para o usuario
```

### Limpeza de dados existentes

Deletar as campanhas obsoletas deste cliente que nao existem mais na API:
- "aquecimento de conta 05.02" (data 2026-02-19)
- "aquecimento de conta 05.02 -- Copia" (data 2026-02-19)
- "teste direto para o site" (data 2026-02-19)

Isso sera resolvido automaticamente na proxima sincronizacao apos a correcao, pois o clean slate vai apagar tudo e reinserir so o que a API retorna.

