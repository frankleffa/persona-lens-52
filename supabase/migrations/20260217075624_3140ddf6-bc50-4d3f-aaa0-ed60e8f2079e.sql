
-- Add client_id column to whatsapp_connections
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES auth.users(id);

-- Drop the constraint (not just index)
ALTER TABLE public.whatsapp_connections DROP CONSTRAINT IF EXISTS whatsapp_connections_agency_id_key;

-- Create unique index allowing multiple connections per agency (one per client)
CREATE UNIQUE INDEX whatsapp_connections_agency_client 
  ON public.whatsapp_connections(agency_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'));
