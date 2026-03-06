-- ============================================================
-- automation_rules: per-client automation rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('pause_high_cpa', 'scale_good_performer', 'pause_no_conversion', 'alert_only')),
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- config examples:
  --   pause_high_cpa:      { "cpa_limit": 150, "min_spend": 100, "lookback_days": 7 }
  --   scale_good_performer: { "roas_min": 2.0, "budget_increase_pct": 20, "max_daily_budget": 500 }
  --   pause_no_conversion:  { "min_spend": 200, "min_days": 3 }
  --   alert_only:           { "metric": "cpa", "threshold": 100, "direction": "above" }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_rules_client ON public.automation_rules(client_id);
CREATE INDEX idx_automation_rules_active ON public.automation_rules(is_active) WHERE is_active = true;

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage automation rules"
  ON public.automation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = automation_rules.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = automation_rules.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Clients can view own automation rules"
  ON public.automation_rules FOR SELECT
  USING (auth.uid() = client_id);

-- ============================================================
-- automation_log: log of all auto-optimization actions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  action text NOT NULL,
  campaign_name text,
  external_campaign_id text,
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'skipped')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_log_client ON public.automation_log(client_id);
CREATE INDEX idx_automation_log_created ON public.automation_log(created_at DESC);
CREATE INDEX idx_automation_log_rule ON public.automation_log(rule_id);

ALTER TABLE public.automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view automation logs"
  ON public.automation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = automation_log.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Service can insert automation logs"
  ON public.automation_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Clients can view own automation logs"
  ON public.automation_log FOR SELECT
  USING (auth.uid() = client_id);
