
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_id UUID;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_email_key;

ALTER TABLE public.leads ADD CONSTRAINT leads_client_email_unique UNIQUE (client_id, email);
