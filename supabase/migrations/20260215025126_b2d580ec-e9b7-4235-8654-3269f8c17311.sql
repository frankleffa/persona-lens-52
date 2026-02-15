
-- 1️⃣ report_templates (global, sem vínculo a cliente)
CREATE TABLE public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  layout_type text NOT NULL,
  default_sections jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_templates_layout_type ON public.report_templates (layout_type);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler templates
CREATE POLICY "Authenticated users can view templates"
  ON public.report_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Apenas admins podem gerenciar templates
CREATE POLICY "Admins can manage templates"
  ON public.report_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Inserir templates iniciais
INSERT INTO public.report_templates (name, description, layout_type, default_sections) VALUES
  ('Executivo', 'Relatório executivo com visão resumida', 'executivo', '{"show_summary": true, "show_campaign_table": false, "show_comparison": true, "show_top_campaigns": true, "show_notes": true}'::jsonb),
  ('Crescimento', 'Relatório focado em crescimento e campanhas', 'crescimento', '{"show_summary": true, "show_campaign_table": true, "show_comparison": true, "show_top_campaigns": true, "show_notes": true}'::jsonb),
  ('Estratégico', 'Relatório estratégico completo com recomendações', 'estrategico', '{"show_summary": true, "show_campaign_table": true, "show_comparison": true, "show_top_campaigns": true, "show_notes": true, "show_recommendations": true}'::jsonb);

-- 2️⃣ client_report_settings
CREATE TABLE public.client_report_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  default_template_id uuid NOT NULL REFERENCES public.report_templates(id),
  auto_send_enabled boolean NOT NULL DEFAULT false,
  frequency text,
  send_day integer,
  send_email text,
  default_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

CREATE INDEX idx_client_report_settings_client_id ON public.client_report_settings (client_id);

ALTER TABLE public.client_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own report settings"
  ON public.client_report_settings FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Managers can manage client report settings"
  ON public.client_report_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = client_report_settings.client_id
      AND client_manager_links.manager_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = client_report_settings.client_id
      AND client_manager_links.manager_id = auth.uid()
  ));

-- 3️⃣ report_instances
CREATE TABLE public.report_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  template_id uuid NOT NULL REFERENCES public.report_templates(id),
  sections_snapshot jsonb NOT NULL,
  notes text,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  sent boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_report_instances_client_period ON public.report_instances (client_id, period_start, period_end);
CREATE INDEX idx_report_instances_generated_at ON public.report_instances (generated_at);

ALTER TABLE public.report_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own report instances"
  ON public.report_instances FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Managers can manage client report instances"
  ON public.report_instances FOR ALL
  USING (EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = report_instances.client_id
      AND client_manager_links.manager_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = report_instances.client_id
      AND client_manager_links.manager_id = auth.uid()
  ));
