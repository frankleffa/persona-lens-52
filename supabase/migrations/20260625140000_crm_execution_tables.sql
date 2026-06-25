-- =====================================================================
-- Tabelas do CRM (funil de vendas) e da Execução (kanban de tarefas)
-- =====================================================================
-- As tabelas legadas não servem: `leads` é captação (email/utm) e
-- `optimization_tasks` tem status TODO/IN_PROGRESS/DONE atrelado a
-- client_manager_links. Estas são por gestor (owner_id = auth.uid()),
-- então funcionam de imediato sem depender de clientes pré-cadastrados.

-- ── CRM: funil de novos clientes ──
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company text NOT NULL,
  contact text,
  value numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'Indicação',
  owner text,                 -- iniciais do responsável
  stage text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_leads_owner ON public.crm_leads;
CREATE POLICY crm_leads_owner ON public.crm_leads FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON public.crm_leads (owner_id, stage);

-- ── Execução: tarefas/otimizações da equipe ──
CREATE TABLE IF NOT EXISTS public.execution_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  client text,
  type text NOT NULL DEFAULT 'Otimização',
  priority text NOT NULL DEFAULT 'media',
  assignee text,
  due text,
  status text NOT NULL DEFAULT 'todo',
  done boolean NOT NULL DEFAULT false,
  overdue boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.execution_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS execution_tasks_owner ON public.execution_tasks;
CREATE POLICY execution_tasks_owner ON public.execution_tasks FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_execution_tasks_owner ON public.execution_tasks (owner_id, status);
