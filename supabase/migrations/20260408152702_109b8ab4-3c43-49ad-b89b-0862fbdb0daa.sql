
-- Create storage bucket for client reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-reports', 'client-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Managers can read reports for their clients
CREATE POLICY "Managers can read client reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-reports'
  AND EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.manager_id = auth.uid()
      AND client_manager_links.client_user_id::text = (storage.foldername(name))[1]
  )
);

-- RLS: Service role / edge functions can upload reports
CREATE POLICY "Service can upload client reports"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-reports'
);

CREATE POLICY "Service can update client reports"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'client-reports'
);

-- Enable pg_cron and pg_net for scheduled reports
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
