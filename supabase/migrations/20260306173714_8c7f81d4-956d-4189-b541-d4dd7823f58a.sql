
CREATE TABLE IF NOT EXISTS public.campaign_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  action_type text NOT NULL,
  object_type text,
  external_object_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaign_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_read_campaign_log"
ON public.campaign_actions_log FOR SELECT
TO authenticated
USING (
  manager_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "managers_insert_campaign_log"
ON public.campaign_actions_log FOR INSERT
TO authenticated
WITH CHECK (
  manager_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
