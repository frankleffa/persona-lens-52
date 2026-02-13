
CREATE TABLE public.funnel_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL,
  client_user_id UUID,
  name TEXT NOT NULL DEFAULT 'Funil Principal',
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view their own funnel configs"
ON public.funnel_configurations FOR SELECT
USING (auth.uid() = manager_id);

CREATE POLICY "Managers can create funnel configs"
ON public.funnel_configurations FOR INSERT
WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update their own funnel configs"
ON public.funnel_configurations FOR UPDATE
USING (auth.uid() = manager_id);

CREATE POLICY "Managers can delete their own funnel configs"
ON public.funnel_configurations FOR DELETE
USING (auth.uid() = manager_id);

CREATE TRIGGER update_funnel_configurations_updated_at
BEFORE UPDATE ON public.funnel_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
