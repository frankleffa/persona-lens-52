
-- Create strategic_campaigns table
CREATE TABLE public.strategic_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  campaign_name text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'Meta Ads',
  objective text NOT NULL DEFAULT 'Conversão',
  budget numeric NOT NULL DEFAULT 0,
  start_date date,
  status text NOT NULL DEFAULT 'PLANEJAMENTO',
  creatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  copy jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  learning text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategic_campaigns ENABLE ROW LEVEL SECURITY;

-- Managers can manage campaigns for their linked clients
CREATE POLICY "Managers can manage strategic campaigns"
  ON public.strategic_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id::text = strategic_campaigns.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id::text = strategic_campaigns.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
  );
