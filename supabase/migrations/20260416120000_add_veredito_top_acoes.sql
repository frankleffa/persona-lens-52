-- Add executive summary fields to analysis_reports
-- veredito: one-sentence diagnosis shown prominently at top of dashboard
-- top_3_acoes: ranked top actions (max 3) with projected R$ impact
ALTER TABLE public.analysis_reports
  ADD COLUMN IF NOT EXISTS veredito text,
  ADD COLUMN IF NOT EXISTS top_3_acoes jsonb DEFAULT '[]'::jsonb;
