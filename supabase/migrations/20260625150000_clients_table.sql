-- =====================================================================
-- Carteira de clientes da agência (por gestor)
-- =====================================================================
-- Distinta de client_manager_links (que é o vínculo de login do portal).
-- Aqui é a "conta/marca" que o gestor administra. Métricas (score/spend/
-- roas) ficam em 0 até a sincronização das contas conectadas.
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  strategy text NOT NULL DEFAULT 'Performance',
  status text NOT NULL DEFAULT 'stable',
  score integer NOT NULL DEFAULT 70,
  platforms text[] NOT NULL DEFAULT '{}',
  spend numeric NOT NULL DEFAULT 0,
  roas numeric NOT NULL DEFAULT 0,
  delta numeric NOT NULL DEFAULT 0,
  last_sync text NOT NULL DEFAULT 'agora',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clients_owner ON public.clients;
CREATE POLICY clients_owner ON public.clients FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_clients_owner ON public.clients (owner_id, created_at DESC);
