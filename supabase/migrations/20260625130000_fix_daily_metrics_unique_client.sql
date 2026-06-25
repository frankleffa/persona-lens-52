-- =====================================================================
-- Bug fix: métricas "sumindo" por chave única incompleta em daily_metrics
-- =====================================================================
-- Problema: o índice único era (account_id, platform, date) SEM client_id,
-- enquanto client_id é NOT NULL. Quando uma mesma conta de anúncios é
-- compartilhada por dois clientes, o upsert de um SOBRESCREVE a linha do
-- outro (mesma chave) → as métricas de um cliente desaparecem.
--
-- Correção: a unicidade passa a incluir client_id. Os upserts das edge
-- functions também passam a usar onConflict client_id,account_id,platform,date.
--
-- Dedupe defensivo antes de recriar o índice (no projeto novo está vazio,
-- mas mantém a migration segura para qualquer base).
-- =====================================================================

-- Remove duplicatas que quebrariam o novo índice (mantém a mais recente).
DELETE FROM public.daily_metrics a
USING public.daily_metrics b
WHERE a.ctid < b.ctid
  AND a.client_id = b.client_id
  AND a.account_id = b.account_id
  AND a.platform = b.platform
  AND a.date = b.date;

DROP INDEX IF EXISTS public.daily_metrics_unique;
CREATE UNIQUE INDEX IF NOT EXISTS daily_metrics_unique
  ON public.daily_metrics (client_id, account_id, platform, date);
