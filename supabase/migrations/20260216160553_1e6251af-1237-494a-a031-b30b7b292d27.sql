
-- Add phone_number and weekday columns to whatsapp_report_settings
ALTER TABLE public.whatsapp_report_settings
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS weekday smallint,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
