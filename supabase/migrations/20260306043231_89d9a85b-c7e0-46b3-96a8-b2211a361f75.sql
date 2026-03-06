
ALTER TABLE public.daily_metrics ADD COLUMN IF NOT EXISTS ftd bigint DEFAULT 0;
ALTER TABLE public.daily_metrics ADD COLUMN IF NOT EXISTS cost_per_ftd numeric DEFAULT 0;
ALTER TABLE public.daily_campaigns ADD COLUMN IF NOT EXISTS ftd bigint DEFAULT 0;
