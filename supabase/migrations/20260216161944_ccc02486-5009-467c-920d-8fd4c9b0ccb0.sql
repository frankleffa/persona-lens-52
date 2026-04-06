-- Create logs table for tracking sent WhatsApp reports
CREATE TABLE public.whatsapp_report_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  report_period_type text
);

-- Enable RLS
ALTER TABLE public.whatsapp_report_logs ENABLE ROW LEVEL SECURITY;

-- Managers can view/insert logs for their own agency
CREATE POLICY "Managers can manage own report logs"
ON public.whatsapp_report_logs
FOR ALL
USING (auth.uid() = agency_id)
WITH CHECK (auth.uid() = agency_id);

-- Index for checking if already sent today
CREATE INDEX idx_whatsapp_report_logs_daily
ON public.whatsapp_report_logs (agency_id, client_id, sent_at);