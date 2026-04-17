

## Causa raiz confirmada

A função `backfill-metrics` ignora o `ftd_event_name` configurado e grava `ftd = purchases` (conta) e `ftd = campPurchases` (campanha). Quando você roda "Reprocessar Histórico", ela sobrescreve os FTDs corretos do `sync-daily-metrics` com o total de compras.

Evidência no banco para a campanha em questão (16/04):
- Sync diário (06:00): `ftd=0, purchases=22` ✓ correto
- Backfill manual (14:49): `ftd=22, purchases=22` ✗ sobrescrito errado

## Plano de correção

### 1. Corrigir `supabase/functions/backfill-metrics/index.ts`
Replicar a lógica que já existe em `fetch-ads-data` / `sync-daily-metrics`:
- Importar/definir `extractMetaCustomAction(actions, eventName)`.
- No bloco Meta (conta), trocar `ftd: purchases` por `ftd = ftdEventName ? extractMetaCustomAction(actions, ftdEventName) : 0` e recalcular `cost_per_ftd` com base nesse `ftd`.
- No bloco Meta (campanha), trocar `ftd: campPurchases` pela mesma lógica usando `actions` da campanha.
- No bloco Google (conta e campanha), respeitar `ftd_google_conversion_name` quando configurado, em vez de `Math.round(conversions)`.

### 2. Reprocessar a campanha afetada
Após o fix, rodar novamente o "Reprocessar Histórico" (30d) do cliente Cravei para que o `ftd` da campanha "AVE | TOPO | FTD | CBO | 15.04 — Cópia" volte para o valor real (~2).

### 3. Validação
- Confirmar via SQL: `ftd` por dia bate com o evento custom 880112445061036 no Gerenciador Meta.
- Card de oportunidade da IA recalcula com Custo/FTD e ROAS reais.

### Resultado esperado
FTD da campanha cai de 22 para ~2; demais campanhas do cliente também ficam corretas; backfill futuro não corrompe mais o dado.

