
CREATE TABLE public.whatsapp_pending_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  accounts JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

ALTER TABLE public.whatsapp_pending_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending connections"
  ON public.whatsapp_pending_connections FOR SELECT
  USING (agency_id = auth.uid());

CREATE POLICY "Service role full access pending connections"
  ON public.whatsapp_pending_connections FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_whatsapp_pending_agency ON public.whatsapp_pending_connections(agency_id);
