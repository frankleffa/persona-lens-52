-- AI-generated creative copy variants suggested as replacements for fatigued ads
-- or as general refreshes based on top-performing reference ads.
CREATE TABLE IF NOT EXISTS public.creative_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  generated_by uuid,
  replaces_ad_name text,
  hook text NOT NULL,
  headline text NOT NULL,
  primary_text text NOT NULL,
  cta text,
  angulo text,
  por_que_funciona text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'used', 'discarded')),
  reference_ads jsonb DEFAULT '[]'::jsonb,
  context_note text,
  modelo_ia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_suggestions_client
  ON public.creative_suggestions(client_id);
CREATE INDEX IF NOT EXISTS idx_creative_suggestions_status
  ON public.creative_suggestions(client_id, status, created_at DESC);

ALTER TABLE public.creative_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage creative suggestions"
  ON public.creative_suggestions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = creative_suggestions.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = creative_suggestions.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Clients can view own creative suggestions"
  ON public.creative_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

CREATE TRIGGER update_creative_suggestions_updated_at
  BEFORE UPDATE ON public.creative_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
