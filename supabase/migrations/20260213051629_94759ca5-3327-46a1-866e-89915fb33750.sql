
-- Table linking client users to their manager
CREATE TABLE public.client_manager_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_user_id)
);

ALTER TABLE public.client_manager_links ENABLE ROW LEVEL SECURITY;

-- Managers can manage their client links
CREATE POLICY "Managers can view own client links"
  ON public.client_manager_links FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can insert client links"
  ON public.client_manager_links FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update client links"
  ON public.client_manager_links FOR UPDATE
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can delete client links"
  ON public.client_manager_links FOR DELETE
  USING (auth.uid() = manager_id);

-- Clients can view their own link
CREATE POLICY "Clients can view own link"
  ON public.client_manager_links FOR SELECT
  USING (auth.uid() = client_user_id);
