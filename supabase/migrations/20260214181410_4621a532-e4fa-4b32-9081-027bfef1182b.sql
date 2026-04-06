
CREATE TABLE public.client_metric_visibility (
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_user_id, metric_key)
);

ALTER TABLE public.client_metric_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage client metrics"
ON public.client_metric_visibility
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = client_metric_visibility.client_user_id
    AND client_manager_links.manager_id = auth.uid()
  )
);

CREATE POLICY "Clients can view own metrics"
ON public.client_metric_visibility
FOR SELECT
USING (auth.uid() = client_user_id);
