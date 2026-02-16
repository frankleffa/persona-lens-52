
-- Create whatsapp_report_settings table
CREATE TABLE public.whatsapp_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{"investment":true,"revenue":true,"roas":true,"cpa":true,"clicks":true,"impressions":true,"ctr":true,"conversions":true}'::jsonb,
  include_comparison BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT,
  send_time TIME,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_whatsapp_report_settings_agency ON public.whatsapp_report_settings (agency_id);
CREATE INDEX idx_whatsapp_report_settings_client ON public.whatsapp_report_settings (client_id);

-- Unique constraint for upsert
CREATE UNIQUE INDEX idx_whatsapp_report_settings_unique ON public.whatsapp_report_settings (agency_id, client_id);

-- Enable RLS
ALTER TABLE public.whatsapp_report_settings ENABLE ROW LEVEL SECURITY;

-- Managers (agency) can manage their own settings
CREATE POLICY "Managers can manage own whatsapp report settings"
ON public.whatsapp_report_settings
FOR ALL
USING (auth.uid() = agency_id)
WITH CHECK (auth.uid() = agency_id);

-- Clients can view their own settings
CREATE POLICY "Clients can view own whatsapp report settings"
ON public.whatsapp_report_settings
FOR SELECT
USING (auth.uid() = client_id);
