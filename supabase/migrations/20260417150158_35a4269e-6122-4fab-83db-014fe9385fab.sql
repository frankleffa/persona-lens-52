-- 1) Dedup daily_campaigns keeping the most recent row per natural key
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY client_id, account_id, platform, date, campaign_name
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.daily_campaigns
)
DELETE FROM public.daily_campaigns dc
USING ranked r
WHERE dc.id = r.id AND r.rn > 1;

-- 2) Dedup daily_metrics keeping the most recent row per natural key
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY client_id, account_id, platform, date
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.daily_metrics
)
DELETE FROM public.daily_metrics dm
USING ranked r
WHERE dm.id = r.id AND r.rn > 1;

-- 3) Unique indexes to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS daily_campaigns_natural_key_uidx
  ON public.daily_campaigns (client_id, account_id, platform, date, campaign_name);

CREATE UNIQUE INDEX IF NOT EXISTS daily_metrics_natural_key_uidx
  ON public.daily_metrics (client_id, account_id, platform, date);