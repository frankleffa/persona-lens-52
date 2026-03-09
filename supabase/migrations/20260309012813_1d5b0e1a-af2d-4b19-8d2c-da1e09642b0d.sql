-- Add FTD event configuration columns to client_analysis_config
-- These allow per-client mapping of which Meta/Google conversion events correspond to FTD
ALTER TABLE public.client_analysis_config
ADD COLUMN ftd_event_name text DEFAULT NULL,
ADD COLUMN ftd_google_conversion_name text DEFAULT NULL;

-- ftd_event_name: Meta Ads action_type for FTD (e.g., "offsite_conversion.custom.123456789")
-- ftd_google_conversion_name: Google Ads conversion action name for FTD (e.g., "FTD" or "First Deposit")
COMMENT ON COLUMN public.client_analysis_config.ftd_event_name IS 'Meta Ads action_type that maps to FTD (custom conversion). If NULL, FTD stays 0 (not same as purchases).';
COMMENT ON COLUMN public.client_analysis_config.ftd_google_conversion_name IS 'Google Ads conversion action name for FTD. If NULL, FTD stays 0.';