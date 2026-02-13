
DROP VIEW IF EXISTS public.safe_oauth_connections;

CREATE VIEW public.safe_oauth_connections
WITH (security_invoker = on) AS
SELECT id, manager_id, provider, account_data, connected, created_at, updated_at
FROM public.oauth_connections;
