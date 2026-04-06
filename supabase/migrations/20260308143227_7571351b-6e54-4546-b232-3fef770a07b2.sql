-- Enable RLS on safe_oauth_connections view via security_invoker
-- Views inherit RLS from underlying tables when security_invoker is set
-- The underlying oauth_connections table already has proper RLS policies
-- So we just need to ensure the view uses the caller's context

-- Since safe_oauth_connections is a VIEW and PostgreSQL views with security_invoker=true
-- will apply the underlying table's RLS policies, we set that:
ALTER VIEW public.safe_oauth_connections SET (security_invoker = true);