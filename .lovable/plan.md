
Resposta curta: vou fazer **(C) Ambos** — limpar duplicatas e prevenir, e também investigar o evento Meta de FTD.

## Plano

### 1. Deduplicação `daily_campaigns` (estrutural)
- **Migration**: 
  - DELETE das linhas duplicadas mantendo só a mais recente por `(client_id, account_id, platform, date, campaign_name)` usando `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY updated_at DESC)`.
  - Adicionar `UNIQUE INDEX` em `(client_id, account_id, platform, date, campaign_name)` para bloquear duplicatas futuras.
- **Edge functions** (`fetch-ads-data`, `sync-daily-metrics`, `backfill-metrics`): trocar `.insert()` por `.upsert(..., { onConflict: 'client_id,account_id,platform,date,campaign_name' })` em todos os pontos que gravam em `daily_campaigns`.

### 2. Mesma proteção em `daily_metrics`
Já é feito upsert lá em algumas funções, mas vou padronizar com `onConflict: 'client_id,account_id,platform,date'` e garantir UNIQUE INDEX equivalente para evitar o mesmo problema em métricas-conta.

### 3. Investigação do evento FTD
- Consultar `client_analysis_config` desse cliente: `ftd_event_name` está como `offsite_conversion.custom.880112445061036`.
- Validar via Meta Graph API que esse Custom Event ID realmente representa "First Time Deposit" e não todos os depósitos. Vou listar para você os event_names disponíveis na conta e os volumes dos últimos 7d para você escolher o correto. Caso o evento custom 880112445061036 esteja capturando todos depósitos, recomendarei criar/escolher um evento Meta dedicado a 1º depósito (ex: `offsite_conversion.custom.<id_FTD_real>`).

### 4. Reprocessar histórico
Após corrigir o conflito de upsert e (se aplicável) o `ftd_event_name`, rodar o **Reprocessar Histórico** (30d) do Agency Control para repopular a campanha "AVE | TOPO | FTD | CBO | 15.04 — Cópia" com os valores corretos.

### Resultado esperado
- Linha única por campanha/dia em `daily_campaigns`.
- FTD da campanha refletindo apenas 1º depósito (deve cair de 22 para ~2).
- Card de oportunidade da IA recalcula com ROAS e Custo/FTD reais.

