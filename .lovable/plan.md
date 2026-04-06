

## Plano: Filtrar campanhas pausadas da análise de IA

### Problema
Existem dois caminhos de dados para a IA, e apenas um filtra corretamente:

1. **`analyze-client` (live Meta API)** — já filtra `effective_status=ACTIVE` na linha 134. Correto.
2. **`analyze-client` (fallback DB)** — busca `daily_campaigns` sem filtro de status. Inclui campanhas pausadas.
3. **`deep-analysis`** — busca `daily_campaigns` do banco sem nenhum filtro de status (linha 813-819). Inclui todas as campanhas, ativas e pausadas.

Resultado: quando a análise usa dados do banco (deep-analysis sempre usa, analyze-client quando a live API falha), campanhas pausadas entram na análise e poluem os insights.

### Solução

#### 1. `supabase/functions/deep-analysis/index.ts`
- Na query de `daily_campaigns` (linha 813-819), adicionar filtro `.neq("campaign_status", "PAUSED")` para excluir campanhas pausadas
- Alternativamente, filtrar no código após a query: remover rows onde `campaign_status` é `PAUSED`, `paused`, ou similar
- A abordagem mais segura é filtrar no código (pós-query), pois o campo `campaign_status` pode ter valores variados como "Pausada", "PAUSED", "paused"

#### 2. `supabase/functions/analyze-client/index.ts`
- No fallback DB (`buildDbPrompt`), a função `buildDbPrompt` recebe `campaignData` sem filtro — adicionar filtro no código para remover campanhas com status pausado antes de agregar
- Filtrar: excluir rows onde `campaign_status` contém "paus" (case insensitive) ou é exatamente "PAUSED"

#### 3. Adicionar contexto no prompt
- Na seção de campanhas do prompt, informar a IA que **apenas campanhas ativas** estão incluídas, para que ela não tente analisar campanhas que o gestor já desativou

### Detalhes técnicos
Os valores de `campaign_status` no banco podem ser: `"Ativa"`, `"ACTIVE"`, `"PAUSED"`, `"Pausada"`. O filtro será case-insensitive, excluindo qualquer status que contenha "paus" ou seja "PAUSED".

