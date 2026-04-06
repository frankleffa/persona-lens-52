ALTER TABLE public.daily_campaigns ADD COLUMN IF NOT EXISTS profile_visits bigint DEFAULT 0;
ALTER TABLE public.daily_campaigns ADD COLUMN IF NOT EXISTS followers bigint DEFAULT 0;