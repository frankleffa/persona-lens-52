
-- Remove the restrictive FK on client_id (not all clients have auth.users entries)
ALTER TABLE public.whatsapp_connections DROP CONSTRAINT IF EXISTS whatsapp_connections_client_id_fkey;

-- Add a unique constraint on (agency_id, client_id) for proper upsert handling
-- Use NULLS NOT DISTINCT so (agency_id, NULL) is also unique
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_connections_agency_client 
ON public.whatsapp_connections (agency_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'));
