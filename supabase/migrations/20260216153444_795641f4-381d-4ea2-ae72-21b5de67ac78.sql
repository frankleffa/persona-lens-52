
-- Create table for balance alerts
CREATE TABLE public.account_balance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL,
  ad_account_id TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_agency_ad_account UNIQUE (agency_id, ad_account_id)
);

-- Indexes
CREATE INDEX idx_balance_alerts_agency ON public.account_balance_alerts (agency_id);
CREATE INDEX idx_balance_alerts_client ON public.account_balance_alerts (client_id);
CREATE INDEX idx_balance_alerts_ad_account ON public.account_balance_alerts (ad_account_id);

-- Enable RLS
ALTER TABLE public.account_balance_alerts ENABLE ROW LEVEL SECURITY;

-- Managers can manage alerts for their agency
CREATE POLICY "Managers can manage own balance alerts"
ON public.account_balance_alerts
FOR ALL
USING (auth.uid() = agency_id)
WITH CHECK (auth.uid() = agency_id);

-- Clients can view their own alerts
CREATE POLICY "Clients can view own balance alerts"
ON public.account_balance_alerts
FOR SELECT
USING (auth.uid() = client_id);
