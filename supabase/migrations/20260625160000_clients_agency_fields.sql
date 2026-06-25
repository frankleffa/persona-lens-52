-- Campos extras usados pela Central de Controle / Portal do cliente.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS manager text,
  ADD COLUMN IF NOT EXISTS accounts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_tasks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portal text NOT NULL DEFAULT 'sem-acesso',
  ADD COLUMN IF NOT EXISTS contact_email text;
