-- =====================================================================
-- Hardening de segurança — isolamento multi-tenant + tabelas de apoio
-- =====================================================================
-- Contexto: auditoria encontrou RLS permissiva ("qualquer autenticado lê
-- tudo") em leads / meta_customers / meta_orders, e UNIQUE(email) global em
-- meta_customers (quebra multi-tenant). Esta migration corrige isso e cria
-- as tabelas de apoio que o hardening das edge functions passou a exigir
-- (oauth_states, webhook_events).
--
-- Segurança defensiva: idempotente e sem passos destrutivos cegos. A troca
-- de UNIQUE só é aplicada se NÃO houver duplicatas (caso contrário, avisa e
-- pula — dedupe manual antes de reaplicar). REVISAR contra o schema vivo
-- antes do `db push`.
--
-- Tenant boundary: client_manager_links(client_user_id, manager_id).
--   - client vê o que é dele:           <tabela>.client_id = auth.uid()
--   - manager vê de clientes ligados:    EXISTS link(manager_id=auth.uid())
--   - admin vê tudo:                     has_role(auth.uid(),'admin')
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) oauth_states — state opaco de uso único do fluxo OAuth (oauth-init)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  origin text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON public.oauth_states (expires_at);
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role (que ignora RLS) acessa. Ninguém mais lê.

-- ---------------------------------------------------------------------
-- 2) webhook_events — idempotência de webhooks (pagamento etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id uuid,
  source text NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_unique UNIQUE (client_id, idempotency_key)
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- Sem policies: só service_role.

-- ---------------------------------------------------------------------
-- 3) leads — remover SELECT permissiva, aplicar escopo por tenant
-- ---------------------------------------------------------------------
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.leads;

DROP POLICY IF EXISTS "leads_select_tenant" ON public.leads;
CREATE POLICY "leads_select_tenant" ON public.leads FOR SELECT TO authenticated
USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.client_manager_links l
             WHERE l.manager_id = auth.uid() AND l.client_user_id = leads.client_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "leads_write_manager" ON public.leads;
CREATE POLICY "leads_write_manager" ON public.leads FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.client_manager_links l
          WHERE l.manager_id = auth.uid() AND l.client_user_id = leads.client_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.client_manager_links l
          WHERE l.manager_id = auth.uid() AND l.client_user_id = leads.client_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
-- service_role continua com acesso total (ignora RLS).

CREATE INDEX IF NOT EXISTS idx_leads_client_email ON public.leads (client_id, email);

-- ---------------------------------------------------------------------
-- 4) meta_customers — escopo por tenant + UNIQUE(client_id,email)
-- ---------------------------------------------------------------------
ALTER TABLE public.meta_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view meta_customers" ON public.meta_customers;

DROP POLICY IF EXISTS "meta_customers_select_tenant" ON public.meta_customers;
CREATE POLICY "meta_customers_select_tenant" ON public.meta_customers FOR SELECT TO authenticated
USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.client_manager_links l
             WHERE l.manager_id = auth.uid() AND l.client_user_id = meta_customers.client_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Troca o UNIQUE(email) global por UNIQUE(client_id,email) — só se for seguro.
ALTER TABLE public.meta_customers DROP CONSTRAINT IF EXISTS meta_customers_email_key;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT client_id, email FROM public.meta_customers
      GROUP BY client_id, email HAVING count(*) > 1
    ) d
  ) THEN
    RAISE WARNING 'meta_customers: duplicatas (client_id,email) presentes — UNIQUE composta NAO aplicada. Faca dedupe e reaplique.';
  ELSE
    ALTER TABLE public.meta_customers
      ADD CONSTRAINT meta_customers_client_email_unique UNIQUE (client_id, email);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meta_customers_client_email ON public.meta_customers (client_id, email);

-- ---------------------------------------------------------------------
-- 5) meta_orders — escopo por tenant
-- ---------------------------------------------------------------------
ALTER TABLE public.meta_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view meta_orders" ON public.meta_orders;

DROP POLICY IF EXISTS "meta_orders_select_tenant" ON public.meta_orders;
CREATE POLICY "meta_orders_select_tenant" ON public.meta_orders FOR SELECT TO authenticated
USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.client_manager_links l
             WHERE l.manager_id = auth.uid() AND l.client_user_id = meta_orders.client_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_meta_orders_client_customer ON public.meta_orders (client_id, customer_id);

-- ---------------------------------------------------------------------
-- 6) Índices em colunas quentes (queries de relatório/listagem)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_daily_campaigns_client_date ON public.daily_campaigns (client_id, date);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_client_created ON public.analysis_reports (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_manager_links_manager ON public.client_manager_links (manager_id);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_manager_provider ON public.oauth_connections (manager_id, provider);
