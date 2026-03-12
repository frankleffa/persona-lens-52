-- Manager's TikTok Ads advertiser accounts
CREATE TABLE IF NOT EXISTS public.manager_tiktok_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  advertiser_id TEXT NOT NULL,
  account_name TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manager_id, advertiser_id)
);

-- Client's assigned TikTok ad accounts
CREATE TABLE IF NOT EXISTS public.client_tiktok_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  advertiser_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_user_id, advertiser_id)
);

-- RLS policies
ALTER TABLE public.manager_tiktok_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tiktok_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage their own TikTok accounts"
  ON public.manager_tiktok_ad_accounts
  FOR ALL
  USING (manager_id = auth.uid());

CREATE POLICY "Clients can view their assigned TikTok accounts"
  ON public.client_tiktok_ad_accounts
  FOR SELECT
  USING (client_user_id = auth.uid());

CREATE POLICY "Service role full access to manager_tiktok_ad_accounts"
  ON public.manager_tiktok_ad_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to client_tiktok_ad_accounts"
  ON public.client_tiktok_ad_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);
