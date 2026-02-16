
CREATE TABLE public.whatsapp_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  business_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'connected',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on agency_id for upsert
ALTER TABLE public.whatsapp_connections ADD CONSTRAINT whatsapp_connections_agency_id_key UNIQUE (agency_id);

-- Enable RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Managers can read their own connection
CREATE POLICY "Users can view their own whatsapp connection"
  ON public.whatsapp_connections FOR SELECT
  USING (auth.uid() = agency_id);

-- Only service role inserts/updates (via edge function), no direct client access
CREATE POLICY "Service role manages whatsapp connections"
  ON public.whatsapp_connections FOR ALL
  USING (auth.uid() = agency_id)
  WITH CHECK (auth.uid() = agency_id);

-- Auto-update updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
