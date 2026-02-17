
-- Desativar todos os planos existentes
UPDATE public.plans SET is_active = false;

-- Inserir plano SOLO
INSERT INTO public.plans (name, max_clients, max_ad_accounts, price_cents, billing_period, is_active, features)
VALUES (
  'Solo',
  3,
  3,
  9700,
  'monthly',
  true,
  '{"dashboard": true, "kpis": true, "campaign_table": true, "period_selector": true, "backfill_30d": true, "manual_sync": true, "basic_reports": true, "simple_kanban": true}'::jsonb
);

-- Inserir plano GROWTH
INSERT INTO public.plans (name, max_clients, max_ad_accounts, price_cents, billing_period, is_active, features)
VALUES (
  'Growth',
  15,
  15,
  19700,
  'monthly',
  true,
  '{"dashboard": true, "kpis": true, "campaign_table": true, "period_selector": true, "backfill_30d": true, "manual_sync": true, "basic_reports": true, "simple_kanban": true, "agency_control_center": true, "health_score": true, "auto_status": true, "granular_permissions": true, "advanced_reports": true, "custom_templates": true, "balance_alerts": true, "optimization_tasks": true, "whatsapp_auto_reports": true}'::jsonb
);
