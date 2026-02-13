
-- Map client users to specific Google Ads accounts they can see
CREATE TABLE public.client_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_user_id, customer_id)
);

ALTER TABLE public.client_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage via link" ON public.client_ad_accounts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = client_ad_accounts.client_user_id
    AND client_manager_links.manager_id = auth.uid()
  ));

CREATE POLICY "Clients can view own" ON public.client_ad_accounts FOR SELECT
  USING (auth.uid() = client_user_id);

-- Map client users to specific Meta Ads accounts
CREATE TABLE public.client_meta_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_user_id, ad_account_id)
);

ALTER TABLE public.client_meta_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage via link" ON public.client_meta_ad_accounts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = client_meta_ad_accounts.client_user_id
    AND client_manager_links.manager_id = auth.uid()
  ));

CREATE POLICY "Clients can view own" ON public.client_meta_ad_accounts FOR SELECT
  USING (auth.uid() = client_user_id);

-- Map client users to specific GA4 properties
CREATE TABLE public.client_ga4_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_user_id, property_id)
);

ALTER TABLE public.client_ga4_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage via link" ON public.client_ga4_properties FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = client_ga4_properties.client_user_id
    AND client_manager_links.manager_id = auth.uid()
  ));

CREATE POLICY "Clients can view own" ON public.client_ga4_properties FOR SELECT
  USING (auth.uid() = client_user_id);
