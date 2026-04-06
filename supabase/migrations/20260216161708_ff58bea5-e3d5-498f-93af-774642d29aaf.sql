ALTER TABLE public.whatsapp_report_settings
ADD COLUMN report_period_type text NOT NULL DEFAULT 'last_7_days';