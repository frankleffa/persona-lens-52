
-- Add Evolution API columns to whatsapp_connections
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS instance_name text,
  ADD COLUMN IF NOT EXISTS instance_id text,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'evolution';

-- Make Meta-specific columns nullable
ALTER TABLE public.whatsapp_connections
  ALTER COLUMN business_id DROP NOT NULL,
  ALTER COLUMN waba_id DROP NOT NULL,
  ALTER COLUMN phone_number_id DROP NOT NULL,
  ALTER COLUMN access_token DROP NOT NULL;

-- Drop whatsapp_pending_connections table (no longer needed)
DROP TABLE IF EXISTS public.whatsapp_pending_connections;
