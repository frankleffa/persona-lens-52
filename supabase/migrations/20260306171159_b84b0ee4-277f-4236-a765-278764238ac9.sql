
-- 1. client_analysis_config
CREATE TABLE public.client_analysis_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  vertical text NOT NULL DEFAULT 'ecommerce',
  primary_metric text NOT NULL DEFAULT 'purchases',
  primary_metric_label text NOT NULL DEFAULT 'Compras',
  cpa_target numeric,
  roas_target numeric,
  monthly_budget numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_analysis_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage client analysis config"
ON public.client_analysis_config FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = client_analysis_config.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = client_analysis_config.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
);

CREATE TRIGGER update_client_analysis_config_updated_at
  BEFORE UPDATE ON public.client_analysis_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. analysis_reports
CREATE TABLE public.analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  resumo text,
  alertas_criticos jsonb DEFAULT '[]'::jsonb,
  oportunidades jsonb DEFAULT '[]'::jsonb,
  otimizacoes jsonb DEFAULT '[]'::jsonb,
  tendencia_7d text DEFAULT 'estavel',
  previsao text,
  dados_periodo jsonb,
  modelo_ia text,
  vertical_usado text,
  metrica_primaria_usada text,
  anomalias jsonb DEFAULT '[]'::jsonb,
  campanhas_decadencia jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage analysis reports"
ON public.analysis_reports FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = analysis_reports.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = analysis_reports.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
);

-- 3. automation_rules
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  rule_type text NOT NULL,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  action jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage automation rules"
ON public.automation_rules FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = automation_rules.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = automation_rules.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
);

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. automation_log
CREATE TABLE public.automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  action_taken text,
  result jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage automation logs"
ON public.automation_log FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = automation_log.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = automation_log.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
);
