
-- Fix security definer views by setting security_invoker = true
ALTER VIEW public.vw_meta_ltv SET (security_invoker = true);
ALTER VIEW public.vw_meta_campaign_ltv SET (security_invoker = true);
ALTER VIEW public.vw_meta_cohorts SET (security_invoker = true);
ALTER VIEW public.vw_meta_summary SET (security_invoker = true);
