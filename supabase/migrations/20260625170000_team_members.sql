-- Equipe da agência (membros do gestor). Convite cria registro "pendente";
-- o envio de e-mail real depende de SMTP e será adicionado depois.
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'gestor',
  clients integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  last_active text NOT NULL DEFAULT '—',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_members_owner ON public.team_members;
CREATE POLICY team_members_owner ON public.team_members FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_team_members_owner ON public.team_members (owner_id, created_at);
