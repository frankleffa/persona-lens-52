
-- Add new columns to strategic_campaigns
ALTER TABLE public.strategic_campaigns 
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text;

-- Create campaign_comments table
CREATE TABLE IF NOT EXISTS public.campaign_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;

-- RLS: managers can CRUD comments on campaigns they manage
DROP POLICY IF EXISTS "Managers can manage campaign comments" ON public.campaign_comments;
CREATE POLICY "Managers can manage campaign comments"
  ON public.campaign_comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.strategic_campaigns sc
      JOIN public.client_manager_links cml 
        ON cml.client_user_id = sc.client_id
      WHERE sc.id = campaign_comments.campaign_id
        AND cml.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.strategic_campaigns sc
      JOIN public.client_manager_links cml 
        ON cml.client_user_id = sc.client_id
      WHERE sc.id = campaign_comments.campaign_id
        AND cml.manager_id = auth.uid()
    )
  );

-- Allow managers to read profiles of other team members for avatar display
DROP POLICY IF EXISTS "Managers can view team profiles" ON public.profiles;
CREATE POLICY "Managers can view team profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.client_manager_links WHERE manager_id = auth.uid()
    )
  );
