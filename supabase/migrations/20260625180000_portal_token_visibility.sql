-- Acesso do cliente ao portal via link com token + visibilidade por cliente.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS portal_visible jsonb NOT NULL DEFAULT '{"Meta":true,"Google":true,"GA4":true}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_portal_token ON public.clients (portal_token);
