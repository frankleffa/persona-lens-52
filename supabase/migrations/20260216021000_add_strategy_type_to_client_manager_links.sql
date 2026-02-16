DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'client_strategy_type'
  ) THEN
    CREATE TYPE public.client_strategy_type AS ENUM ('REVENUE', 'DEMAND', 'MESSAGE');
  END IF;
END
$$;

ALTER TABLE public.client_manager_links
ADD COLUMN IF NOT EXISTS strategy_type public.client_strategy_type NOT NULL DEFAULT 'DEMAND';
