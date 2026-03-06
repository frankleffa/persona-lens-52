ALTER TABLE public.daily_metrics 
  ADD COLUMN IF NOT EXISTS purchases bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registrations bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads bigint DEFAULT 0;