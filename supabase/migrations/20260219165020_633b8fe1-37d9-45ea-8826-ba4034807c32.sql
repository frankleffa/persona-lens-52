
CREATE TABLE IF NOT EXISTS public.manager_ga4_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  property_id text NOT NULL,
  property_name text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, property_id)
);

ALTER TABLE public.manager_ga4_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own ga4 properties"
  ON public.manager_ga4_properties
  FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "Managers can insert own ga4 properties"
  ON public.manager_ga4_properties
  FOR INSERT
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can update own ga4 properties"
  ON public.manager_ga4_properties
  FOR UPDATE
  USING (manager_id = auth.uid());

CREATE POLICY "Managers can delete own ga4 properties"
  ON public.manager_ga4_properties
  FOR DELETE
  USING (manager_id = auth.uid());

CREATE TRIGGER update_manager_ga4_properties_updated_at
  BEFORE UPDATE ON public.manager_ga4_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
