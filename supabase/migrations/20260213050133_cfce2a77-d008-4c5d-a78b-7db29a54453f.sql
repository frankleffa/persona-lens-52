
-- Google Ads accounts table
CREATE TABLE public.manager_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  account_name TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(manager_id, customer_id)
);

ALTER TABLE public.manager_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own ad accounts"
  ON public.manager_ad_accounts FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can insert own ad accounts"
  ON public.manager_ad_accounts FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update own ad accounts"
  ON public.manager_ad_accounts FOR UPDATE
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can delete own ad accounts"
  ON public.manager_ad_accounts FOR DELETE
  USING (auth.uid() = manager_id);

CREATE TRIGGER update_manager_ad_accounts_updated_at
  BEFORE UPDATE ON public.manager_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Meta Ads accounts table
CREATE TABLE public.manager_meta_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL,
  ad_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(manager_id, ad_account_id)
);

ALTER TABLE public.manager_meta_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own meta ad accounts"
  ON public.manager_meta_ad_accounts FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can insert own meta ad accounts"
  ON public.manager_meta_ad_accounts FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update own meta ad accounts"
  ON public.manager_meta_ad_accounts FOR UPDATE
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can delete own meta ad accounts"
  ON public.manager_meta_ad_accounts FOR DELETE
  USING (auth.uid() = manager_id);

CREATE TRIGGER update_manager_meta_ad_accounts_updated_at
  BEFORE UPDATE ON public.manager_meta_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
