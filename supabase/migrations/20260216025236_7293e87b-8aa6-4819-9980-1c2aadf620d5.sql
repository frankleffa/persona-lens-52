
-- Create optimization_tasks table
CREATE TABLE public.optimization_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_manager_links(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'TODO',
  auto_generated boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_optimization_task_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('TODO', 'IN_PROGRESS', 'DONE') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be TODO, IN_PROGRESS, or DONE', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_optimization_task_status
  BEFORE INSERT OR UPDATE ON public.optimization_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_optimization_task_status();

-- Index on client_id
CREATE INDEX idx_optimization_tasks_client_id ON public.optimization_tasks(client_id);

-- Enable RLS
ALTER TABLE public.optimization_tasks ENABLE ROW LEVEL SECURITY;

-- Managers can manage tasks for their own clients
CREATE POLICY "Managers can manage optimization tasks"
  ON public.optimization_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.id = optimization_tasks.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.id = optimization_tasks.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
  );

-- Clients can view their own tasks
CREATE POLICY "Clients can view own optimization tasks"
  ON public.optimization_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.id = optimization_tasks.client_id
        AND client_manager_links.client_user_id = auth.uid()
    )
  );
