
-- Table to persist campaign-level data
CREATE TABLE public.daily_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  account_id text NOT NULL,
  platform text NOT NULL,
  date date NOT NULL,
  campaign_name text NOT NULL,
  campaign_status text NOT NULL DEFAULT 'Ativa',
  spend numeric DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions numeric DEFAULT 0,
  leads bigint DEFAULT 0,
  messages bigint DEFAULT 0,
  revenue numeric DEFAULT 0,
  cpa numeric DEFAULT 0,
  source text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint for upsert
CREATE UNIQUE INDEX idx_daily_campaigns_unique ON public.daily_campaigns (client_id, account_id, platform, date, campaign_name);

-- Enable RLS
ALTER TABLE public.daily_campaigns ENABLE ROW LEVEL SECURITY;

-- Clients can view own campaigns
CREATE POLICY "Clients can view own campaigns"
  ON public.daily_campaigns FOR SELECT
  USING (auth.uid() = client_id);

-- Managers can view client campaigns
CREATE POLICY "Managers can view client campaigns"
  ON public.daily_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_manager_links
      WHERE client_manager_links.client_user_id = daily_campaigns.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Service can upsert campaigns
CREATE POLICY "Service can upsert campaigns"
  ON public.daily_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_daily_campaigns_updated_at
  BEFORE UPDATE ON public.daily_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
