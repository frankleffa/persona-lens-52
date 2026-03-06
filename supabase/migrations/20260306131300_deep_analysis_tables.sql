-- ============================================================
-- client_analysis_config: per-client analysis settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_analysis_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL,
  vertical text NOT NULL DEFAULT 'ecommerce',
  primary_metric text NOT NULL DEFAULT 'purchases',
  primary_metric_label text NOT NULL DEFAULT 'Compras',
  cpa_target numeric DEFAULT NULL,
  roas_target numeric DEFAULT NULL,
  monthly_budget numeric DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_analysis_config_client ON public.client_analysis_config(client_id);

CREATE TRIGGER update_client_analysis_config_updated_at
  BEFORE UPDATE ON public.client_analysis_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.client_analysis_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage client analysis config"
  ON public.client_analysis_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = client_analysis_config.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = client_analysis_config.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Clients can view own analysis config"
  ON public.client_analysis_config FOR SELECT
  USING (auth.uid() = client_id);

-- ============================================================
-- analysis_reports: saved AI analysis results
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  score integer,
  resumo text,
  alertas_criticos jsonb DEFAULT '[]'::jsonb,
  oportunidades jsonb DEFAULT '[]'::jsonb,
  otimizacoes jsonb DEFAULT '[]'::jsonb,
  tendencia_7d text,
  previsao text,
  dados_periodo jsonb DEFAULT '{}'::jsonb,
  modelo_ia text,
  vertical_usado text,
  metrica_primaria_usada text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_reports_client ON public.analysis_reports(client_id);
CREATE INDEX idx_analysis_reports_created ON public.analysis_reports(created_at DESC);

ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view client analysis reports"
  ON public.analysis_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = analysis_reports.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Service can insert analysis reports"
  ON public.analysis_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Clients can view own analysis reports"
  ON public.analysis_reports FOR SELECT
  USING (auth.uid() = client_id);
