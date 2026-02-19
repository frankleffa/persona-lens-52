
ALTER TABLE public.daily_campaigns 
  ADD COLUMN IF NOT EXISTS purchases bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registrations bigint DEFAULT 0;
