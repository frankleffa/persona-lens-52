CREATE TABLE public.creative_suggestions (
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
  status text NOT NULL DEFAULT 'pending',
  reference_ads jsonb NOT NULL DEFAULT '[]'::jsonb,
  context_note text,
  modelo_ia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creative_suggestions_client_created
  ON public.creative_suggestions (client_id, created_at DESC);

ALTER TABLE public.creative_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view client creative suggestions"
ON public.creative_suggestions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = creative_suggestions.client_id
      AND client_manager_links.manager_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = creative_suggestions.client_id
);

CREATE POLICY "Managers can insert client creative suggestions"
ON public.creative_suggestions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = creative_suggestions.client_id
      AND client_manager_links.manager_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can update client creative suggestions"
ON public.creative_suggestions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = creative_suggestions.client_id
      AND client_manager_links.manager_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = creative_suggestions.client_id
      AND client_manager_links.manager_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can delete client creative suggestions"
ON public.creative_suggestions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = creative_suggestions.client_id
      AND client_manager_links.manager_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER trg_creative_suggestions_updated_at
BEFORE UPDATE ON public.creative_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();